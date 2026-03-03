"""
AI Developer Telegram Bot v4
==============================
Telegram üzerinden görev alıp Anthropic Claude API ile kodlayan,
test eden, push eden ve Telegram'a rapor gönderen otomasyon botu.

ÖZELLİKLER:
  - Mevcut projelerde kod yazma/düzenleme
  - Soru/analiz görevleri (kod yazmadan cevap alma)
  - Yeni proje oluşturma (sıfırdan)
  - Otomatik git push + rapor

GÖREV KABUL YÖNTEMLERİ:
  /deprem Ana sayfaya buton ekle
  /eye Login sayfasını güncelle
  /astro Burç API entegre et
  /yeni myapp React Native ile yeni uygulama oluştur
  Görev: depremapp - Ana sayfaya buton ekle

DİĞER KOMUTLAR: /start, /help, /projects, /status, /deploy, /health
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
from typing import List, Optional, Dict, Any
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

# ── Environment ──────────────────────────────────────────
env_path = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(dotenv_path=env_path)

TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY")
TELEGRAM_CHAT_ID = os.getenv("TELEGRAM_CHAT_ID")
GITHUB_USERNAME = os.getenv("GITHUB_USERNAME", "bendedo13")
GITHUB_TOKEN = os.getenv("GITHUB_TOKEN", "")
BASE_DIR = Path("/opt")

# Güvenlik: Sadece izin verilen chat ID'ler
ALLOWED_CHAT_IDS: set = set()
raw_ids = os.getenv("ALLOWED_CHAT_IDS", "")
if raw_ids:
    ALLOWED_CHAT_IDS = {int(x.strip()) for x in raw_ids.split(",") if x.strip()}
if TELEGRAM_CHAT_ID:
    ALLOWED_CHAT_IDS.add(int(TELEGRAM_CHAT_ID))

# ── Logging ──────────────────────────────────────────────
logging.basicConfig(
    format="%(asctime)s [%(levelname)s] %(message)s",
    level=logging.INFO,
)
logger = logging.getLogger("bot")

# ── Anthropic Client ─────────────────────────────────────
client: Optional[Anthropic] = None
if ANTHROPIC_API_KEY:
    client = Anthropic(api_key=ANTHROPIC_API_KEY)
else:
    logger.warning("ANTHROPIC_API_KEY bulunamadı — AI devre dışı.")

# ── Claude Model Listesi (güncel, çalışan modeller) ──────
MODELS_PRIMARY = ["claude-sonnet-4-6", "claude-haiku-4-5-20251001"]
MODELS_FAST = ["claude-haiku-4-5-20251001", "claude-sonnet-4-6"]

# ── Proje Yapılandırmaları ───────────────────────────────
PROJECT_CONFIGS: Dict[str, dict] = {
    "eyeoftrv2": {
        "path": BASE_DIR / "eye-of-tr-v2",
        "github_repo": f"{GITHUB_USERNAME}/eye-of-tr-v2",
        "deploy_script": "deploy.sh",
        "test_commands": ["npm run build"],
        "health_check": "http://localhost:3000",
        "branch": "main",
        "description": "Eye of TR - Web Uygulaması",
        "extensions": [".ts", ".tsx", ".js", ".jsx", ".css", ".html", ".json"],
        "short_cmd": "eye",
    },
    "depremapp": {
        "path": BASE_DIR / "deprem-appp",
        "github_repo": f"{GITHUB_USERNAME}/deprem-appp",
        "deploy_script": "deploy/PRODUCTION_DEPLOY.sh",
        "test_commands": ["docker compose -f deploy/docker-compose.prod.yml ps"],
        "health_check": "http://localhost:8001/health",
        "branch": "main",
        "description": "Deprem App - Mobil + Backend",
        "extensions": [".py", ".ts", ".tsx", ".js", ".json"],
        "short_cmd": "deprem",
    },
    "astroloji": {
        "path": BASE_DIR / "astroloji",
        "github_repo": f"{GITHUB_USERNAME}/astroloji",
        "deploy_script": "deploy.sh",
        "test_commands": ["npm run build"],
        "health_check": "http://localhost:3002",
        "branch": "main",
        "description": "Astroloji - Web Uygulaması",
        "extensions": [".ts", ".tsx", ".js", ".jsx", ".css", ".html", ".json"],
        "short_cmd": "astro",
    },
}

PROJECT_ALIASES: Dict[str, str] = {
    "eyeoftr": "eyeoftrv2",
    "eye": "eyeoftrv2",
    "deprem": "depremapp",
    "deprem-appp": "depremapp",
    "depremappp": "depremapp",
    "astro": "astroloji",
}

# Dinamik projeler (yeni oluşturulanlar) dosyadan yüklenir
DYNAMIC_PROJECTS_FILE = Path(__file__).resolve().parent / "dynamic_projects.json"


def load_dynamic_projects():
    """Disk'ten dinamik proje listesini yükle."""
    if DYNAMIC_PROJECTS_FILE.exists():
        try:
            data = json.loads(DYNAMIC_PROJECTS_FILE.read_text())
            for name, cfg in data.items():
                cfg["path"] = Path(cfg["path"])
                PROJECT_CONFIGS[name] = cfg
                PROJECT_ALIASES[cfg.get("short_cmd", name)] = name
            logger.info(f"Dinamik projeler yüklendi: {list(data.keys())}")
        except Exception as e:
            logger.error(f"Dinamik proje yükleme hatası: {e}")


def save_dynamic_project(name: str, config: dict):
    """Yeni projeyi disk'e kaydet."""
    existing = {}
    if DYNAMIC_PROJECTS_FILE.exists():
        try:
            existing = json.loads(DYNAMIC_PROJECTS_FILE.read_text())
        except Exception:
            pass
    save_cfg = dict(config)
    save_cfg["path"] = str(config["path"])
    existing[name] = save_cfg
    DYNAMIC_PROJECTS_FILE.write_text(json.dumps(existing, indent=2, ensure_ascii=False))


# Başlangıçta dinamik projeleri yükle
load_dynamic_projects()


# ════════════════════════════════════════════════════════════
# YARDIMCI FONKSİYONLAR
# ════════════════════════════════════════════════════════════

def resolve_project(name: str) -> Optional[str]:
    """Proje ismini veya takma adını standart isme çevir."""
    name = name.strip().lower().replace(" ", "").replace("-", "")
    if name in PROJECT_CONFIGS:
        return name
    # Aliaslardan bak
    for alias, proj in PROJECT_ALIASES.items():
        if name == alias.replace("-", "").replace(" ", ""):
            return proj
    return None


def is_authorized(chat_id: int) -> bool:
    if not ALLOWED_CHAT_IDS:
        return True
    return chat_id in ALLOWED_CHAT_IDS


def is_question_task(task: str) -> bool:
    """Görevin soru/analiz mi yoksa kod yazma mı olduğunu belirle."""
    task_lower = task.lower()
    question_indicators = [
        "?", "listele", "göster", "analiz et", "kontrol et", "incele",
        "ne var", "neler var", "nasıl", "neden", "açıkla", "özetle",
        "rapor ver", "durum ne", "hangi", "hata var mı", "sorun ne",
        "ne yapılmış", "bilgi ver", "karşılaştır",
    ]
    return any(indicator in task_lower for indicator in question_indicators)


async def run_cmd(command: str, cwd: Path, timeout: int = 120) -> tuple:
    """Shell komutu çalıştır, (stdout, stderr, returncode) döndür."""
    try:
        process = await asyncio.create_subprocess_shell(
            command,
            cwd=str(cwd),
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        stdout, stderr = await asyncio.wait_for(
            process.communicate(), timeout=timeout
        )
        return stdout.decode().strip(), stderr.decode().strip(), process.returncode
    except asyncio.TimeoutError:
        return "", f"Zaman aşımı ({timeout}s)", 1
    except Exception as e:
        return "", str(e), 1


async def safe_send(bot, chat_id: int, text: str, parse_mode: str = None):
    """Telegram mesajı gönder. Hata olursa düz metin gönder. Uzun mesajları böl."""
    max_len = 4000
    if len(text) <= max_len:
        try:
            await bot.send_message(chat_id=chat_id, text=text, parse_mode=parse_mode)
        except Exception:
            try:
                await bot.send_message(chat_id=chat_id, text=text)
            except Exception as e:
                logger.error(f"Mesaj gönderilemedi: {e}")
        return

    parts = []
    remaining = text
    while remaining:
        if len(remaining) <= max_len:
            parts.append(remaining)
            break
        idx = remaining.rfind("\n", 0, max_len)
        if idx == -1:
            idx = max_len
        parts.append(remaining[:idx])
        remaining = remaining[idx:].lstrip("\n")

    for i, part in enumerate(parts):
        try:
            await bot.send_message(chat_id=chat_id, text=part, parse_mode=parse_mode)
        except Exception:
            try:
                await bot.send_message(chat_id=chat_id, text=part)
            except Exception as e:
                logger.error(f"Mesaj parçası gönderilemedi: {e}")
        if i < len(parts) - 1:
            await asyncio.sleep(0.5)


# ════════════════════════════════════════════════════════════
# PROJE DOSYA OKUMA
# ════════════════════════════════════════════════════════════

SKIP_DIRS = {
    "venv", "node_modules", ".git", "__pycache__", "dist", "build",
    ".expo", ".next", "coverage", ".cache", "android", "ios",
}


async def read_project_files(project_path: Path, extensions: List[str]) -> str:
    """Projedeki kaynak dosyalarını oku ve birleştir."""
    file_contents = []
    total_size = 0
    max_total = 200_000

    try:
        for ext in extensions:
            for fpath in sorted(project_path.rglob(f"*{ext}")):
                if any(skip in fpath.parts for skip in SKIP_DIRS):
                    continue
                if fpath.name in ("package-lock.json", "yarn.lock", "pnpm-lock.yaml"):
                    continue
                try:
                    content = fpath.read_text(encoding="utf-8", errors="ignore")
                    if len(content) > 30_000:
                        content = content[:30_000] + "\n... (kırpıldı)"
                    rel = fpath.relative_to(project_path)
                    file_contents.append(f"--- {rel} ---\n{content}\n")
                    total_size += len(content)
                    if total_size > max_total:
                        break
                except Exception:
                    pass
            if total_size > max_total:
                break
    except Exception as e:
        logger.error(f"Dosya tarama hatası: {e}")

    return "\n".join(file_contents)


# ════════════════════════════════════════════════════════════
# CLAUDE AI
# ════════════════════════════════════════════════════════════

def pick_models(task: str, context_size: int) -> List[str]:
    """Görevin karmaşıklığına göre model sırasını seç."""
    complex_kw = [
        "api", "database", "auth", "security", "algorithm", "refactor",
        "architecture", "migration", "integration", "entegrasyon",
        "veritabanı", "güvenlik", "mimari", "karmaşık", "sistem",
        "performance", "optimization", "docker", "deploy", "oluştur",
        "yeni proje", "sıfırdan",
    ]
    if any(kw in task.lower() for kw in complex_kw) or context_size > 50_000:
        return MODELS_PRIMARY
    return MODELS_FAST


async def ask_claude_code(task: str, context: str, project_name: str) -> tuple:
    """Claude'a KOD YAZMA görevi gönder."""
    if not client:
        raise RuntimeError("Anthropic API anahtarı eksik!")

    models = pick_models(task, len(context))

    system_prompt = """Sen uzman bir yazılım geliştiricisin. Verilen proje dosyalarını ve görevi analiz ederek gerekli kod değişikliklerini yap.

KURALLAR:
1. Sadece gerekli değişiklikleri yap.
2. Kod kalitesine dikkat et.
3. Türkçe yorum satırları ekle.
4. Dosyaları güncellemek için şu formatı kullan:

<file path="relative/path/to/file.ext">
... dosyanın tam yeni içeriği ...
</file>

<explanation>
- Değişiklik açıklaması
</explanation>

5. Sadece değişen veya yeni dosyaları döndür.
6. Test edilebilir, çalışır kod yaz.
7. Güvenlik açığı bırakma.
8. HER ZAMAN en az bir <file> bloğu döndür. Eğer yeni dosya gerekiyorsa oluştur."""

    max_ctx = 180_000
    user_prompt = f"""PROJE: {project_name}
GÖREV: {task}

MEVCUT DOSYALAR:
{context[:max_ctx]}

Lütfen görevi yerine getirmek için gerekli kod değişikliklerini <file> formatında üret."""

    return await _call_claude(models, system_prompt, user_prompt)


async def ask_claude_question(task: str, context: str, project_name: str) -> tuple:
    """Claude'a SORU/ANALİZ görevi gönder (kod yazmadan cevap)."""
    if not client:
        raise RuntimeError("Anthropic API anahtarı eksik!")

    models = MODELS_FAST

    system_prompt = """Sen uzman bir yazılım danışmanısın. Verilen proje dosyalarını analiz ederek soruları Türkçe cevapla.

KURALLAR:
1. Kısa ve öz cevap ver (Telegram mesajı olacak).
2. Maddeler halinde yaz.
3. Teknik detay ver ama anlaşılır ol.
4. Emoji kullan (az).
5. Maksimum 3000 karakter."""

    max_ctx = 150_000
    user_prompt = f"""PROJE: {project_name}
SORU: {task}

PROJE DOSYALARI:
{context[:max_ctx]}

Türkçe ve kısa cevap ver."""

    return await _call_claude(models, system_prompt, user_prompt)


async def ask_claude_new_project(project_name: str, description: str, tech_stack: str) -> tuple:
    """Claude'a YENİ PROJE oluşturma görevi gönder."""
    if not client:
        raise RuntimeError("Anthropic API anahtarı eksik!")

    models = MODELS_PRIMARY

    system_prompt = """Sen uzman bir yazılım mimarısın. Sıfırdan proje oluşturuyorsun.

KURALLAR:
1. Profesyonel, production-ready proje yapısı oluştur.
2. Her dosyayı <file> formatında ver.
3. package.json, tsconfig, config dosyaları dahil et.
4. README.md ekle.
5. .gitignore ekle.
6. Temel komponentleri, sayfaları ve API yapısını oluştur.
7. Türkçe yorumlar ekle.

Format:
<file path="relative/path/to/file.ext">
... dosya içeriği ...
</file>

<explanation>
- Proje yapısı açıklaması
</explanation>"""

    user_prompt = f"""YENİ PROJE OLUŞTUR

Proje Adı: {project_name}
Açıklama: {description}
Teknoloji: {tech_stack}

Tam bir proje yapısı oluştur. Tüm gerekli dosyaları <file> formatında ver.
En az şunları içersin: package.json, config dosyaları, ana komponentler, README.md, .gitignore"""

    return await _call_claude(models, system_prompt, user_prompt)


async def _call_claude(models: List[str], system_prompt: str, user_prompt: str) -> tuple:
    """Claude API çağrısı — model fallback ile."""
    last_error = None
    for model in models:
        try:
            logger.info(f"Model deneniyor: {model}")
            msg = client.messages.create(
                model=model,
                max_tokens=64000,
                temperature=0,
                system=system_prompt,
                messages=[{"role": "user", "content": user_prompt}],
            )
            logger.info(f"Model başarılı: {model}")
            return msg.content[0].text, model
        except Exception as e:
            last_error = e
            logger.warning(f"Model {model} başarısız: {e}")
            continue

    raise RuntimeError(f"Tüm modeller başarısız. Son hata: {last_error}")


def extract_file_changes(response: str, project_path: Path) -> List[dict]:
    """Claude cevabından <file> bloklarını çıkar ve dosyalara yaz."""
    changes = []
    file_pattern = r'<file path="(.*?)">\s*(.*?)\s*</file>'
    file_matches = list(re.finditer(file_pattern, response, re.DOTALL))
    exp_pattern = r"<explanation>\s*(.*?)\s*</explanation>"
    explanations = re.findall(exp_pattern, response, re.DOTALL)

    for idx, match in enumerate(file_matches):
        rel_path = match.group(1).strip()
        content = match.group(2)
        full_path = project_path / rel_path

        # Güvenlik: proje dışına yazma engeli
        try:
            full_path.resolve().relative_to(project_path.resolve())
        except ValueError:
            logger.warning(f"GÜVENLİK: Proje dışı yazım engellendi: {rel_path}")
            continue

        full_path.parent.mkdir(parents=True, exist_ok=True)
        full_path.write_text(content, encoding="utf-8")

        explanation = explanations[idx].strip() if idx < len(explanations) else "Dosya güncellendi"
        changes.append({"file": rel_path, "description": explanation})
        logger.info(f"Dosya yazıldı: {rel_path}")

    return changes


# ════════════════════════════════════════════════════════════
# GIT İŞLEMLERİ
# ════════════════════════════════════════════════════════════

async def get_current_branch(project_path: Path) -> str:
    out, _, code = await run_cmd("git branch --show-current", project_path)
    return out.strip() if code == 0 and out.strip() else "main"


async def git_init_and_push(project_path: Path, repo_name: str) -> dict:
    """Yeni proje için git init + ilk commit + GitHub repo oluştur + push."""
    result = {"hash": "", "branch": "main", "pushed": False, "error": "", "repo_url": ""}

    # Git init
    await run_cmd("git init", project_path)
    await run_cmd('git config user.name "AI Bot"', project_path)
    await run_cmd('git config user.email "bot@ai-developer.local"', project_path)
    await run_cmd("git add -A", project_path)

    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M")
    _, stderr, code = await run_cmd(
        f'git commit -m "Initial commit — AI Bot [{timestamp}]"', project_path
    )
    if code != 0:
        result["error"] = f"commit_failed: {stderr[:200]}"
        return result

    out, _, _ = await run_cmd("git rev-parse HEAD", project_path)
    result["hash"] = out.strip()

    # GitHub repo oluştur (gh CLI veya API)
    github_repo = f"{GITHUB_USERNAME}/{repo_name}"
    result["repo_url"] = f"https://github.com/{github_repo}"

    # gh CLI ile repo oluştur
    _, stderr, code = await run_cmd(
        f'gh repo create {github_repo} --public --source=. --remote=origin --push',
        project_path, timeout=60
    )
    if code == 0:
        result["pushed"] = True
        result["branch"] = "main"
        logger.info(f"GitHub repo oluşturuldu: {github_repo}")
        return result

    # gh CLI başarısız — GitHub API ile dene
    if GITHUB_TOKEN:
        logger.info("gh CLI başarısız, GitHub API deneniyor...")
        create_cmd = (
            f'curl -s -X POST -H "Authorization: token {GITHUB_TOKEN}" '
            f'-H "Accept: application/vnd.github.v3+json" '
            f'https://api.github.com/user/repos '
            f'-d \'{{"name":"{repo_name}","private":false}}\''
        )
        _, _, code = await run_cmd(create_cmd, project_path, timeout=30)

        if code == 0:
            # Remote ekle ve push et
            remote_url = f"https://{GITHUB_TOKEN}@github.com/{github_repo}.git"
            await run_cmd(f"git remote add origin {remote_url}", project_path)

            for attempt in range(3):
                _, stderr, code = await run_cmd("git push -u origin main", project_path, timeout=60)
                if code == 0:
                    result["pushed"] = True
                    break
                await asyncio.sleep(2 ** (attempt + 1))

            if not result["pushed"]:
                result["error"] = f"push_failed: {stderr[:200]}"
        else:
            result["error"] = "GitHub repo oluşturulamadı (gh CLI ve API başarısız)"
    else:
        # Token yok — sadece lokal git
        result["error"] = "GITHUB_TOKEN yok, repo sadece lokal"
        logger.warning("GITHUB_TOKEN eksik — GitHub repo oluşturulamadı")

    return result


async def git_commit_and_push(project_path: Path, task: str, config: dict) -> dict:
    """Mevcut proje: git add + commit + push."""
    result = {"hash": "", "branch": "", "pushed": False, "error": ""}

    branch = await get_current_branch(project_path)
    if not branch or branch == "HEAD":
        branch = config.get("branch", "main")
    result["branch"] = branch

    await run_cmd("git add -A", project_path)

    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M")
    safe_task = task[:80].replace('"', "'").replace('`', "'")
    commit_msg = f"AI Bot: {safe_task} [{timestamp}]"
    stdout, stderr, code = await run_cmd(f'git commit -m "{commit_msg}"', project_path)

    if code != 0:
        combined = stdout + stderr
        if "nothing to commit" in combined:
            result["error"] = "nothing_to_commit"
        else:
            result["error"] = f"commit_failed: {stderr[:200]}"
        return result

    out, _, _ = await run_cmd("git rev-parse HEAD", project_path)
    result["hash"] = out.strip()

    # Push (retry 4x, exponential backoff)
    for attempt in range(4):
        _, stderr, code = await run_cmd(
            f"git push origin {branch}", project_path, timeout=60
        )
        if code == 0:
            result["pushed"] = True
            logger.info(f"Push başarılı: {branch}")
            break
        wait = 2 ** (attempt + 1)
        logger.warning(f"Push {attempt+1}/4 başarısız, {wait}s bekleniyor...")
        await asyncio.sleep(wait)

    if not result["pushed"]:
        result["error"] = f"push_failed: {stderr[:200]}"

    return result


async def ensure_cloned(project_path: Path, config: dict, bot, chat_id: int) -> bool:
    """Proje yoksa clone et, varsa pull."""
    if project_path.exists():
        await run_cmd(f"git pull origin {config.get('branch', 'main')}", project_path, timeout=60)
        return True

    repo = config.get("github_repo", "")
    if not repo:
        return False

    await safe_send(bot, chat_id, f"📥 Proje clone ediliyor: {repo}")
    _, stderr, code = await run_cmd(
        f"git clone https://github.com/{repo}.git {project_path}",
        Path("/opt"), timeout=120
    )
    if code != 0:
        await safe_send(bot, chat_id, f"❌ Clone başarısız: {stderr[:300]}")
        return False
    await safe_send(bot, chat_id, "✅ Clone tamamlandı")
    return True


# ════════════════════════════════════════════════════════════
# TEST VE HEALTH CHECK
# ════════════════════════════════════════════════════════════

async def run_tests(project_path: Path, test_commands: List[str]) -> List[dict]:
    results = []
    for cmd in test_commands:
        stdout, stderr, code = await run_cmd(cmd, project_path, timeout=180)
        results.append({
            "name": cmd,
            "passed": code == 0,
            "output": (stdout or stderr)[:300],
        })
    return results


async def check_health(url: str) -> dict:
    stdout, _, _ = await run_cmd(
        f'curl -sf -o /dev/null -w "%{{http_code}}" --connect-timeout 10 {url}',
        Path.cwd(), timeout=20,
    )
    http_code = stdout.strip()
    passed = http_code in ("200", "301", "302")
    return {"name": f"Health ({url})", "passed": passed, "output": f"HTTP {http_code}"}


# ════════════════════════════════════════════════════════════
# RAPOR OLUŞTURMA
# ════════════════════════════════════════════════════════════

def build_report(
    task: str,
    project_name: str,
    model_used: str,
    changes: List[dict],
    test_results: List[dict],
    health_result: Optional[dict],
    git_result: dict,
    elapsed_seconds: float,
    errors: List[str],
    task_type: str = "code",
) -> str:
    """Telegram rapor mesajı oluştur."""
    minutes = int(elapsed_seconds // 60)
    seconds = int(elapsed_seconds % 60)

    has_errors = bool(errors) or (task_type == "code" and not git_result.get("pushed", False))
    status_icon = "✅" if not has_errors else "⚠️"
    status_text = "BASARILI" if not has_errors else "HATALAR MEVCUT"

    type_labels = {"code": "KOD", "question": "ANALİZ", "new_project": "YENİ PROJE"}
    type_label = type_labels.get(task_type, "GÖREV")

    report = f"🤖 {type_label} RAPORU\n{'━' * 20}\n"
    report += f"📌 {task[:200]}\n"
    report += f"📂 {project_name} | ⏱️ {minutes}dk {seconds}s\n"
    report += f"🧠 {model_used}\n"
    report += f"🎯 {status_icon} {status_text}\n\n"

    if changes:
        report += f"📂 Dosyalar ({len(changes)}):\n"
        for c in changes[:15]:
            report += f"  ✏️ {c['file']}\n"
        if len(changes) > 15:
            report += f"  ... ve {len(changes) - 15} dosya daha\n"
        report += "\n"

    all_tests = list(test_results)
    if health_result:
        all_tests.append(health_result)
    if all_tests:
        passed = sum(1 for t in all_tests if t["passed"])
        report += f"🧪 Testler ({passed}/{len(all_tests)}):\n"
        for t in all_tests:
            icon = "✅" if t["passed"] else "❌"
            report += f"  {icon} {t['name']}\n"
        report += "\n"

    commit_hash = git_result.get("hash", "")
    branch = git_result.get("branch", "?")
    pushed = git_result.get("pushed", False)

    if commit_hash:
        commit_short = commit_hash[:8]
        push_icon = "✅" if pushed else "❌"
        report += f"💾 Commit: {commit_short} | Branch: {branch}\n"
        report += f"   Push: {push_icon}\n"

    # GitHub linki — sadece push başarılıysa
    if pushed and commit_hash and len(commit_hash) >= 7:
        github_repo = git_result.get("repo_url") or ""
        if not github_repo:
            github_repo_name = PROJECT_CONFIGS.get(project_name, {}).get("github_repo", "")
            if github_repo_name:
                github_repo = f"https://github.com/{github_repo_name}"
        if github_repo:
            report += f"\n🔗 GitHub: {github_repo}/commit/{commit_hash}\n"

    if errors:
        report += "\n❌ Hatalar:\n"
        for err in errors[:5]:
            report += f"  • {err}\n"

    report += f"\n{'━' * 20}\n🕐 {datetime.now().strftime('%d.%m.%Y %H:%M')}"
    return report


# ════════════════════════════════════════════════════════════
# ANA GÖREV İŞLEYİCİLER
# ════════════════════════════════════════════════════════════

async def execute_task(bot, chat_id: int, project_name: str, task_description: str):
    """Mevcut proje üzerinde görev çalıştır — kod yazma veya soru cevaplama."""
    config = PROJECT_CONFIGS[project_name]
    project_path = config["path"]
    start_time = datetime.now()
    errors = []

    if not await ensure_cloned(project_path, config, bot, chat_id):
        return

    # Görev tipi belirle
    is_question = is_question_task(task_description)
    task_type = "question" if is_question else "code"

    type_label = "📖 Soru/Analiz" if is_question else "💻 Kod Yazma"
    await safe_send(
        bot, chat_id,
        f"🤖 Görev Alındı!\n📂 {project_name}\n🏷️ {type_label}\n📝 {task_description[:300]}\n⏳ İşlem başlıyor..."
    )

    changes = []
    test_results = []
    health_result = None
    git_result = {"hash": "", "branch": "", "pushed": False, "error": ""}
    model_used = "?"

    try:
        # 1. Dosyaları oku
        await safe_send(bot, chat_id, "🔍 Dosyalar okunuyor...")
        extensions = config.get("extensions", [".py", ".ts", ".tsx", ".js"])
        context_data = await read_project_files(project_path, extensions)
        if not context_data:
            await safe_send(bot, chat_id, "⚠️ Proje dosyası bulunamadı!")
            return

        if is_question:
            # ─── SORU/ANALİZ MODU ─────────────────
            await safe_send(bot, chat_id, "🧠 Claude analiz ediyor...")
            ai_response, model_used = await ask_claude_question(task_description, context_data, project_name)

            # Cevabı doğrudan gönder
            elapsed = (datetime.now() - start_time).total_seconds()
            header = f"📖 ANALİZ SONUCU\n{'━' * 20}\n📂 {project_name} | 🧠 {model_used}\n⏱️ {int(elapsed)}s\n\n"
            await safe_send(bot, chat_id, header + ai_response[:3500])
            return

        else:
            # ─── KOD YAZMA MODU ────────────────────
            await safe_send(bot, chat_id, "🧠 Claude kodluyor...")
            ai_response, model_used = await ask_claude_code(task_description, context_data, project_name)

            await safe_send(bot, chat_id, "📝 Değişiklikler uygulanıyor...")
            changes = extract_file_changes(ai_response, project_path)
            if not changes:
                # Claude cevap verdi ama <file> üretmedi — cevabı bilgi olarak gönder
                elapsed = (datetime.now() - start_time).total_seconds()
                text = (
                    f"📋 Claude cevap verdi ancak dosya değişikliği üretmedi.\n"
                    f"⏱️ {int(elapsed)}s | 🧠 {model_used}\n\n"
                    f"Cevap:\n{ai_response[:3000]}"
                )
                await safe_send(bot, chat_id, text)
                return

            # Git
            await safe_send(bot, chat_id, "💾 Git commit & push...")
            git_result = await git_commit_and_push(project_path, task_description, config)
            if git_result["error"]:
                errors.append(git_result["error"])

            # Test
            if config.get("test_commands"):
                await safe_send(bot, chat_id, "🧪 Testler çalışıyor...")
                test_results = await run_tests(project_path, config["test_commands"])

            # Health check
            if config.get("health_check"):
                await safe_send(bot, chat_id, "🏥 Health check...")
                health_result = await check_health(config["health_check"])

    except Exception as e:
        logger.error(f"Görev hatası: {e}", exc_info=True)
        errors.append(str(e)[:300])

    # Rapor
    elapsed = (datetime.now() - start_time).total_seconds()
    report = build_report(
        task=task_description,
        project_name=project_name,
        model_used=model_used,
        changes=changes,
        test_results=test_results,
        health_result=health_result,
        git_result=git_result,
        elapsed_seconds=elapsed,
        errors=errors,
        task_type=task_type,
    )
    await safe_send(bot, chat_id, report)


async def execute_new_project(bot, chat_id: int, project_name: str, description: str):
    """Sıfırdan yeni proje oluştur."""
    start_time = datetime.now()
    errors = []
    changes = []
    git_result = {"hash": "", "branch": "main", "pushed": False, "error": "", "repo_url": ""}
    model_used = "?"

    # Proje adını temizle
    safe_name = re.sub(r'[^a-zA-Z0-9_-]', '-', project_name.lower().strip())
    if not safe_name:
        await safe_send(bot, chat_id, "❌ Geçersiz proje adı!")
        return

    project_path = BASE_DIR / safe_name

    if project_path.exists():
        await safe_send(bot, chat_id, f"⚠️ {safe_name} zaten var! Farklı bir isim kullanın.")
        return

    # Teknoloji stack'i tahmin et
    desc_lower = description.lower()
    if any(kw in desc_lower for kw in ["react native", "mobil", "mobile", "expo", "uygulama"]):
        tech_stack = "React Native (Expo) + TypeScript"
    elif any(kw in desc_lower for kw in ["next", "nextjs"]):
        tech_stack = "Next.js + TypeScript + Tailwind CSS"
    elif any(kw in desc_lower for kw in ["python", "django", "flask", "fastapi"]):
        tech_stack = "Python + FastAPI"
    elif any(kw in desc_lower for kw in ["vue", "nuxt"]):
        tech_stack = "Vue.js + TypeScript"
    else:
        tech_stack = "React + TypeScript + Vite + Tailwind CSS"

    await safe_send(
        bot, chat_id,
        f"🆕 Yeni Proje Oluşturuluyor!\n"
        f"📂 {safe_name}\n"
        f"🔧 {tech_stack}\n"
        f"📝 {description[:200]}\n"
        f"⏳ Claude proje yapısı oluşturuyor..."
    )

    try:
        # 1. Claude'dan proje yapısı al
        ai_response, model_used = await ask_claude_new_project(safe_name, description, tech_stack)

        # 2. Proje dizinini oluştur
        project_path.mkdir(parents=True, exist_ok=True)

        # 3. Dosyaları yaz
        await safe_send(bot, chat_id, "📝 Dosyalar oluşturuluyor...")
        changes = extract_file_changes(ai_response, project_path)

        if not changes:
            await safe_send(bot, chat_id, "⚠️ Proje dosyaları oluşturulamadı. Tekrar deneyin.")
            return

        # 4. Git init + push
        await safe_send(bot, chat_id, "💾 Git repo oluşturuluyor ve push ediliyor...")
        git_result = await git_init_and_push(project_path, safe_name)
        if git_result["error"]:
            errors.append(git_result["error"])

        # 5. npm install (package.json varsa)
        pkg_json = project_path / "package.json"
        if pkg_json.exists():
            await safe_send(bot, chat_id, "📦 npm install çalışıyor...")
            _, stderr, code = await run_cmd("npm install", project_path, timeout=180)
            if code != 0:
                errors.append(f"npm install hatası: {stderr[:200]}")

        # 6. Dinamik proje kaydı
        new_config = {
            "path": project_path,
            "github_repo": f"{GITHUB_USERNAME}/{safe_name}",
            "deploy_script": "deploy.sh",
            "test_commands": ["npm run build"] if pkg_json.exists() else [],
            "health_check": "",
            "branch": "main",
            "description": description[:100],
            "extensions": [".ts", ".tsx", ".js", ".jsx", ".py", ".css", ".html", ".json"],
            "short_cmd": safe_name[:10],
        }
        PROJECT_CONFIGS[safe_name] = new_config
        PROJECT_ALIASES[safe_name] = safe_name
        save_dynamic_project(safe_name, new_config)

    except Exception as e:
        logger.error(f"Yeni proje hatası: {e}", exc_info=True)
        errors.append(str(e)[:300])

    # Rapor
    elapsed = (datetime.now() - start_time).total_seconds()
    report = build_report(
        task=f"Yeni proje oluştur: {description}",
        project_name=safe_name,
        model_used=model_used,
        changes=changes,
        test_results=[],
        health_result=None,
        git_result=git_result,
        elapsed_seconds=elapsed,
        errors=errors,
        task_type="new_project",
    )

    # Kullanım bilgisi ekle
    report += f"\n\n💡 Kullanım: /{safe_name[:10]} [görev] ile bu projede görev verebilirsiniz."
    await safe_send(bot, chat_id, report)


# ════════════════════════════════════════════════════════════
# TELEGRAM KOMUTLARI
# ════════════════════════════════════════════════════════════

async def cmd_start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if not is_authorized(update.effective_chat.id):
        await update.message.reply_text("⛔ Yetkiniz yok.")
        return
    text = (
        "🤖 AI Developer Bot v4\n\n"
        "Kod Yazma:\n"
        "  /deprem Ana sayfaya buton ekle\n"
        "  /eye Login sayfasını güncelle\n"
        "  /astro Burç detay sayfası ekle\n\n"
        "Soru/Analiz:\n"
        "  /deprem Projedeki hataları listele?\n\n"
        "Yeni Proje:\n"
        "  /yeni myapp React Native ile yapılacaklar uygulaması\n\n"
        "Komutlar: /help /projects /status /health /deploy"
    )
    await update.message.reply_text(text)


async def cmd_help(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if not is_authorized(update.effective_chat.id):
        return
    text = (
        "📖 Kullanım Kılavuzu\n\n"
        "💻 Kod Yazma:\n"
        "  /deprem [görev] — Deprem App'te kod yaz\n"
        "  /eye [görev] — Eye of TR'de kod yaz\n"
        "  /astro [görev] — Astroloji'de kod yaz\n"
        "  Görev: deprem - [açıklama]\n\n"
        "📖 Soru/Analiz (görevde ? veya 'listele' olsun):\n"
        "  /deprem Bu projedeki hatalar neler?\n"
        "  /eye Mevcut sayfaları listele\n\n"
        "🆕 Yeni Proje:\n"
        "  /yeni proje-adi Proje açıklaması\n"
        "  /yeni myshop E-ticaret sitesi React ile\n\n"
        "🔧 Sistem:\n"
        "  /projects — Proje listesi\n"
        "  /status — Sistem durumu\n"
        "  /health — Health check\n"
        "  /deploy [proje] — Manuel deploy\n\n"
        "Akış: Dosya oku → Claude AI → Kod/Cevap → Git push → Test → Rapor"
    )
    await update.message.reply_text(text)


async def cmd_projects(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if not is_authorized(update.effective_chat.id):
        return
    text = "📂 Projeler:\n\n"
    for name, cfg in PROJECT_CONFIGS.items():
        exists = "✅" if cfg["path"].exists() else "❌"
        short = cfg.get("short_cmd", name)
        text += f"{name} (/{short})\n  {cfg.get('description', '')}\n  {exists} {cfg['path']}\n\n"
    await update.message.reply_text(text)


async def cmd_status(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if not is_authorized(update.effective_chat.id):
        return
    api_status = "✅" if client else "❌"
    text = f"📊 Sistem Durumu\n🤖 API: {api_status}\n📋 Bot: v4\n\n"
    for name, cfg in PROJECT_CONFIGS.items():
        p = cfg["path"]
        exists = p.exists()
        short = cfg.get("short_cmd", name)
        text += f"{name} (/{short}): {'✅' if exists else '❌'}\n"
        if exists:
            out, _, code = await run_cmd("git log -1 --format='%h %s (%cr)'", p)
            if code == 0 and out:
                text += f"  {out[:80]}\n"
    await update.message.reply_text(text)


async def cmd_health(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if not is_authorized(update.effective_chat.id):
        return
    await update.message.reply_text("🔍 Health check yapılıyor...")
    text = "🏥 Health Check:\n\n"

    out, _, code = await run_cmd(
        "docker ps --format '{{.Names}}: {{.Status}}' 2>/dev/null", Path.cwd()
    )
    if code == 0 and out:
        text += "Docker:\n"
        for line in out.split("\n")[:10]:
            icon = "✅" if "Up" in line else "❌"
            text += f"  {icon} {line}\n"
        text += "\n"

    for name, cfg in PROJECT_CONFIGS.items():
        url = cfg.get("health_check")
        if url:
            result = await check_health(url)
            icon = "✅" if result["passed"] else "❌"
            text += f"{icon} {name}: {result['output']}\n"

    await update.message.reply_text(text)


async def cmd_deploy(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if not is_authorized(update.effective_chat.id):
        return
    args = context.args
    if not args:
        await update.message.reply_text("Kullanım: /deploy deprem")
        return

    project_name = resolve_project(args[0])
    if not project_name:
        await update.message.reply_text(f"❌ Bilinmeyen proje: {args[0]}")
        return

    cfg = PROJECT_CONFIGS[project_name]
    await update.message.reply_text(f"🚀 {project_name} deploy ediliyor...")

    if cfg["path"].exists():
        await run_cmd(f"git pull origin {cfg.get('branch', 'main')}", cfg["path"])

    deploy_script = cfg["path"] / cfg.get("deploy_script", "deploy.sh")
    deploy_ok = False
    if deploy_script.exists():
        _, _, code = await run_cmd(f"bash {deploy_script}", cfg["path"], timeout=600)
        deploy_ok = code == 0

    health_ok = False
    if cfg.get("health_check"):
        result = await check_health(cfg["health_check"])
        health_ok = result["passed"]

    text = f"🚀 Deploy: {'✅' if deploy_ok else '❌'}\n🏥 Health: {'✅' if health_ok else '❌'}"
    await update.message.reply_text(text)


# ════════════════════════════════════════════════════════════
# /yeni KOMUTU — YENİ PROJE OLUŞTURMA
# ════════════════════════════════════════════════════════════

async def cmd_new_project(update: Update, context: ContextTypes.DEFAULT_TYPE):
    chat_id = update.effective_chat.id
    if not is_authorized(chat_id):
        await update.message.reply_text("⛔ Yetkiniz yok.")
        return

    full_text = update.message.text[len("/yeni"):].strip()
    if not full_text:
        await update.message.reply_text(
            "🆕 Yeni Proje Oluştur\n\n"
            "Kullanım: /yeni proje-adi Proje açıklaması\n\n"
            "Örnekler:\n"
            "  /yeni myshop E-ticaret sitesi React ile\n"
            "  /yeni todoapp React Native yapılacaklar uygulaması\n"
            "  /yeni blog Next.js ile kişisel blog sitesi\n"
            "  /yeni api FastAPI ile REST API servisi"
        )
        return

    # İlk kelime proje adı, geri kalanı açıklama
    parts = full_text.split(None, 1)
    proj_name = parts[0]
    description = parts[1] if len(parts) > 1 else proj_name

    await execute_new_project(context.bot, chat_id, proj_name, description)


# ════════════════════════════════════════════════════════════
# PROJE KOMUT HANDLER (/deprem, /eye, /astro, + dinamik)
# ════════════════════════════════════════════════════════════

async def cmd_project_task(update: Update, context: ContextTypes.DEFAULT_TYPE):
    chat_id = update.effective_chat.id
    if not is_authorized(chat_id):
        await update.message.reply_text("⛔ Yetkiniz yok.")
        return

    command = update.message.text.split()[0].lstrip("/").lower()
    project_name = resolve_project(command)
    if not project_name:
        await update.message.reply_text(f"❌ Bilinmeyen komut: /{command}")
        return

    task_text = update.message.text[len(f"/{command}"):].strip()
    if not task_text:
        cfg = PROJECT_CONFIGS[project_name]
        await update.message.reply_text(
            f"📂 {project_name}\n\n"
            f"Kullanım: /{command} [görev]\n"
            f"Örnek: /{command} Ana sayfaya buton ekle\n"
            f"Soru: /{command} Bu projedeki hatalar neler?"
        )
        return

    await execute_task(context.bot, chat_id, project_name, task_text)


# ════════════════════════════════════════════════════════════
# METİN GÖREV HANDLER
# ════════════════════════════════════════════════════════════

async def handle_task_message(update: Update, context: ContextTypes.DEFAULT_TYPE):
    msg = update.message.text
    chat_id = update.effective_chat.id
    if not is_authorized(chat_id):
        return
    if not msg.lower().startswith("görev:"):
        return

    try:
        _, content = msg.split(":", 1)
        if "-" not in content:
            raise ValueError()
        project_raw, task_description = content.split("-", 1)
        project_raw = project_raw.strip()
        task_description = task_description.strip()
        if not task_description:
            raise ValueError()
    except ValueError:
        await update.message.reply_text(
            "⚠️ Kullanım:\n"
            "  Görev: deprem - açıklama\n"
            "  /deprem açıklama\n"
            "  /yeni proje-adi açıklama"
        )
        return

    # "yeni" / "yeni proje" kontrolü
    if project_raw.lower() in ("yeni", "yeni proje", "new"):
        parts = task_description.split(None, 1)
        proj_name = parts[0] if parts else "new-project"
        description = parts[1] if len(parts) > 1 else task_description
        await execute_new_project(context.bot, chat_id, proj_name, description)
        return

    project_name = resolve_project(project_raw)
    if not project_name:
        names = ", ".join(f"/{c.get('short_cmd', n)}" for n, c in PROJECT_CONFIGS.items())
        await update.message.reply_text(
            f"❌ Bilinmeyen proje: {project_raw}\nKomutlar: {names}\nYeni proje: /yeni proje-adi açıklama"
        )
        return

    await execute_task(context.bot, chat_id, project_name, task_description)


# ════════════════════════════════════════════════════════════
# BOT BAŞLATMA — 409 CONFLICT FIX
# ════════════════════════════════════════════════════════════

async def post_init(application):
    """Bot başlatıldıktan sonra komut listesini ayarla."""
    commands = [
        BotCommand("start", "Bot'u başlat"),
        BotCommand("help", "Kullanım kılavuzu"),
        BotCommand("yeni", "Yeni proje oluştur"),
        BotCommand("deprem", "Deprem App görevi"),
        BotCommand("eye", "Eye of TR görevi"),
        BotCommand("astro", "Astroloji görevi"),
        BotCommand("projects", "Proje listesi"),
        BotCommand("status", "Sistem durumu"),
        BotCommand("health", "Health check"),
        BotCommand("deploy", "Manuel deploy"),
    ]
    await application.bot.set_my_commands(commands)
    logger.info("Bot komutları kaydedildi.")


def force_kill_old_instances():
    """
    Çakışan bot process'lerini kesinlikle durdur.
    SIGTERM sonra SIGKILL — 409 Conflict'i önler.
    """
    my_pid = os.getpid()
    killed = []

    try:
        result = subprocess.run(
            ["pgrep", "-f", "ai_developer_bot.py"],
            capture_output=True, text=True, timeout=5
        )
        if not result.stdout:
            return

        for line in result.stdout.strip().split("\n"):
            try:
                pid = int(line.strip())
            except ValueError:
                continue
            if pid == my_pid:
                continue

            # 1. SIGTERM
            try:
                os.kill(pid, signal.SIGTERM)
                killed.append(pid)
                logger.warning(f"SIGTERM gönderildi: PID {pid}")
            except (ProcessLookupError, PermissionError):
                continue

        if killed:
            _time.sleep(3)

            # 2. Hala yaşıyorsa SIGKILL
            for pid in killed:
                try:
                    os.kill(pid, 0)  # Yaşıyor mu kontrol
                    os.kill(pid, signal.SIGKILL)
                    logger.warning(f"SIGKILL gönderildi: PID {pid}")
                except (ProcessLookupError, PermissionError):
                    pass

            _time.sleep(2)

    except Exception as e:
        logger.debug(f"Process kontrol hatası: {e}")

    # 3. Son çare: pkill
    try:
        subprocess.run(
            ["pkill", "-9", "-f", "ai_developer_bot.py"],
            capture_output=True, timeout=5
        )
    except Exception:
        pass

    if killed:
        _time.sleep(2)
        logger.info(f"Eski bot process'leri temizlendi: {killed}")


async def clean_webhook():
    """Webhook çakışmasını temizle + bekleyen güncellemeleri düşür."""
    import httpx
    try:
        async with httpx.AsyncClient() as http:
            # Webhook temizle
            url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/deleteWebhook"
            resp = await http.post(url, params={"drop_pending_updates": True}, timeout=10)
            data = resp.json()
            if data.get("ok"):
                logger.info("Webhook temizlendi")

            # getUpdates ile offset'i sıfırla (409 fix)
            url2 = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/getUpdates"
            resp2 = await http.get(url2, params={"offset": -1, "timeout": 1}, timeout=10)
            data2 = resp2.json()
            if data2.get("ok") and data2.get("result"):
                last_id = data2["result"][-1]["update_id"]
                # Son update'i "okudum" olarak işaretle
                await http.get(url2, params={"offset": last_id + 1, "timeout": 1}, timeout=10)
                logger.info(f"Offset sıfırlandı: {last_id + 1}")

    except Exception as e:
        logger.warning(f"Webhook/offset temizleme hatası (devam ediliyor): {e}")


def main():
    if not TELEGRAM_BOT_TOKEN:
        logger.critical("TELEGRAM_BOT_TOKEN eksik!")
        sys.exit(1)

    # ─── 409 CONFLICT FIX ─────────────────────────
    # 1. Eski process'leri KESINLIKLE öldür
    force_kill_old_instances()

    # 2. Webhook temizle + offset sıfırla
    asyncio.run(clean_webhook())

    logger.info("=" * 50)
    logger.info("AI Developer Bot v4 başlatılıyor...")
    logger.info(f"Projeler: {', '.join(PROJECT_CONFIGS.keys())}")
    logger.info(f"Yetkili: {ALLOWED_CHAT_IDS or 'Herkese açık'}")
    logger.info("=" * 50)

    app = ApplicationBuilder().token(TELEGRAM_BOT_TOKEN).post_init(post_init).build()

    # Sistem komutları
    app.add_handler(CommandHandler("start", cmd_start))
    app.add_handler(CommandHandler("help", cmd_help))
    app.add_handler(CommandHandler("projects", cmd_projects))
    app.add_handler(CommandHandler("status", cmd_status))
    app.add_handler(CommandHandler("health", cmd_health))
    app.add_handler(CommandHandler("deploy", cmd_deploy))
    app.add_handler(CommandHandler("yeni", cmd_new_project))
    app.add_handler(CommandHandler("new", cmd_new_project))

    # Proje komutları
    system_cmds = {"start", "help", "projects", "status", "health", "deploy", "yeni", "new"}
    project_cmds = set()
    for name in PROJECT_CONFIGS:
        project_cmds.add(name)
    for alias in PROJECT_ALIASES:
        project_cmds.add(alias)
    for cfg in PROJECT_CONFIGS.values():
        sc = cfg.get("short_cmd", "")
        if sc:
            project_cmds.add(sc)
    project_cmds -= system_cmds

    for cmd in project_cmds:
        app.add_handler(CommandHandler(cmd, cmd_project_task))

    # Metin görev handler
    app.add_handler(MessageHandler(filters.TEXT & (~filters.COMMAND), handle_task_message))

    logger.info(f"Proje komutları: /{', /'.join(sorted(project_cmds))}")
    logger.info("Bot çalışıyor!")
    app.run_polling(drop_pending_updates=True)


if __name__ == "__main__":
    main()
