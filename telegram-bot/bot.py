"""
AI Developer Bot v5 — Sıfırdan Temiz Mimari
=============================================
Telegram üzerinden GitHub projelerini yöneten, Claude AI ile kod yazan,
soru cevaplayan, test eden, push eden otomasyon botu.

Kurulum: /opt/ai-developer-bot/
Projeler: /opt/ altında (deprem-appp, eye-of-tr-v2, astroloji, vs.)

Komutlar:
  /deprem [görev]     — Deprem App üzerinde çalış
  /eye [görev]        — Eye of TR üzerinde çalış
  /astro [görev]      — Astroloji üzerinde çalış
  /yeni ad açıklama   — Sıfırdan yeni proje oluştur
  /chat mesaj          — Serbest sohbet (kod yazmadan)
  /projects            — Proje listesi
  /status              — Sistem durumu
  /health              — Health check
  /deploy proje        — Manuel deploy
  /help                — Kullanım kılavuzu
"""

import os
import re
import sys
import json
import signal
import logging
import asyncio
import subprocess
import time as _time
from typing import List, Optional, Dict
from pathlib import Path
from datetime import datetime

from telegram import Update, BotCommand
from telegram.ext import (
    ApplicationBuilder,
    ContextTypes,
    MessageHandler,
    CommandHandler,
    filters,
)
from anthropic import Anthropic
from dotenv import load_dotenv

# ═══════════════════════════════════════════════
# CONFIG
# ═══════════════════════════════════════════════

BOT_DIR = Path(__file__).resolve().parent
load_dotenv(dotenv_path=BOT_DIR / ".env")

TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "")
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")
TELEGRAM_CHAT_ID = os.getenv("TELEGRAM_CHAT_ID", "")
GITHUB_USER = os.getenv("GITHUB_USERNAME", "bendedo13")
GITHUB_TOKEN = os.getenv("GITHUB_TOKEN", "")
VPS_HOST = os.getenv("VPS_HOST", "46.4.123.77")
VPS_USER = os.getenv("VPS_USER", "root")

ALLOWED_IDS: set = set()
for raw in (os.getenv("ALLOWED_CHAT_IDS", ""), TELEGRAM_CHAT_ID):
    for x in raw.split(","):
        x = x.strip()
        if x.isdigit():
            ALLOWED_IDS.add(int(x))

# Logging
logging.basicConfig(format="%(asctime)s [%(levelname)s] %(message)s", level=logging.INFO)
log = logging.getLogger("bot")

# Claude
claude: Optional[Anthropic] = None
if ANTHROPIC_API_KEY:
    claude = Anthropic(api_key=ANTHROPIC_API_KEY)

# Modeller
M_STRONG = ["claude-sonnet-4-6", "claude-haiku-4-5-20251001"]
M_FAST = ["claude-haiku-4-5-20251001", "claude-sonnet-4-6"]

# ═══════════════════════════════════════════════
# PROJE REGISTRY
# ═══════════════════════════════════════════════

PROJECTS: Dict[str, dict] = {
    "depremapp": {
        "path": "/opt/deprem-appp",
        "repo": f"{GITHUB_USER}/deprem-appp",
        "branch": "main",
        "cmd": "deprem",
        "desc": "Deprem App — Mobil + Backend + Web",
        "ext": [".py", ".ts", ".tsx", ".js", ".json"],
        "test": ["docker compose -f deploy/docker-compose.prod.yml ps"],
        "deploy": "cd deploy && docker compose -f docker-compose.prod.yml up -d --build",
        "health": "http://localhost:8001/health",
    },
    "eyeoftrv2": {
        "path": "/opt/eye-of-tr-v2",
        "repo": f"{GITHUB_USER}/eye-of-tr-v2",
        "branch": "main",
        "cmd": "eye",
        "desc": "Eye of TR — Web Uygulaması",
        "ext": [".ts", ".tsx", ".js", ".jsx", ".css", ".html", ".json"],
        "test": ["npm run build"],
        "deploy": "",
        "health": "http://localhost:3000",
    },
    "astroloji": {
        "path": "/opt/astroloji",
        "repo": f"{GITHUB_USER}/astroloji",
        "branch": "main",
        "cmd": "astro",
        "desc": "Astroloji — Web Uygulaması",
        "ext": [".ts", ".tsx", ".js", ".jsx", ".css", ".html", ".json"],
        "test": ["npm run build"],
        "deploy": "",
        "health": "http://localhost:3002",
    },
}

ALIASES = {
    "deprem": "depremapp", "depremappp": "depremapp",
    "eye": "eyeoftrv2", "eyeoftr": "eyeoftrv2",
    "astro": "astroloji",
}

# Dinamik projeler
DYN_FILE = BOT_DIR / "projects.json"


def load_dynamic():
    if DYN_FILE.exists():
        try:
            for k, v in json.loads(DYN_FILE.read_text()).items():
                PROJECTS[k] = v
                ALIASES[v.get("cmd", k)] = k
        except Exception as e:
            log.error(f"Dinamik proje yükleme hatası: {e}")


def save_dynamic(name: str, cfg: dict):
    data = {}
    if DYN_FILE.exists():
        try:
            data = json.loads(DYN_FILE.read_text())
        except Exception:
            pass
    data[name] = cfg
    DYN_FILE.write_text(json.dumps(data, indent=2, ensure_ascii=False))


load_dynamic()


# ═══════════════════════════════════════════════
# UTILS
# ═══════════════════════════════════════════════

def find_project(name: str) -> Optional[str]:
    n = name.strip().lower().replace(" ", "").replace("-", "")
    if n in PROJECTS:
        return n
    for a, p in ALIASES.items():
        if n == a.replace("-", ""):
            return p
    return None


def authorized(cid: int) -> bool:
    return not ALLOWED_IDS or cid in ALLOWED_IDS


async def sh(cmd: str, cwd: str = "/tmp", timeout: int = 120) -> tuple:
    try:
        p = await asyncio.create_subprocess_shell(
            cmd, cwd=cwd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        out, err = await asyncio.wait_for(p.communicate(), timeout=timeout)
        return out.decode().strip(), err.decode().strip(), p.returncode
    except asyncio.TimeoutError:
        return "", f"Timeout ({timeout}s)", 1
    except Exception as e:
        return "", str(e), 1


async def send(bot, cid: int, text: str):
    """Mesaj gönder — 4000 char limit, markdown hatası olursa düz gönder."""
    for chunk in _split(text, 4000):
        try:
            await bot.send_message(chat_id=cid, text=chunk)
        except Exception as e:
            log.error(f"Mesaj hatası: {e}")
        await asyncio.sleep(0.3)


def _split(text: str, n: int) -> list:
    if len(text) <= n:
        return [text]
    parts = []
    while text:
        if len(text) <= n:
            parts.append(text)
            break
        i = text.rfind("\n", 0, n)
        if i == -1:
            i = n
        parts.append(text[:i])
        text = text[i:].lstrip("\n")
    return parts


SKIP = {"node_modules", ".git", "__pycache__", "dist", "build", ".expo", ".next", "coverage", ".cache", "android", "ios", "venv"}
SKIP_FILES = {"package-lock.json", "yarn.lock", "pnpm-lock.yaml"}


def read_files(root: str, exts: list) -> str:
    """Proje dosyalarını oku."""
    parts = []
    total = 0
    for ext in exts:
        for fp in sorted(Path(root).rglob(f"*{ext}")):
            if any(s in fp.parts for s in SKIP) or fp.name in SKIP_FILES:
                continue
            try:
                c = fp.read_text(encoding="utf-8", errors="ignore")
                if len(c) > 30000:
                    c = c[:30000] + "\n...(kırpıldı)"
                parts.append(f"--- {fp.relative_to(root)} ---\n{c}\n")
                total += len(c)
                if total > 200000:
                    return "\n".join(parts)
            except Exception:
                pass
    return "\n".join(parts)


# ═══════════════════════════════════════════════
# CLAUDE AI
# ═══════════════════════════════════════════════

async def ai_call(system: str, prompt: str, models: list) -> tuple:
    """Claude API çağrısı — fallback ile."""
    if not claude:
        raise RuntimeError("ANTHROPIC_API_KEY eksik!")
    last_err = None
    for m in models:
        try:
            log.info(f"Model: {m}")
            r = claude.messages.create(
                model=m, max_tokens=64000, temperature=0,
                system=system, messages=[{"role": "user", "content": prompt}],
            )
            return r.content[0].text, m
        except Exception as e:
            last_err = e
            log.warning(f"{m} hata: {e}")
    raise RuntimeError(f"Tüm modeller başarısız: {last_err}")


async def ai_code(task: str, files: str, project: str) -> tuple:
    """Kod yazma görevi."""
    sys_p = """Sen uzman bir yazılım geliştiricisin. Verilen proje dosyalarını analiz edip görevi yap.

KURALLAR:
1. Sadece gerekli değişiklikleri yap.
2. Her dosyayı şu formatta ver:

<file path="relative/path/file.ext">
dosya içeriği
</file>

<explanation>
- Açıklama (Türkçe)
</explanation>

3. HER ZAMAN en az 1 <file> bloğu döndür.
4. Güvenli, test edilebilir kod yaz."""

    user_p = f"PROJE: {project}\nGÖREV: {task}\n\nDOSYALAR:\n{files[:180000]}\n\nKod değişikliklerini <file> formatında üret."
    models = M_STRONG if len(files) > 50000 else M_FAST
    return await ai_call(sys_p, user_p, models)


async def ai_chat(message: str, files: str = "", project: str = "") -> tuple:
    """Sohbet / soru-cevap."""
    sys_p = """Sen yardımcı bir Türk yazılım danışmanısın.
Türkçe, kısa ve öz cevap ver. Telegram mesajı olacak (max 3000 karakter).
Maddeler halinde, emoji kullan (az)."""

    ctx = f"\nPROJE: {project}\nDOSYALAR:\n{files[:150000]}" if files else ""
    user_p = f"{message}{ctx}"
    return await ai_call(sys_p, user_p, M_FAST)


async def ai_newproject(name: str, desc: str) -> tuple:
    """Yeni proje oluştur."""
    # Teknolojiyi tahmin et
    dl = desc.lower()
    if any(k in dl for k in ("react native", "mobil", "mobile", "expo")):
        tech = "React Native (Expo) + TypeScript"
    elif any(k in dl for k in ("next", "nextjs")):
        tech = "Next.js + TypeScript + Tailwind"
    elif any(k in dl for k in ("python", "fastapi", "django", "flask")):
        tech = "Python + FastAPI"
    else:
        tech = "React + TypeScript + Vite + Tailwind"

    sys_p = """Sen yazılım mimarısın. Sıfırdan proje oluştur.
Her dosyayı <file path="...">...</file> formatında ver.
package.json, config, ana komponentler, README.md, .gitignore dahil et.
Türkçe yorumlar ekle."""

    user_p = f"PROJE: {name}\nAÇIKLAMA: {desc}\nTEKNOLOJİ: {tech}\n\nTam proje yapısı oluştur."
    return await ai_call(sys_p, user_p, M_STRONG)


# ═══════════════════════════════════════════════
# FILE OPS
# ═══════════════════════════════════════════════

def write_files(response: str, root: str) -> list:
    """Claude cevabından dosyaları diske yaz."""
    changes = []
    for m in re.finditer(r'<file path="(.*?)">\s*(.*?)\s*</file>', response, re.DOTALL):
        rel = m.group(1).strip()
        content = m.group(2)
        fp = Path(root) / rel
        try:
            fp.resolve().relative_to(Path(root).resolve())
        except ValueError:
            continue
        fp.parent.mkdir(parents=True, exist_ok=True)
        fp.write_text(content, encoding="utf-8")
        changes.append(rel)
    return changes


# ═══════════════════════════════════════════════
# GIT
# ═══════════════════════════════════════════════

async def git_ensure(cfg: dict, bot, cid: int) -> bool:
    """Proje yoksa clone et, varsa pull."""
    p = cfg["path"]
    if Path(p).exists():
        await sh(f"git pull origin {cfg['branch']}", p, 60)
        return True
    repo = cfg["repo"]
    await send(bot, cid, f"📥 Clone ediliyor: {repo}")
    _, err, code = await sh(f"git clone https://github.com/{repo}.git {p}", "/opt", 120)
    if code != 0:
        await send(bot, cid, f"❌ Clone hatası: {err[:300]}")
        return False
    return True


async def git_push(root: str, msg: str, branch: str) -> dict:
    """Add + commit + push. Return {hash, branch, pushed, error}."""
    r = {"hash": "", "branch": branch, "pushed": False, "error": ""}

    # Aktif branch'i al
    out, _, _ = await sh("git branch --show-current", root)
    if out.strip():
        r["branch"] = out.strip()

    await sh("git add -A", root)
    safe = msg[:80].replace('"', "'").replace('`', "'")
    ts = datetime.now().strftime("%Y-%m-%d %H:%M")
    o, e, c = await sh(f'git commit -m "AI Bot: {safe} [{ts}]"', root)
    if c != 0:
        r["error"] = "nothing_to_commit" if "nothing to commit" in o + e else f"commit: {e[:200]}"
        return r

    o, _, _ = await sh("git rev-parse HEAD", root)
    r["hash"] = o.strip()

    for i in range(4):
        _, e, c = await sh(f"git push origin {r['branch']}", root, 60)
        if c == 0:
            r["pushed"] = True
            break
        await asyncio.sleep(2 ** (i + 1))

    if not r["pushed"]:
        r["error"] = f"push: {e[:200]}"
    return r


async def git_init_local(root: str, name: str) -> dict:
    """Yeni proje: sadece VPS'te lokal git init — GitHub'a push ETMEZ."""
    r = {"hash": "", "branch": "main", "pushed": False, "error": "", "url": ""}
    await sh("git init", root)
    await sh('git config user.name "AI Bot"', root)
    await sh('git config user.email "bot@local"', root)
    await sh("git add -A", root)
    ts = datetime.now().strftime("%Y-%m-%d %H:%M")
    _, e, c = await sh(f'git commit -m "Initial commit [{ts}]"', root)
    if c != 0:
        r["error"] = f"commit: {e[:200]}"
        return r

    o, _, _ = await sh("git rev-parse HEAD", root)
    r["hash"] = o.strip()
    r["url"] = f"file://{root}"
    r["pushed"] = True  # Lokal commit başarılı = OK
    return r


# ═══════════════════════════════════════════════
# TEST & HEALTH
# ═══════════════════════════════════════════════

async def run_tests(root: str, cmds: list) -> list:
    results = []
    for cmd in cmds:
        o, e, c = await sh(cmd, root, 180)
        results.append({"name": cmd[:60], "ok": c == 0, "out": (o or e)[:300]})
    return results


async def health(url: str) -> dict:
    o, _, _ = await sh(f'curl -sf -o /dev/null -w "%{{http_code}}" --connect-timeout 10 {url}', "/tmp", 20)
    code = o.strip()
    return {"name": f"Health {url}", "ok": code in ("200", "301", "302"), "out": f"HTTP {code}"}


# ═══════════════════════════════════════════════
# RAPOR
# ═══════════════════════════════════════════════

def report(task: str, proj: str, model: str, files: list, tests: list,
           hp: Optional[dict], git: dict, secs: float, errs: list, mode: str = "code") -> str:
    m, s = int(secs // 60), int(secs % 60)
    ok = not errs and (mode != "code" or git.get("pushed", False))
    icon = "✅" if ok else "⚠️"
    labels = {"code": "KOD", "chat": "SOHBET", "new": "YENİ PROJE"}

    t = f"🤖 {labels.get(mode, 'GÖREV')} RAPORU\n{'━' * 25}\n"
    t += f"📌 {task[:200]}\n"
    t += f"📂 {proj} | ⏱️ {m}dk {s}s | 🧠 {model}\n"
    t += f"🎯 {icon} {'BASARILI' if ok else 'HATALAR VAR'}\n\n"

    if files:
        t += f"📂 Dosyalar ({len(files)}):\n"
        for f in files[:20]:
            t += f"  ✏️ {f}\n"
        if len(files) > 20:
            t += f"  ... +{len(files) - 20}\n"
        t += "\n"

    all_t = tests + ([hp] if hp else [])
    if all_t:
        p = sum(1 for x in all_t if x["ok"])
        t += f"🧪 Testler ({p}/{len(all_t)}):\n"
        for x in all_t:
            t += f"  {'✅' if x['ok'] else '❌'} {x['name']}\n"
        t += "\n"

    h = git.get("hash", "")
    br = git.get("branch", "?")
    pushed = git.get("pushed", False)
    if h:
        t += f"💾 Commit: {h[:8]} | Branch: {br} | Push: {'✅' if pushed else '❌'}\n"

    # GitHub link — SADECE push başarılıysa
    if pushed and h and len(h) >= 7:
        repo = git.get("url") or ""
        if not repo:
            cfg = PROJECTS.get(proj, {})
            repo = f"https://github.com/{cfg.get('repo', '')}" if cfg.get("repo") else ""
        if repo:
            t += f"\n🔗 {repo}/commit/{h}\n"

    if errs:
        t += "\n❌ Hatalar:\n"
        for e in errs[:5]:
            t += f"  • {e}\n"

    t += f"\n{'━' * 25}\n🕐 {datetime.now().strftime('%d.%m.%Y %H:%M')}"
    return t


# ═══════════════════════════════════════════════
# ANA GÖREV AKIŞLARI
# ═══════════════════════════════════════════════

def is_question(task: str) -> bool:
    indicators = ["?", "listele", "göster", "analiz et", "kontrol et", "incele",
                  "nasıl", "neden", "açıkla", "özetle", "hangi", "hata var mı",
                  "sorun ne", "ne var", "ne yapılmış", "bilgi ver", "neler var"]
    tl = task.lower()
    return any(i in tl for i in indicators)


async def do_task(bot, cid: int, pname: str, task: str):
    """Mevcut projede görev çalıştır."""
    cfg = PROJECTS[pname]
    root = cfg["path"]
    t0 = datetime.now()
    errs = []
    files_changed = []
    tests = []
    hp = None
    gres = {"hash": "", "branch": cfg["branch"], "pushed": False, "error": ""}
    model = "?"

    if not await git_ensure(cfg, bot, cid):
        return

    question = is_question(task)
    mode_txt = "📖 Soru/Analiz" if question else "💻 Kod Yazma"
    await send(bot, cid, f"🤖 Görev alındı!\n📂 {pname}\n🏷️ {mode_txt}\n📝 {task[:300]}\n⏳ Başlıyor...")

    try:
        # Dosyaları oku
        await send(bot, cid, "🔍 Dosyalar okunuyor...")
        context = read_files(root, cfg.get("ext", [".py", ".ts", ".tsx", ".js"]))
        if not context:
            await send(bot, cid, "⚠️ Proje dosyası bulunamadı!")
            return

        if question:
            # SORU MODU
            await send(bot, cid, "🧠 Analiz ediliyor...")
            resp, model = await ai_chat(task, context, pname)
            elapsed = (datetime.now() - t0).total_seconds()
            header = f"📖 ANALİZ SONUCU\n{'━' * 25}\n📂 {pname} | 🧠 {model} | ⏱️ {int(elapsed)}s\n\n"
            await send(bot, cid, header + resp[:3500])
            return
        else:
            # KOD MODU
            await send(bot, cid, "🧠 Claude kodluyor...")
            resp, model = await ai_code(task, context, pname)

            await send(bot, cid, "📝 Değişiklikler uygulanıyor...")
            files_changed = write_files(resp, root)

            if not files_changed:
                # Claude cevap verdi ama <file> yok — bilgi olarak gönder
                elapsed = (datetime.now() - t0).total_seconds()
                await send(bot, cid,
                    f"📋 Claude cevap verdi ama dosya değişikliği üretmedi.\n"
                    f"⏱️ {int(elapsed)}s | 🧠 {model}\n\nCevap:\n{resp[:3000]}")
                return

            # Git — repo varsa GitHub'a push, yoksa sadece lokal commit
            if cfg.get("repo"):
                await send(bot, cid, f"💾 Git push... ({len(files_changed)} dosya)")
                gres = await git_push(root, task, cfg["branch"])
            else:
                await send(bot, cid, f"💾 Lokal commit... ({len(files_changed)} dosya)")
                await sh("git add -A", root)
                ts = datetime.now().strftime("%Y-%m-%d %H:%M")
                safe_msg = task[:80].replace('"', "'").replace('`', "'")
                await sh(f'git commit -m "AI Bot: {safe_msg} [{ts}]"', root)
                o, _, _ = await sh("git rev-parse HEAD", root)
                gres = {"hash": o.strip(), "branch": cfg["branch"], "pushed": True, "error": ""}
            if gres.get("error"):
                errs.append(gres["error"])

            # Test
            if cfg.get("test"):
                await send(bot, cid, "🧪 Testler...")
                tests = await run_tests(root, cfg["test"])

            # Health
            if cfg.get("health"):
                await send(bot, cid, "🏥 Health check...")
                hp = await health(cfg["health"])

    except Exception as e:
        log.error(f"Görev hatası: {e}", exc_info=True)
        errs.append(str(e)[:300])

    elapsed = (datetime.now() - t0).total_seconds()
    r = report(task, pname, model, files_changed, tests, hp, gres, elapsed, errs, "code")
    await send(bot, cid, r)


async def do_new(bot, cid: int, name: str, desc: str):
    """Sıfırdan yeni proje oluştur."""
    t0 = datetime.now()
    errs = []
    files_changed = []
    gres = {"hash": "", "branch": "main", "pushed": False, "error": "", "url": ""}
    model = "?"

    safe = re.sub(r'[^a-zA-Z0-9_-]', '-', name.lower().strip())
    if not safe:
        await send(bot, cid, "❌ Geçersiz proje adı!")
        return

    # Mevcut projelerle çakışma kontrolü
    root = f"/opt/{safe}"
    if Path(root).exists():
        await send(bot, cid, f"⚠️ /opt/{safe} zaten var! Farklı isim kullan.")
        return

    # Bilinen proje dizinleriyle çakışma kontrolü
    existing_dirs = {Path(c["path"]).name for c in PROJECTS.values()}
    if safe in existing_dirs:
        await send(bot, cid, f"⚠️ '{safe}' adı mevcut bir projeyle çakışıyor! Farklı isim kullan.")
        return

    await send(bot, cid,
        f"🆕 Yeni Proje (VPS Lokal)!\n📂 {root}\n📝 {desc[:200]}\n⏳ Claude yapı oluşturuyor...")

    try:
        resp, model = await ai_newproject(safe, desc)
        Path(root).mkdir(parents=True, exist_ok=True)

        await send(bot, cid, "📝 Dosyalar yazılıyor...")
        files_changed = write_files(resp, root)
        if not files_changed:
            await send(bot, cid, "⚠️ Dosyalar oluşturulamadı, tekrar deneyin.")
            return

        await send(bot, cid, "💾 Lokal git repo oluşturuluyor (GitHub'a push YOK)...")
        gres = await git_init_local(root, safe)
        if gres["error"]:
            errs.append(gres["error"])

        # npm install
        if (Path(root) / "package.json").exists():
            await send(bot, cid, "📦 npm install...")
            _, e, c = await sh("npm install", root, 180)
            if c != 0:
                errs.append(f"npm: {e[:200]}")

        # pip install
        if (Path(root) / "requirements.txt").exists():
            await send(bot, cid, "📦 pip install...")
            _, e, c = await sh("pip3 install -r requirements.txt --quiet --break-system-packages 2>/dev/null || pip3 install -r requirements.txt --quiet", root, 180)
            if c != 0:
                errs.append(f"pip: {e[:200]}")

        # Kaydet — repo alanı boş (GitHub'a bağlı değil)
        new_cfg = {
            "path": root, "repo": "", "branch": "main",
            "cmd": safe[:10], "desc": desc[:100],
            "ext": [".ts", ".tsx", ".js", ".jsx", ".py", ".css", ".json"],
            "test": [], "deploy": "", "health": "",
        }
        PROJECTS[safe] = new_cfg
        ALIASES[safe] = safe
        save_dynamic(safe, new_cfg)

    except Exception as e:
        log.error(f"Yeni proje hatası: {e}", exc_info=True)
        errs.append(str(e)[:300])

    elapsed = (datetime.now() - t0).total_seconds()
    r = report(f"Yeni proje: {desc}", safe, model, files_changed, [], None, gres, elapsed, errs, "new")
    r += f"\n\n💡 Proje sadece VPS'te oluşturuldu: {root}"
    r += f"\n💡 Artık /{safe[:10]} [görev] ile bu projede çalışabilirsiniz."
    await send(bot, cid, r)


# ═══════════════════════════════════════════════
# TELEGRAM HANDLER'LAR
# ═══════════════════════════════════════════════

async def cmd_start(u: Update, ctx: ContextTypes.DEFAULT_TYPE):
    if not authorized(u.effective_chat.id):
        return await u.message.reply_text("⛔ Yetkiniz yok.")
    await u.message.reply_text(
        "🤖 AI Developer Bot v5\n\n"
        "💻 Kod yaz:\n"
        "  /deprem Login sayfasını güncelle\n"
        "  /eye Ana sayfaya slider ekle\n"
        "  /astro Burç detay sayfası\n\n"
        "📖 Soru sor:\n"
        "  /deprem Bu projedeki hatalar neler?\n\n"
        "🆕 Yeni proje:\n"
        "  /yeni myapp React ile todo uygulaması\n\n"
        "💬 Sohbet:\n"
        "  /chat React vs Vue hangisi daha iyi?\n\n"
        "🔧 /help /projects /status /health /deploy"
    )


async def cmd_help(u: Update, ctx: ContextTypes.DEFAULT_TYPE):
    if not authorized(u.effective_chat.id):
        return
    await u.message.reply_text(
        "📖 KULLANIM\n\n"
        "💻 KOD YAZMA (mevcut proje):\n"
        "  /deprem [görev açıklaması]\n"
        "  /eye [görev açıklaması]\n"
        "  /astro [görev açıklaması]\n"
        "  Görev: deprem - açıklama\n\n"
        "📖 SORU/ANALİZ (görevde ? veya 'listele' olsun):\n"
        "  /deprem Projedeki hatalar neler?\n\n"
        "🆕 YENİ PROJE:\n"
        "  /yeni proje-adi Açıklama buraya\n\n"
        "💬 SOHBET (proje bağımsız):\n"
        "  /chat TypeScript'te generic nasıl yazılır?\n\n"
        "🔧 SİSTEM:\n"
        "  /projects — Proje listesi\n"
        "  /status — Durum\n"
        "  /health — Health check\n"
        "  /deploy proje — Manuel deploy\n\n"
        "AKIŞ: Dosya oku → Claude AI → Kod yaz → Git push → Test → Rapor"
    )


async def cmd_projects(u: Update, ctx: ContextTypes.DEFAULT_TYPE):
    if not authorized(u.effective_chat.id):
        return
    t = "📂 PROJELER\n\n"
    for name, c in PROJECTS.items():
        ex = "✅" if Path(c["path"]).exists() else "❌"
        t += f"{ex} {name} (/{c.get('cmd', name)})\n   {c.get('desc', '')}\n   {c['path']}\n\n"
    await u.message.reply_text(t)


async def cmd_status(u: Update, ctx: ContextTypes.DEFAULT_TYPE):
    if not authorized(u.effective_chat.id):
        return
    t = f"📊 SİSTEM\n🤖 Claude API: {'✅' if claude else '❌'}\n🖥️ VPS: {VPS_HOST}\n\n"
    for name, c in PROJECTS.items():
        p = c["path"]
        if Path(p).exists():
            o, _, _ = await sh("git log -1 --format='%h %s (%cr)'", p)
            t += f"✅ {name}: {o[:80]}\n"
        else:
            t += f"❌ {name}: yok\n"
    await u.message.reply_text(t)


async def cmd_health(u: Update, ctx: ContextTypes.DEFAULT_TYPE):
    if not authorized(u.effective_chat.id):
        return
    await u.message.reply_text("🔍 Kontrol ediliyor...")
    t = "🏥 HEALTH CHECK\n\n"

    o, _, c = await sh("docker ps --format '{{.Names}}: {{.Status}}' 2>/dev/null", "/tmp")
    if c == 0 and o:
        t += "Docker:\n"
        for l in o.split("\n")[:10]:
            t += f"  {'✅' if 'Up' in l else '❌'} {l}\n"
        t += "\n"

    for name, c in PROJECTS.items():
        url = c.get("health")
        if url:
            r = await health(url)
            t += f"{'✅' if r['ok'] else '❌'} {name}: {r['out']}\n"
    await u.message.reply_text(t)


async def cmd_deploy(u: Update, ctx: ContextTypes.DEFAULT_TYPE):
    if not authorized(u.effective_chat.id):
        return
    args = ctx.args
    if not args:
        return await u.message.reply_text("Kullanım: /deploy deprem")
    pname = find_project(args[0])
    if not pname:
        return await u.message.reply_text(f"❌ Bilinmeyen: {args[0]}")
    cfg = PROJECTS[pname]
    root = cfg["path"]
    if not Path(root).exists():
        return await u.message.reply_text(f"❌ {root} bulunamadı")

    await u.message.reply_text(f"🚀 {pname} deploy ediliyor...")
    await sh(f"git pull origin {cfg['branch']}", root, 60)

    deploy_ok = False
    if cfg.get("deploy"):
        _, e, c = await sh(cfg["deploy"], root, 600)
        deploy_ok = c == 0

    h_ok = False
    if cfg.get("health"):
        r = await health(cfg["health"])
        h_ok = r["ok"]

    await u.message.reply_text(
        f"🚀 Deploy: {'✅' if deploy_ok else '❌'}\n🏥 Health: {'✅' if h_ok else '❌'}")


async def cmd_chat(u: Update, ctx: ContextTypes.DEFAULT_TYPE):
    """Serbest sohbet — proje bağımsız."""
    if not authorized(u.effective_chat.id):
        return
    text = u.message.text[len("/chat"):].strip()
    if not text:
        return await u.message.reply_text("💬 Kullanım: /chat Sorum burada")
    await u.message.reply_text("🧠 Düşünüyorum...")
    try:
        resp, model = await ai_chat(text)
        await send(ctx.bot, u.effective_chat.id, f"💬 {model}\n\n{resp[:3500]}")
    except Exception as e:
        await u.message.reply_text(f"❌ {str(e)[:300]}")


async def cmd_yeni(u: Update, ctx: ContextTypes.DEFAULT_TYPE):
    if not authorized(u.effective_chat.id):
        return
    text = u.message.text[len("/yeni"):].strip()
    if not text:
        return await u.message.reply_text(
            "🆕 YENİ PROJE\n\n"
            "Kullanım: /yeni proje-adi Açıklama\n\n"
            "Örnekler:\n"
            "  /yeni myshop E-ticaret sitesi React ile\n"
            "  /yeni todoapp React Native yapılacaklar uygulaması\n"
            "  /yeni blog Next.js kişisel blog\n"
            "  /yeni api FastAPI REST API servisi"
        )
    parts = text.split(None, 1)
    name = parts[0]
    desc = parts[1] if len(parts) > 1 else name
    await do_new(ctx.bot, u.effective_chat.id, name, desc)


async def cmd_project(u: Update, ctx: ContextTypes.DEFAULT_TYPE):
    """Proje komutu handler: /deprem, /eye, /astro, + dinamik."""
    cid = u.effective_chat.id
    if not authorized(cid):
        return await u.message.reply_text("⛔ Yetkiniz yok.")
    cmd = u.message.text.split()[0].lstrip("/").lower()
    pname = find_project(cmd)
    if not pname:
        return await u.message.reply_text(f"❌ Bilinmeyen: /{cmd}")
    task = u.message.text[len(f"/{cmd}"):].strip()
    if not task:
        c = PROJECTS[pname]
        return await u.message.reply_text(
            f"📂 {pname}\n\n"
            f"Kod: /{cmd} Ana sayfaya buton ekle\n"
            f"Soru: /{cmd} Projedeki hatalar neler?\n"
        )
    await do_task(ctx.bot, cid, pname, task)


async def handle_text(u: Update, ctx: ContextTypes.DEFAULT_TYPE):
    """Serbest metin handler — Görev: format veya sohbet."""
    msg = u.message.text
    cid = u.effective_chat.id
    if not authorized(cid):
        return

    # "Görev: proje - açıklama" formatı
    if msg.lower().startswith("görev:"):
        try:
            _, content = msg.split(":", 1)
            if "-" not in content:
                raise ValueError()
            proj_raw, task = content.split("-", 1)
            proj_raw = proj_raw.strip()
            task = task.strip()
            if not task:
                raise ValueError()
        except ValueError:
            return await u.message.reply_text(
                "⚠️ Format: Görev: proje - açıklama\n"
                "veya: /deprem açıklama\n"
                "veya: /yeni ad açıklama")

        if proj_raw.lower() in ("yeni", "new"):
            parts = task.split(None, 1)
            return await do_new(ctx.bot, cid, parts[0], parts[1] if len(parts) > 1 else task)

        pname = find_project(proj_raw)
        if not pname:
            cmds = ", ".join(f"/{c.get('cmd', n)}" for n, c in PROJECTS.items())
            return await u.message.reply_text(f"❌ Bilinmeyen: {proj_raw}\nProjeler: {cmds}")
        return await do_task(ctx.bot, cid, pname, task)

    # Serbest sohbet (herhangi bir mesaj)
    # Sadece özel sohbette çalışsın (grup spam'i önle)
    if u.effective_chat.type == "private":
        await u.message.reply_text("🧠 Düşünüyorum...")
        try:
            resp, model = await ai_chat(msg)
            await send(ctx.bot, cid, f"💬 {model}\n\n{resp[:3500]}")
        except Exception as e:
            await u.message.reply_text(f"❌ {str(e)[:300]}")


# ═══════════════════════════════════════════════
# BAŞLATMA — 409 CONFLICT FIX
# ═══════════════════════════════════════════════

async def post_init(app):
    cmds = [
        BotCommand("start", "Bot'u başlat"),
        BotCommand("help", "Kullanım kılavuzu"),
        BotCommand("deprem", "Deprem App görevi"),
        BotCommand("eye", "Eye of TR görevi"),
        BotCommand("astro", "Astroloji görevi"),
        BotCommand("yeni", "Yeni proje oluştur"),
        BotCommand("chat", "Serbest sohbet"),
        BotCommand("projects", "Proje listesi"),
        BotCommand("status", "Sistem durumu"),
        BotCommand("health", "Health check"),
        BotCommand("deploy", "Manuel deploy"),
    ]
    await app.bot.set_my_commands(cmds)
    log.info("Komutlar kaydedildi.")


def kill_old():
    """Eski bot process'lerini öldür — kendini ASLA öldürmez."""
    my = os.getpid()
    killed = []
    try:
        r = subprocess.run(["pgrep", "-f", "bot.py"], capture_output=True, text=True, timeout=5)
        for line in (r.stdout or "").strip().split("\n"):
            if not line.strip():
                continue
            try:
                pid = int(line.strip())
            except ValueError:
                continue
            if pid != my:
                try:
                    os.kill(pid, signal.SIGTERM)
                    killed.append(pid)
                except (ProcessLookupError, PermissionError):
                    pass
    except Exception:
        pass

    if killed:
        _time.sleep(2)
        # SIGKILL sadece hala yaşayan eski process'lere — kendimize ASLA
        for pid in killed:
            try:
                os.kill(pid, signal.SIGKILL)
            except (ProcessLookupError, PermissionError):
                pass
        _time.sleep(1)


async def clean_webhook():
    import httpx
    try:
        async with httpx.AsyncClient() as h:
            url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}"
            await h.post(f"{url}/deleteWebhook", params={"drop_pending_updates": True}, timeout=10)
            r = await h.get(f"{url}/getUpdates", params={"offset": -1, "timeout": 1}, timeout=10)
            d = r.json()
            if d.get("ok") and d.get("result"):
                last = d["result"][-1]["update_id"]
                await h.get(f"{url}/getUpdates", params={"offset": last + 1, "timeout": 1}, timeout=10)
            log.info("Webhook + offset temizlendi")
    except Exception as e:
        log.warning(f"Temizleme hatası: {e}")


def main():
    if not TELEGRAM_BOT_TOKEN:
        log.critical("TELEGRAM_BOT_TOKEN eksik!")
        sys.exit(1)

    kill_old()
    asyncio.run(clean_webhook())

    log.info("=" * 50)
    log.info("AI Developer Bot v5 başlatılıyor...")
    log.info(f"Projeler: {', '.join(PROJECTS.keys())}")
    log.info(f"VPS: {VPS_HOST}")
    log.info("=" * 50)

    app = ApplicationBuilder().token(TELEGRAM_BOT_TOKEN).post_init(post_init).build()

    # Sistem komutları
    for cmd, fn in [("start", cmd_start), ("help", cmd_help), ("projects", cmd_projects),
                    ("status", cmd_status), ("health", cmd_health), ("deploy", cmd_deploy),
                    ("chat", cmd_chat), ("yeni", cmd_yeni), ("new", cmd_yeni)]:
        app.add_handler(CommandHandler(cmd, fn))

    # Proje komutları — Telegram sadece [a-z0-9_] kabul eder, tire/özel karakter yasak
    sys_cmds = {"start", "help", "projects", "status", "health", "deploy", "chat", "yeni", "new"}
    proj_cmds = set()
    for n, c in PROJECTS.items():
        proj_cmds.add(n)
        proj_cmds.add(c.get("cmd", n))
    for a in ALIASES:
        proj_cmds.add(a)
    proj_cmds -= sys_cmds

    # Geçersiz komut isimlerini filtrele (tire, boşluk, özel karakter içerenler)
    valid_cmds = {c for c in proj_cmds if re.match(r'^[a-z0-9_]+$', c)}
    invalid = proj_cmds - valid_cmds
    if invalid:
        log.warning(f"Geçersiz komut isimleri atlandı: {invalid}")

    for cmd in valid_cmds:
        app.add_handler(CommandHandler(cmd, cmd_project))

    # Serbest metin
    app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_text))

    log.info(f"Proje komutları: /{', /'.join(sorted(valid_cmds))}")
    log.info("Bot çalışıyor!")
    app.run_polling(drop_pending_updates=True)


if __name__ == "__main__":
    main()
