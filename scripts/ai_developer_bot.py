"""
AI Developer Telegram Bot — Temiz Mimari v6
============================================
Tek sorumluluk, tek instance, 409 Conflict döngüsü yok.

Desteklenen projeler  : eyeoftrv2, depremapp, astroloji
Komutlar              : /start /help /projects /status /health /deploy
Görev formatı         : Görev: [proje] - [açıklama]
"""

from __future__ import annotations

import asyncio
import fcntl
import logging
import os
import re
import signal
import subprocess
import sys
import time
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Tuple

from anthropic import Anthropic
from dotenv import load_dotenv
from telegram import BotCommand, Update
from telegram.error import Conflict as TelegramConflict
from telegram.ext import (
    ApplicationBuilder,
    CommandHandler,
    ContextTypes,
    MessageHandler,
    filters,
)

# ─────────────────────────────────────────────────────────────
# LOGGING
# ─────────────────────────────────────────────────────────────
logging.basicConfig(
    format="%(asctime)s %(levelname)-8s %(name)s — %(message)s",
    level=logging.INFO,
    stream=sys.stdout,
)
log = logging.getLogger("aibot")

# ─────────────────────────────────────────────────────────────
# ENVIRONMENT
# ─────────────────────────────────────────────────────────────
_HERE = Path(__file__).resolve().parent

for _ep in (_HERE / ".env", _HERE.parent / ".env", Path("/opt/deprem-appp/.env")):
    if _ep.exists():
        load_dotenv(dotenv_path=_ep)
        break

BOT_TOKEN: str = os.getenv("TELEGRAM_BOT_TOKEN", "")
ANTHROPIC_KEY: str = os.getenv("ANTHROPIC_API_KEY", "")
OWNER_CHAT_ID_RAW: str = os.getenv("TELEGRAM_CHAT_ID", "")
ALLOWED_RAW: str = os.getenv("ALLOWED_CHAT_IDS", "")

# İzin verilen chat ID seti
_allowed: set = set()
for _raw in (OWNER_CHAT_ID_RAW, ALLOWED_RAW):
    for _part in _raw.split(","):
        _part = _part.strip()
        try:
            _allowed.add(int(_part))
        except ValueError:
            pass
ALLOWED_IDS: frozenset = frozenset(_allowed)

# ─────────────────────────────────────────────────────────────
# PROJE TANIMLARI
# ─────────────────────────────────────────────────────────────
BASE = Path("/opt")

PROJECTS: Dict[str, dict] = {
    "eyeoftrv2": {
        "path": BASE / "eye-of-tr-v2",
        "repo": "bendedo13/eye-of-tr-v2",
        "url": "https://github.com/bendedo13/eye-of-tr-v2",
        "deploy": "deploy.sh",
        "tests": ["npm run build", "npm run lint"],
        "health": "http://localhost:3000",
        "branch": "main",
        "desc": "Eye of TR — Web Uygulaması",
        "exts": [".ts", ".tsx", ".js", ".jsx", ".css", ".html", ".json"],
    },
    "depremapp": {
        "path": BASE / "deprem-appp",
        "repo": "bendedo13/deprem-appp",
        "url": "https://github.com/bendedo13/deprem-appp",
        "deploy": "deploy/PRODUCTION_DEPLOY.sh",
        "tests": ["docker-compose ps", "curl -sf http://localhost:8001/health || exit 1"],
        "health": "http://localhost:8001/health",
        "branch": "main",
        "desc": "Deprem App — Mobil + Backend",
        "exts": [".py", ".ts", ".tsx", ".js", ".json"],
    },
    "astroloji": {
        "path": BASE / "astroloji",
        "repo": "bendedo13/astroloji",
        "url": "https://github.com/bendedo13/astroloji",
        "deploy": "deploy.sh",
        "tests": ["npm run build"],
        "health": "http://localhost:3002",
        "branch": "main",
        "desc": "Astroloji — Web Uygulaması",
        "exts": [".ts", ".tsx", ".js", ".jsx", ".css", ".html", ".json"],
    },
}

ALIASES: Dict[str, str] = {
    "eyeoftr": "eyeoftrv2",
    "eye": "eyeoftrv2",
    "deprem": "depremapp",
    "deprem-appp": "depremapp",
    "depremappp": "depremapp",
    "astro": "astroloji",
}

# ─────────────────────────────────────────────────────────────
# ANTHROPIC CLIENT
# ─────────────────────────────────────────────────────────────
ai_client: Optional[Anthropic] = None
if ANTHROPIC_KEY:
    ai_client = Anthropic(api_key=ANTHROPIC_KEY)
else:
    log.warning("ANTHROPIC_API_KEY eksik — AI özellikleri devre dışı.")

# ─────────────────────────────────────────────────────────────
# TEK-INSTANCE KİLİDİ
# ─────────────────────────────────────────────────────────────
_PID_FILE = "/tmp/ai-developer-bot.pid"
_lock_fh = None  # dosya tanıtıcısını açık tut — kilit onunla sağlanır


def _terminate_stale_instances() -> None:
    """Bu bot dosyasını çalıştıran diğer Python process'lerini SIGTERM→SIGKILL ile temizle."""
    my_pid = os.getpid()
    bot_path = str(Path(__file__).resolve())
    try:
        result = subprocess.run(["ps", "aux"], capture_output=True, text=True, timeout=5)
    except Exception as exc:
        log.warning("ps aux başarısız: %s", exc)
        return

    for line in result.stdout.splitlines():
        if "python" not in line or bot_path not in line:
            continue
        parts = line.split()
        if len(parts) < 2:
            continue
        try:
            pid = int(parts[1])
        except ValueError:
            continue
        if pid == my_pid:
            continue
        log.warning("Eski bot process kapatılıyor: PID %d", pid)
        try:
            os.kill(pid, signal.SIGTERM)
            time.sleep(2)
            try:
                os.kill(pid, 0)  # hâlâ var mı?
                os.kill(pid, signal.SIGKILL)
                log.warning("PID %d SIGKILL ile kapatıldı.", pid)
            except ProcessLookupError:
                pass  # SIGTERM yeterliydi
        except (ProcessLookupError, PermissionError) as exc:
            log.debug("PID %d temizlenemedi: %s", pid, exc)


def _acquire_lock() -> bool:
    """flock ile PID dosyasını kilitle — tek instance garantisi."""
    global _lock_fh
    try:
        _lock_fh = open(_PID_FILE, "w")
        fcntl.flock(_lock_fh, fcntl.LOCK_EX | fcntl.LOCK_NB)
        _lock_fh.write(str(os.getpid()))
        _lock_fh.flush()
        return True
    except BlockingIOError:
        try:
            existing = open(_PID_FILE).read().strip()
        except OSError:
            existing = "?"
        log.critical("Kilit alınamadı — başka bir instance çalışıyor (PID: %s).", existing)
        return False


# ─────────────────────────────────────────────────────────────
# YARDIMCI FONKSİYONLAR
# ─────────────────────────────────────────────────────────────

def resolve_project(name: str) -> Optional[str]:
    name = name.strip().lower()
    return name if name in PROJECTS else ALIASES.get(name)


def authorized(chat_id: int) -> bool:
    return (not ALLOWED_IDS) or (chat_id in ALLOWED_IDS)


async def shell(cmd: str, cwd: Path, timeout: int = 120) -> Tuple[str, str, int]:
    """Asenkron shell komutu çalıştır."""
    try:
        proc = await asyncio.create_subprocess_shell(
            cmd,
            cwd=str(cwd),
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        out, err = await asyncio.wait_for(proc.communicate(), timeout=timeout)
        return out.decode().strip(), err.decode().strip(), proc.returncode
    except asyncio.TimeoutError:
        return "", f"Zaman aşımı ({timeout}s)", 1
    except Exception as exc:
        return "", str(exc), 1


async def send(bot, chat_id: int, text: str) -> None:
    """Telegram'a mesaj gönder — 4096 karakter sınırını aş."""
    MAX = 4000
    chunks: List[str] = []
    while text:
        if len(text) <= MAX:
            chunks.append(text)
            break
        idx = text.rfind("\n", 0, MAX)
        if idx < 0:
            idx = MAX
        chunks.append(text[:idx])
        text = text[idx:].lstrip("\n")

    for i, chunk in enumerate(chunks):
        try:
            await bot.send_message(chat_id=chat_id, text=chunk, parse_mode="Markdown")
        except Exception:
            await bot.send_message(chat_id=chat_id, text=chunk)
        if i < len(chunks) - 1:
            await asyncio.sleep(0.4)


# ─────────────────────────────────────────────────────────────
# PROJE DOSYA OKUMA
# ─────────────────────────────────────────────────────────────
_SKIP_DIRS = {"venv", "node_modules", ".git", "__pycache__", "dist", "build",
              ".expo", ".next", "coverage", ".cache", "android", "ios"}
_SKIP_FILES = {"package-lock.json", "yarn.lock", "pnpm-lock.yaml"}


async def read_project(path: Path, exts: List[str]) -> str:
    parts: List[str] = []
    total = 0
    limit = 150_000

    for ext in exts:
        for fp in sorted(path.rglob(f"*{ext}")):
            if any(p in fp.parts for p in _SKIP_DIRS) or fp.name in _SKIP_FILES:
                continue
            try:
                content = fp.read_text(encoding="utf-8", errors="ignore")
                if len(content) > 30_000:
                    content = content[:30_000] + "\n… (kırpıldı)"
                parts.append(f"--- {fp.relative_to(path)} ---\n{content}\n")
                total += len(content)
                if total > limit:
                    break
            except Exception as exc:
                log.debug("Okunamadı %s: %s", fp, exc)
        if total > limit:
            break

    return "\n".join(parts)


# ─────────────────────────────────────────────────────────────
# CLAUDE AI
# ─────────────────────────────────────────────────────────────
_MODELS_HEAVY = ["claude-opus-4-5", "claude-sonnet-4-5-20241022"]
_MODELS_LIGHT = ["claude-haiku-4-5", "claude-sonnet-4-5-20241022"]
_HEAVY_KEYWORDS = {
    "api", "veritabanı", "database", "auth", "güvenlik", "security",
    "mimari", "architecture", "migration", "entegrasyon", "integration",
    "refactor", "algorithm", "performance", "optimization",
}

_SYSTEM_PROMPT = """Sen uzman bir Türk yazılım geliştiricisisin.
Verilen proje dosyalarını ve görevi analiz edip gerekli kod değişikliklerini üretirsin.

KURALLAR:
1. Sadece gerekli değişiklikleri yap.
2. Türkçe yorum satırları ekle (önemli yerlere).
3. Yanıtın YALNIZCA şu XML formatında olsun:

<file path="göreceli/yol/dosya.ext">
dosyanın TAM yeni içeriği
</file>

<explanation>
- Değişiklik 1
- Değişiklik 2
</explanation>

4. Sadece değiştirilen ya da yeni dosyaları döndür.
5. Güvenlik açığı bırakma (XSS, injection vb.)."""


def _pick_models(task: str, ctx_len: int) -> List[str]:
    if ctx_len > 50_000 or any(kw in task.lower() for kw in _HEAVY_KEYWORDS):
        return _MODELS_HEAVY
    return _MODELS_LIGHT


async def ask_claude(task: str, context: str, project: str) -> Tuple[str, str]:
    """Claude'a görev gönder. (yanıt_metni, kullanılan_model) döndürür."""
    if not ai_client:
        raise RuntimeError("Anthropic API anahtarı eksik!")

    models = _pick_models(task, len(context))
    prompt = (
        f"PROJE: {project}\nGÖREV: {task}\n\nMEVCUT DOSYALAR:\n"
        f"{context[:120_000]}\n\nGerekli kod değişikliklerini üret."
    )

    last_err: Exception = RuntimeError("Model listesi boş")
    for model in models:
        try:
            log.info("Model deneniyor: %s", model)
            msg = ai_client.messages.create(
                model=model,
                max_tokens=16_000,
                temperature=0,
                system=_SYSTEM_PROMPT,
                messages=[{"role": "user", "content": prompt}],
            )
            log.info("Model başarılı: %s", model)
            return msg.content[0].text, model
        except Exception as exc:
            last_err = exc
            log.warning("Model %s başarısız: %s", model, exc)

    raise RuntimeError(f"Tüm modeller başarısız. Son hata: {last_err}") from last_err


def apply_changes(response: str, project_path: Path) -> List[Tuple[str, str]]:
    """XML yanıtını parse edip dosyalara yaz. [(yol, açıklama), ...] döndürür."""
    changed: List[Tuple[str, str]] = []
    exps = re.findall(r"<explanation>\s*(.*?)\s*</explanation>", response, re.DOTALL)

    for i, m in enumerate(re.finditer(r'<file path="(.*?)">\s*(.*?)\s*</file>', response, re.DOTALL)):
        rel, content = m.group(1).strip(), m.group(2)
        full = (project_path / rel).resolve()

        # Güvenlik: proje dışı yazım engeli
        try:
            full.relative_to(project_path.resolve())  # symlink-resolved paths
        except ValueError:
            log.warning("Güvenlik: proje dışı yazım engellendi: %s", rel)
            continue

        full.parent.mkdir(parents=True, exist_ok=True)
        full.write_text(content, encoding="utf-8")
        exp = exps[i].strip() if i < len(exps) else "Dosya güncellendi"
        changed.append((rel, exp))
        log.info("Güncellendi: %s", rel)

    return changed


# ─────────────────────────────────────────────────────────────
# GIT
# ─────────────────────────────────────────────────────────────

async def git_commit_push(project_path: Path, task: str, branch: str) -> Tuple[str, bool]:
    """add + commit + push. (commit_hash, push_ok) döndürür."""
    await shell("git add -A", project_path)

    ts = datetime.now().strftime("%Y-%m-%d %H:%M")
    out, err, code = await shell(
        f'git commit -m "AI Bot: {task[:80]} [{ts}]"', project_path
    )
    if code != 0:
        if "nothing to commit" in (out + err):
            return "no-change", False
        log.error("Commit başarısız: %s", err[:300])
        return "commit-failed", False

    full_hash, _, _ = await shell("git rev-parse HEAD", project_path)

    push_ok = False
    for attempt in range(4):
        _, err, code = await shell(f"git push origin {branch}", project_path)
        if code == 0:
            push_ok = True
            break
        wait = 2 ** (attempt + 1)
        log.warning("Push denemesi %d başarısız, %ds bekleniyor…", attempt + 1, wait)
        await asyncio.sleep(wait)

    if not push_ok:
        log.error("Git push başarısız: %s", err[:200])

    return full_hash.strip(), push_ok


# ─────────────────────────────────────────────────────────────
# TELEGRAM KOMUTLARI
# ─────────────────────────────────────────────────────────────

async def cmd_start(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    if not authorized(update.effective_chat.id):
        await update.message.reply_text("⛔ Yetkiniz yok.")
        return
    await update.message.reply_text(
        "🤖 *AI Developer Bot v6*\n\n"
        "Anthropic Claude ile projelerinizi otomatik kodlar, test eder, push eder.\n\n"
        "*Komutlar:* /help /projects /status /health /deploy\n\n"
        "*Görev formatı:*\n"
        "`Görev: depremapp - Ana sayfaya buton ekle`\n"
        "`Görev: eyeoftrv2 - Login güncelle`\n"
        "`Görev: astroloji - Burç API entegrasyonu`",
        parse_mode="Markdown",
    )


async def cmd_help(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    if not authorized(update.effective_chat.id):
        return
    await update.message.reply_text(
        "📖 *Kullanım Kılavuzu*\n\n"
        "*Format:* `Görev: [proje] - [açıklama]`\n\n"
        "*Proje adları:*\n"
        "• `eyeoftrv2` → `eyeoftr`, `eye`\n"
        "• `depremapp` → `deprem`, `deprem-appp`\n"
        "• `astroloji` → `astro`\n\n"
        "*İş akışı:*\n"
        "1️⃣ Dosyaları oku\n"
        "2️⃣ Claude AI ile kodla\n"
        "3️⃣ Değişiklikleri uygula\n"
        "4️⃣ Git commit + push\n"
        "5️⃣ Testleri çalıştır\n"
        "6️⃣ Health check\n"
        "7️⃣ Rapor gönder",
        parse_mode="Markdown",
    )


async def cmd_projects(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    if not authorized(update.effective_chat.id):
        return
    lines = ["📂 *Projeler:*\n"]
    for name, cfg in PROJECTS.items():
        ok = "✅" if cfg["path"].exists() else "❌"
        lines.append(f"*{name}* {ok}\n  {cfg['desc']}\n  {cfg['url']}\n")
    await update.message.reply_text("\n".join(lines), parse_mode="Markdown")


async def cmd_status(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    if not authorized(update.effective_chat.id):
        return
    lines = ["📊 *Durum*\n", f"🤖 Anthropic API: {'✅' if ai_client else '❌'}\n"]
    for name, cfg in PROJECTS.items():
        exists = cfg["path"].exists()
        lines.append(f"*{name}:* {'✅' if exists else '❌'}")
        if exists:
            out, _, code = await shell("git log -1 --format='%h %s (%cr)'", cfg["path"])
            if code == 0 and out:
                lines.append(f"  `{out[:90]}`")
    await update.message.reply_text("\n".join(lines), parse_mode="Markdown")


async def cmd_health(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    if not authorized(update.effective_chat.id):
        return
    await update.message.reply_text("🔍 Health check yapılıyor…")
    lines = ["🏥 *Health Check:*\n"]
    for name, cfg in PROJECTS.items():
        url = cfg.get("health")
        if not url:
            lines.append(f"⏭️ {name}: URL yok")
            continue
        out, _, _ = await shell(
            f'curl -sf -o /dev/null -w "%{{http_code}}" --connect-timeout 5 {url}',
            Path.cwd(), timeout=15,
        )
        code = out.strip()
        ok = code in ("200", "301", "302")
        lines.append(f"{'✅' if ok else '❌'} *{name}:* HTTP {code}")
    await update.message.reply_text("\n".join(lines), parse_mode="Markdown")


async def cmd_deploy(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    if not authorized(update.effective_chat.id):
        return
    if not context.args:
        await update.message.reply_text("Kullanım: `/deploy [proje]`", parse_mode="Markdown")
        return

    pname = resolve_project(context.args[0])
    if not pname:
        await update.message.reply_text(f"❌ Bilinmeyen proje: {context.args[0]}")
        return

    cfg = PROJECTS[pname]
    script = cfg["path"] / cfg["deploy"]
    if not script.exists():
        await update.message.reply_text(f"❌ Deploy script bulunamadı: {script}")
        return

    await update.message.reply_text(f"🚀 {pname} deploy başlatılıyor…")
    out, err, code = await shell(f"bash {script}", cfg["path"], timeout=300)
    status = "✅ Başarılı" if code == 0 else "❌ Başarısız"
    result = (out or err)[:800]
    await send(context.bot, update.effective_chat.id,
               f"🚀 *Deploy: {status}*\n\n```\n{result}\n```")


# ─────────────────────────────────────────────────────────────
# ANA GÖREV İŞLEYİCİ
# ─────────────────────────────────────────────────────────────

async def handle_task(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """'Görev: proje - açıklama' formatındaki mesajları işle."""
    msg = update.message.text or ""
    chat_id = update.effective_chat.id

    if not authorized(chat_id):
        await update.message.reply_text("⛔ Yetkiniz yok. Chat ID: " + str(chat_id))
        return

    if not msg.lower().startswith("görev:"):
        return

    # ── Parse ────────────────────────────────────────────────
    try:
        _, rest = msg.split(":", 1)
        proj_raw, task_desc = rest.split("-", 1)
        proj_raw = proj_raw.strip()
        task_desc = task_desc.strip()
        if not proj_raw or not task_desc:
            raise ValueError("Boş alan")
    except ValueError:
        await update.message.reply_text(
            "⚠️ *Format hatası*\n\n"
            "Kullanım: `Görev: [proje] - [açıklama]`\n"
            "Örnek: `Görev: depremapp - Yeni buton ekle`",
            parse_mode="Markdown",
        )
        return

    pname = resolve_project(proj_raw)
    if not pname:
        await update.message.reply_text(
            f"❌ Bilinmeyen proje: *{proj_raw}*\n"
            f"Mevcut: `{', '.join(PROJECTS)}`",
            parse_mode="Markdown",
        )
        return

    cfg = PROJECTS[pname]
    ppath = cfg["path"]

    # ── Proje clone (yoksa) ──────────────────────────────────
    if not ppath.exists():
        await update.message.reply_text(f"📥 `{pname}` clone ediliyor…", parse_mode="Markdown")
        _, err, code = await shell(
            f"git clone https://github.com/{cfg['repo']}.git {ppath}",
            Path("/opt"), timeout=120,
        )
        if code != 0:
            await update.message.reply_text(
                f"❌ Clone başarısız:\n`{err[:300]}`", parse_mode="Markdown"
            )
            return

    # ── İş akışı değişkenleri ────────────────────────────────
    t0 = datetime.now()
    errors: List[str] = []
    tests: List[Tuple[str, bool, str]] = []  # (ad, başarı, çıktı)
    changed: List[Tuple[str, str]] = []
    used_model = "—"
    commit_hash = ""
    push_ok = False

    async def step(txt: str) -> None:
        await update.message.reply_text(txt, parse_mode="Markdown")

    await step(f"🤖 *Görev Alındı*\n📂 Proje: *{pname}*\n📝 {task_desc}\n⏳ Başlıyor…")

    try:
        # 1. Dosyaları oku
        await step("🔍 *1/6* Proje dosyaları okunuyor…")
        ctx = await read_project(ppath, cfg["exts"])
        if not ctx:
            await step("⚠️ Proje dosyaları okunamadı!")
            return

        # 2. Claude ile kodla
        models = _pick_models(task_desc, len(ctx))
        await step(f"🧠 *2/6* Claude AI kodluyor… model: `{models[0]}`")
        ai_response, used_model = await ask_claude(task_desc, ctx, pname)

        # 3. Değişiklikleri uygula
        await step("📝 *3/6* Değişiklikler uygulanıyor…")
        changed = apply_changes(ai_response, ppath)
        if not changed:
            await step(
                "⚠️ Claude değişiklik üretmedi.\n"
                "Görevi daha detaylı yazmayı deneyin."
            )
            return

        # 4. Git commit + push
        await step("💾 *4/6* Git commit & push…")
        commit_hash, push_ok = await git_commit_push(ppath, task_desc, cfg["branch"])
        tests.append(("Git Commit", commit_hash not in ("no-change", "commit-failed"), ""))
        tests.append(("Git Push", push_ok, cfg["branch"]))

        # 5. Testler
        await step("🧪 *5/6* Testler çalıştırılıyor…")
        for cmd in cfg["tests"]:
            out, err, code = await shell(cmd, ppath, timeout=180)
            ok = code == 0
            tests.append((f"Test: {cmd}", ok, (out or err)[:200]))

        # 6. Health check
        await step("🏥 *6/6* Health check…")
        url = cfg.get("health")
        if url:
            hout, _, _ = await shell(
                f'curl -sf -o /dev/null -w "%{{http_code}}" --connect-timeout 5 {url}',
                Path.cwd(), timeout=15,
            )
            hcode = hout.strip()
            tests.append((
                f"Health ({url})",
                hcode in ("200", "301", "302"),
                f"HTTP {hcode}",
            ))

    except Exception as exc:
        log.error("Görev hatası: %s", exc, exc_info=True)
        errors.append(str(exc)[:400])

    # ── Rapor ────────────────────────────────────────────────
    elapsed = (datetime.now() - t0).total_seconds()
    passed = sum(1 for _, ok, _ in tests if ok)
    total_t = len(tests)
    overall_ok = not errors and (total_t == 0 or passed == total_t)

    report = (
        f"🤖 *AI DEVELOPER BOT — RAPOR*\n"
        f"━━━━━━━━━━━━━━━━━━━━━━\n\n"
        f"📌 *Görev:* {task_desc}\n"
        f"📂 *Proje:* {pname}\n"
        f"⏱ *Süre:* {int(elapsed // 60)}dk {int(elapsed % 60)}s\n"
        f"🧠 *Model:* {used_model}\n"
        f"🎯 *Durum:* {'✅ BAŞARILI' if overall_ok else '⚠️ HATALAR VAR'}\n\n"
    )

    if changed:
        report += f"📂 *Değişen Dosyalar ({len(changed)}):*\n"
        for fpath, exp in changed:
            report += f"  ✏️ `{fpath}`\n"
            for line in exp.split("\n")[:2]:
                line = line.strip("- ").strip()
                if line:
                    report += f"     • {line}\n"
        report += "\n"

    if tests:
        report += f"🧪 *Testler ({passed}/{total_t}):*\n"
        for name, ok, out in tests:
            icon = "✅" if ok else "❌"
            suffix = f" — {out}" if out else ""
            report += f"  {icon} {name}{suffix}\n"
        report += "\n"

    if commit_hash:
        cshort = commit_hash[:8] if len(commit_hash) > 8 else commit_hash
        report += (
            f"💾 *Git:* `{cshort}` / branch `{cfg['branch']}` / "
            f"push {'✅' if push_ok else '❌'}\n"
        )
        if commit_hash not in ("no-change", "commit-failed", ""):
            report += f"🔗 {cfg['url']}/commit/{commit_hash}\n"

    if errors:
        report += "\n❌ *Hatalar:*\n"
        for e in errors:
            report += f"  • {e}\n"

    report += f"\n━━━━━━━━━━━━━━━━━━━━━━\n🕐 {datetime.now().strftime('%d.%m.%Y %H:%M:%S')}"
    await send(context.bot, chat_id, report)


# ─────────────────────────────────────────────────────────────
# 409 HATA YÖNETİCİSİ
# ─────────────────────────────────────────────────────────────

async def error_handler(update: object, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Tüm handler hatalarını yakala. 409 Conflict: rakip instance'ı temizle ve bekle."""
    err = context.error
    if isinstance(err, TelegramConflict):
        log.critical(
            "409 Conflict: başka bir bot instance'ı var. "
            "Rakip process temizleniyor, 30s bekleniyor…"
        )
        _terminate_stale_instances()
        await asyncio.sleep(30)
        return  # PTB polling döngüsü devam eder — sonsuz restart YOK
    log.error("Handler istisnası:", exc_info=err)


# ─────────────────────────────────────────────────────────────
# POST-INIT
# ─────────────────────────────────────────────────────────────

async def post_init(app) -> None:
    """Bot başladıktan sonra webhook temizle, komutları kaydet."""
    await app.bot.delete_webhook(drop_pending_updates=True)
    await app.bot.set_my_commands([
        BotCommand("start",    "Bot'u başlat"),
        BotCommand("help",     "Kullanım kılavuzu"),
        BotCommand("projects", "Projeleri listele"),
        BotCommand("status",   "Sistem durumu"),
        BotCommand("health",   "Health check"),
        BotCommand("deploy",   "Manuel deploy: /deploy [proje]"),
    ])
    log.info("Webhook silindi, komutlar kaydedildi.")


# ─────────────────────────────────────────────────────────────
# MAIN
# ─────────────────────────────────────────────────────────────

def main() -> None:
    # Temel kontroller
    if not BOT_TOKEN or BOT_TOKEN == "your_bot_token_here":
        log.critical("TELEGRAM_BOT_TOKEN eksik! .env dosyasını kontrol edin.")
        sys.exit(1)

    if not ANTHROPIC_KEY:
        log.warning("ANTHROPIC_API_KEY eksik — AI görevleri çalışmayacak.")

    # Rakip instance'ları temizle, ardından kilidi al
    _terminate_stale_instances()
    if not _acquire_lock():
        sys.exit(1)

    log.info("=" * 50)
    log.info("AI Developer Bot v6 başlatılıyor…")
    log.info("Projeler: %s", ", ".join(PROJECTS))
    log.info("=" * 50)

    app = (
        ApplicationBuilder()
        .token(BOT_TOKEN)
        .post_init(post_init)
        .build()
    )

    app.add_handler(CommandHandler("start",    cmd_start))
    app.add_handler(CommandHandler("help",     cmd_help))
    app.add_handler(CommandHandler("projects", cmd_projects))
    app.add_handler(CommandHandler("status",   cmd_status))
    app.add_handler(CommandHandler("health",   cmd_health))
    app.add_handler(CommandHandler("deploy",   cmd_deploy))
    app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_task))
    app.add_error_handler(error_handler)

    log.info("Bot polling başlatılıyor…")
    try:
        app.run_polling(drop_pending_updates=True)
    except Exception as exc:
        log.critical("Polling hatası: %s", exc, exc_info=True)
        sys.exit(1)


if __name__ == "__main__":
    main()
