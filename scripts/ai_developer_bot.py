"""
AI Developer Telegram Bot v2
==============================
Telegram üzerinden görev alıp Anthropic Claude API ile kodlayan,
test eden, push eden ve deploy eden otomasyon botu.

Desteklenen projeler: eyeoftrv2, deprem-appp, astroloji

TEK SİSTEM — Görev Kabul Yöntemleri:
  1. Komut:   /deprem Ana sayfaya buton ekle
  2. Komut:   /eye Login sayfasını güncelle
  3. Komut:   /astro Burç API entegre et
  4. Metin:   Görev: depremapp - Ana sayfaya buton ekle

Diğer Komutlar: /start, /help, /projects, /status, /deploy, /health
"""

import os
import re
import logging
import asyncio
import signal
import subprocess
from typing import List, Optional, Dict
from pathlib import Path
from datetime import datetime
import sys

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

# TaskReporter import
sys.path.append(str(Path(__file__).resolve().parent.parent))
from bot_utils.task_reporter import TaskReporter

# ── Environment ──────────────────────────────────────────
env_path = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(dotenv_path=env_path)

TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY")
TELEGRAM_CHAT_ID = os.getenv("TELEGRAM_CHAT_ID")
BASE_DIR = Path("/opt")

# Güvenlik: Sadece izin verilen chat ID'ler
ALLOWED_CHAT_IDS_RAW = os.getenv("ALLOWED_CHAT_IDS", "")
ALLOWED_CHAT_IDS: set = set()
if ALLOWED_CHAT_IDS_RAW:
    ALLOWED_CHAT_IDS = {int(x.strip()) for x in ALLOWED_CHAT_IDS_RAW.split(",") if x.strip()}
if TELEGRAM_CHAT_ID:
    ALLOWED_CHAT_IDS.add(int(TELEGRAM_CHAT_ID))

# ── Proje Yapılandırmaları ───────────────────────────────
PROJECT_CONFIGS: Dict[str, dict] = {
    "eyeoftrv2": {
        "path": BASE_DIR / "eye-of-tr-v2",
        "github_repo": "bendedo13/eye-of-tr-v2",
        "github_url": "https://github.com/bendedo13/eye-of-tr-v2",
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
        "github_repo": "bendedo13/deprem-appp",
        "github_url": "https://github.com/bendedo13/deprem-appp",
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
        "github_repo": "bendedo13/astroloji",
        "github_url": "https://github.com/bendedo13/astroloji",
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

# ── Logging ──────────────────────────────────────────────
logging.basicConfig(
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    level=logging.INFO,
)
logger = logging.getLogger(__name__)

# ── Anthropic Client ─────────────────────────────────────
client: Optional[Anthropic] = None
if ANTHROPIC_API_KEY:
    client = Anthropic(api_key=ANTHROPIC_API_KEY)
else:
    logger.warning("ANTHROPIC_API_KEY bulunamadı. AI özellikleri devre dışı.")


# ════════════════════════════════════════════════════════════
# YARDIMCI FONKSİYONLAR
# ════════════════════════════════════════════════════════════

def resolve_project(name: str) -> Optional[str]:
    name = name.strip().lower()
    if name in PROJECT_CONFIGS:
        return name
    return PROJECT_ALIASES.get(name)


def is_authorized(chat_id: int) -> bool:
    if not ALLOWED_CHAT_IDS:
        return True
    return chat_id in ALLOWED_CHAT_IDS


async def run_command(command: str, cwd: Path, timeout: int = 120) -> tuple:
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


async def send_long_message(bot, chat_id: int, text: str, parse_mode: str = "Markdown"):
    max_len = 4000
    if len(text) <= max_len:
        try:
            await bot.send_message(chat_id=chat_id, text=text, parse_mode=parse_mode)
        except Exception:
            await bot.send_message(chat_id=chat_id, text=text)
        return

    parts = []
    while text:
        if len(text) <= max_len:
            parts.append(text)
            break
        idx = text.rfind("\n", 0, max_len)
        if idx == -1:
            idx = max_len
        parts.append(text[:idx])
        text = text[idx:].lstrip("\n")

    for i, part in enumerate(parts):
        try:
            await bot.send_message(chat_id=chat_id, text=part, parse_mode=parse_mode)
        except Exception:
            await bot.send_message(chat_id=chat_id, text=part)
        if i < len(parts) - 1:
            await asyncio.sleep(0.5)


# ════════════════════════════════════════════════════════════
# PROJE DOSYA OKUMA
# ════════════════════════════════════════════════════════════

SKIP_DIRS = {
    "venv", "node_modules", ".git", "__pycache__", "dist", "build",
    ".expo", ".next", "coverage", ".cache", "android", "ios",
}


async def get_project_files(project_path: Path, extensions: List[str]) -> str:
    file_contents = []
    total_size = 0
    max_total = 200000

    try:
        for ext in extensions:
            for file_path in sorted(project_path.rglob(f"*{ext}")):
                if any(part in file_path.parts for part in SKIP_DIRS):
                    continue
                if file_path.name in ("package-lock.json", "yarn.lock", "pnpm-lock.yaml"):
                    continue
                try:
                    content = file_path.read_text(encoding="utf-8", errors="ignore")
                    if len(content) > 30000:
                        content = content[:30000] + "\n... (dosya kırpıldı)"
                    file_contents.append(
                        f"--- {file_path.relative_to(project_path)} ---\n{content}\n"
                    )
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

MODELS_COMPLEX = ["claude-sonnet-4-6", "claude-sonnet-4-5-20241022"]
MODELS_SIMPLE = ["claude-haiku-4-5-20251001", "claude-sonnet-4-6"]


def select_models(task: str, context_size: int) -> List[str]:
    complex_keywords = [
        "api", "database", "auth", "security", "algorithm", "refactor",
        "architecture", "migration", "integration", "entegrasyon",
        "veritabanı", "güvenlik", "mimari", "karmaşık", "sistem",
        "performance", "optimization", "docker", "deploy",
    ]
    task_lower = task.lower()
    if any(kw in task_lower for kw in complex_keywords) or context_size > 50000:
        return MODELS_COMPLEX
    return MODELS_SIMPLE


async def ask_claude(task: str, context: str, project_name: str) -> tuple:
    if not client:
        raise Exception("Anthropic API anahtarı eksik!")

    models = select_models(task, len(context))
    logger.info(f"Modeller: {models} | Proje: {project_name}")

    system_prompt = """Sen uzman bir Türk yazılım geliştiricisin. Sana verilen proje dosyalarını ve görevi analiz ederek gerekli kod değişikliklerini yapmalısın.

KURALLAR:
1. Sadece gerekli değişiklikleri yap, gereksiz kod ekleme.
2. Kod kalitesine ve best practice'lere dikkat et.
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
7. Güvenlik açığı bırakma."""

    max_context = 180000
    user_prompt = f"""PROJE: {project_name}
GÖREV: {task}

MEVCUT DOSYALAR:
{context[:max_context]}

Lütfen görevi yerine getirmek için gerekli kod değişikliklerini üret."""

    last_error = None
    for model in models:
        try:
            logger.info(f"Model deneniyor: {model}")
            message = client.messages.create(
                model=model,
                max_tokens=64000,
                temperature=0,
                system=system_prompt,
                messages=[{"role": "user", "content": user_prompt}],
            )
            logger.info(f"Model başarılı: {model}")
            return message.content[0].text, model
        except Exception as e:
            last_error = e
            logger.warning(f"Model {model} başarısız: {e}")
            continue

    raise Exception(f"Tüm modeller başarısız. Son hata: {last_error}")


def apply_changes(response: str, project_path: Path, reporter: TaskReporter) -> List[str]:
    changed_files = []
    file_pattern = r'<file path="(.*?)">\s*(.*?)\s*</file>'
    file_matches = list(re.finditer(file_pattern, response, re.DOTALL))
    explanation_pattern = r"<explanation>\s*(.*?)\s*</explanation>"
    explanations = re.findall(explanation_pattern, response, re.DOTALL)

    for idx, match in enumerate(file_matches):
        rel_path = match.group(1).strip()
        content = match.group(2)
        full_path = project_path / rel_path

        try:
            full_path.resolve().relative_to(project_path.resolve())
        except ValueError:
            reporter.add_error("SECURITY", f"Proje dışı yazım engellendi: {rel_path}")
            continue

        full_path.parent.mkdir(parents=True, exist_ok=True)
        full_path.write_text(content, encoding="utf-8")

        explanation = explanations[idx] if idx < len(explanations) else "Dosya güncellendi"
        reporter.log_change(rel_path, explanation.strip())
        changed_files.append(rel_path)
        logger.info(f"Dosya güncellendi: {rel_path}")

    return changed_files


# ════════════════════════════════════════════════════════════
# GIT İŞLEMLERİ
# ════════════════════════════════════════════════════════════

async def ensure_project_cloned(project_path: Path, config: dict, bot, chat_id: int) -> bool:
    if project_path.exists():
        return True

    await bot.send_message(
        chat_id=chat_id,
        text=f"📥 Proje clone ediliyor...\n`{config['github_url']}`",
        parse_mode="Markdown",
    )
    clone_url = f"https://github.com/{config['github_repo']}.git"
    _, stderr, code = await run_command(
        f"git clone {clone_url} {project_path}", Path("/opt"), timeout=120
    )
    if code != 0:
        await bot.send_message(chat_id=chat_id, text=f"❌ Clone başarısız!\n`{stderr[:300]}`", parse_mode="Markdown")
        return False
    await bot.send_message(chat_id=chat_id, text=f"✅ Clone tamamlandı", parse_mode="Markdown")
    return True


async def git_operations(project_path: Path, task: str, config: dict, reporter: TaskReporter) -> tuple:
    branch = config.get("branch", "main")
    await run_command("git add -A", project_path)

    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M")
    commit_msg = f"AI Bot: {task[:80]} [{timestamp}]"
    stdout, stderr, code = await run_command(f'git commit -m "{commit_msg}"', project_path)

    if code != 0:
        if "nothing to commit" in stdout + stderr:
            reporter.add_error("GIT", "Commit edilecek değişiklik yok")
            return "no-commit", branch
        reporter.add_error("GIT_COMMIT", "Commit başarısız", stderr[:300])
        return "commit-failed", branch

    reporter.add_test("Git Commit", True, "Başarılı")
    full_hash, _, _ = await run_command("git rev-parse HEAD", project_path)

    push_success = False
    for attempt in range(4):
        _, stderr, code = await run_command(f"git push origin {branch}", project_path)
        if code == 0:
            push_success = True
            reporter.add_test("Git Push", True, f"Branch: {branch}")
            break
        await asyncio.sleep(2 ** (attempt + 1))

    if not push_success:
        reporter.add_test("Git Push", False, stderr[:200])
        reporter.add_error("GIT_PUSH", "Push başarısız (4 deneme)", stderr[:200])

    return full_hash.strip(), branch


# ════════════════════════════════════════════════════════════
# TEST VE DEPLOY
# ════════════════════════════════════════════════════════════

async def run_tests(project_path: Path, test_commands: List[str], reporter: TaskReporter) -> bool:
    all_passed = True
    for cmd in test_commands:
        stdout, stderr, code = await run_command(cmd, project_path, timeout=180)
        passed = code == 0
        all_passed = all_passed and passed
        reporter.add_test(f"Test: {cmd}", passed, (stdout or stderr)[:300])
    return all_passed


async def run_deploy(project_path: Path, config: dict, reporter: TaskReporter) -> bool:
    deploy_script = project_path / config["deploy_script"]
    if not deploy_script.exists():
        reporter.add_test("Deploy", False, f"Script bulunamadı: {config['deploy_script']}")
        return False

    stdout, stderr, code = await run_command(
        f"bash {deploy_script}", project_path, timeout=600
    )
    passed = code == 0
    output = (stdout[-500:] if stdout else "") + ("\n" + stderr[-300:] if stderr else "")
    reporter.add_test("Deploy", passed, output.strip()[:500])
    if not passed:
        reporter.add_error("DEPLOY", "Deploy başarısız", stderr[:300])
    return passed


async def check_health(url: str, reporter: TaskReporter) -> bool:
    stdout, _, _ = await run_command(
        f'curl -sf -o /dev/null -w "%{{http_code}}" --connect-timeout 10 {url}',
        Path.cwd(), timeout=20,
    )
    http_code = stdout.strip()
    passed = http_code in ("200", "301", "302")
    reporter.add_test(f"Health ({url})", passed, f"HTTP {http_code}")
    return passed


# ════════════════════════════════════════════════════════════
# BİRLEŞİK GÖREV İŞLEYİCİ
# ════════════════════════════════════════════════════════════

async def execute_task(bot, chat_id: int, project_name: str, task_description: str):
    """Tüm görev akışını çalıştırır — tek giriş noktası."""
    config = PROJECT_CONFIGS[project_name]
    project_path = config["path"]
    reporter = TaskReporter()
    start_time = datetime.now()

    if not await ensure_project_cloned(project_path, config, bot, chat_id):
        return

    await bot.send_message(
        chat_id=chat_id,
        text=f"🤖 *Görev Alındı!*\n📂 *{project_name}*\n📝 {task_description[:300]}\n⏳ İşlem başlıyor...",
        parse_mode="Markdown",
    )

    try:
        # 1. Dosyaları oku
        await bot.send_message(chat_id=chat_id, text="🔍 *1/7* Dosyalar okunuyor...")
        context_data = await get_project_files(project_path, config.get("extensions", [".py", ".ts", ".tsx", ".js"]))
        if not context_data:
            await bot.send_message(chat_id=chat_id, text="⚠️ Proje dosyası bulunamadı!")
            return
        reporter.add_metric("context_size", len(context_data))

        # 2. Claude AI
        models = select_models(task_description, len(context_data))
        await bot.send_message(chat_id=chat_id, text=f"🧠 *2/7* Claude kodluyor...\nModel: `{models[0]}` | Token: `64K`", parse_mode="Markdown")
        ai_response, model = await ask_claude(task_description, context_data, project_name)

        # 3. Değişiklikleri uygula
        await bot.send_message(chat_id=chat_id, text="📝 *3/7* Değişiklikler uygulanıyor...")
        changed_files = apply_changes(ai_response, project_path, reporter)
        if not changed_files:
            await bot.send_message(chat_id=chat_id, text="⚠️ Değişiklik üretilemedi. Görevi daha detaylı yazın.")
            return
        reporter.add_metric("changed_files", len(changed_files))

        # 4. Git
        await bot.send_message(chat_id=chat_id, text="💾 *4/7* Git commit & push...")
        commit_hash, branch = await git_operations(project_path, task_description, config, reporter)

        # 5. Test
        await bot.send_message(chat_id=chat_id, text="🧪 *5/7* Testler...")
        await run_tests(project_path, config["test_commands"], reporter)

        # 6. Health
        await bot.send_message(chat_id=chat_id, text="🏥 *6/7* Health check...")
        if config.get("health_check"):
            await check_health(config["health_check"], reporter)

        # 7. Deploy
        deploy_script = project_path / config["deploy_script"]
        if deploy_script.exists():
            await bot.send_message(chat_id=chat_id, text="🚀 *7/7* Deploy...")
            await run_deploy(project_path, config, reporter)
        else:
            reporter.add_test("Deploy", False, "Script bulunamadı (atlanıyor)")

        # Rapor
        elapsed = (datetime.now() - start_time).total_seconds()
        commit_short = commit_hash[:8] if len(commit_hash) > 8 else commit_hash

        report = f"🤖 *RAPOR*\n━━━━━━━━━━━━━━━━━━\n"
        report += f"📌 {task_description[:200]}\n📂 {project_name} | ⏱️ {int(elapsed//60)}dk {int(elapsed%60)}s\n🧠 {model}\n"
        report += f"🎯 {'✅ BAŞARILI' if not reporter.errors else '⚠️ HATALAR MEVCUT'}\n\n"

        if reporter.changes:
            report += f"📂 *Dosyalar ({len(reporter.changes)}):*\n"
            for c in reporter.changes[:10]:
                report += f"  ✏️ `{c['file']}`\n"
            report += "\n"

        if reporter.tests:
            p = sum(1 for t in reporter.tests if t["passed"])
            report += f"🧪 *Testler ({p}/{len(reporter.tests)}):*\n"
            for t in reporter.tests:
                report += f"  {t['status']} {t['name']}\n"
            report += "\n"

        report += f"💾 Commit: `{commit_short}` | Branch: `{branch}`\n"

        if reporter.errors:
            report += "\n❌ *Hatalar:*\n"
            for e in reporter.errors[:5]:
                report += f"  • {e['message']}\n"

        if commit_hash and commit_hash not in ("no-commit", "commit-failed"):
            report += f"\n🔗 {config['github_url']}/commit/{commit_hash}\n"

        report += f"\n━━━━━━━━━━━━━━━━━━\n🕐 {datetime.now().strftime('%d.%m.%Y %H:%M')}"
        await send_long_message(bot, chat_id, report)

    except Exception as e:
        logger.error(f"Görev hatası: {e}", exc_info=True)
        try:
            await bot.send_message(chat_id=chat_id,
                text=f"❌ *HATA*\n📂 {project_name}\n⚠️ {str(e)[:500]}\nLog: `journalctl -u telegram-bot -n 50`",
                parse_mode="Markdown")
        except Exception:
            await bot.send_message(chat_id=chat_id, text=f"Hata: {str(e)[:500]}")


# ════════════════════════════════════════════════════════════
# TELEGRAM KOMUTLARI
# ════════════════════════════════════════════════════════════

async def cmd_start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if not is_authorized(update.effective_chat.id):
        await update.message.reply_text("⛔ Yetkiniz yok.")
        return
    text = """🤖 *AI Developer Bot v2*

*Görev Gönder:*
  `/deprem Ana sayfaya buton ekle`
  `/eye Login sayfasını güncelle`
  `/astro Burç detay sayfası ekle`
  `Görev: depremapp - buton ekle`

*Komutlar:*
/help /projects /status /health
/deploy [proje]"""
    await update.message.reply_text(text, parse_mode="Markdown")


async def cmd_help(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if not is_authorized(update.effective_chat.id):
        return
    text = """📖 *Kullanım*

*Hızlı:* `/deprem [görev]`  `/eye [görev]`  `/astro [görev]`
*Detaylı:* `Görev: [proje] - [açıklama]`

*Akış:* Dosya oku → Claude AI (64K token) → Kod yaz → Git push → Test → Deploy → Rapor

*Uzun görevler* desteklenir. Tüm değişiklikleri tek seferde yapabilirsiniz."""
    await update.message.reply_text(text, parse_mode="Markdown")


async def cmd_projects(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if not is_authorized(update.effective_chat.id):
        return
    text = "📂 *Projeler:*\n\n"
    for name, cfg in PROJECT_CONFIGS.items():
        exists = "✅" if cfg["path"].exists() else "❌"
        text += f"*{name}* (`/{cfg['short_cmd']}`)\n  {cfg['description']}\n  {exists} `{cfg['path']}`\n\n"
    await update.message.reply_text(text, parse_mode="Markdown")


async def cmd_status(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if not is_authorized(update.effective_chat.id):
        return
    text = f"📊 *Sistem*\n🤖 API: {'✅' if client else '❌'}\n\n"
    for name, cfg in PROJECT_CONFIGS.items():
        exists = cfg["path"].exists()
        text += f"*{name}* (`/{cfg['short_cmd']}`): {'✅' if exists else '❌'}\n"
        if exists:
            out, _, code = await run_command("git log -1 --format='%h %s (%cr)'", cfg["path"])
            if code == 0 and out:
                text += f"  `{out[:80]}`\n"
    await update.message.reply_text(text, parse_mode="Markdown")


async def cmd_health(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if not is_authorized(update.effective_chat.id):
        return
    await update.message.reply_text("🔍 Health check...")

    text = "🏥 *Health Check:*\n\n"
    # Docker durumu
    out, _, code = await run_command("docker ps --format '{{.Names}}: {{.Status}}' 2>/dev/null", Path.cwd())
    if code == 0 and out:
        text += "*Docker:*\n"
        for line in out.split("\n")[:10]:
            s = "✅" if "Up" in line else "❌"
            text += f"  {s} `{line}`\n"
        text += "\n"

    for name, cfg in PROJECT_CONFIGS.items():
        url = cfg.get("health_check")
        if url:
            out, _, _ = await run_command(f'curl -sf -o /dev/null -w "%{{http_code}}" --connect-timeout 5 {url}', Path.cwd(), timeout=15)
            http = out.strip()
            s = "✅" if http in ("200", "301", "302") else "❌"
            text += f"{s} *{name}:* HTTP {http}\n"
    await update.message.reply_text(text, parse_mode="Markdown")


async def cmd_deploy(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if not is_authorized(update.effective_chat.id):
        return
    args = context.args
    if not args:
        await update.message.reply_text("Kullanım: `/deploy deprem`", parse_mode="Markdown")
        return
    project_name = resolve_project(args[0])
    if not project_name:
        await update.message.reply_text(f"❌ Bilinmeyen proje: {args[0]}")
        return
    cfg = PROJECT_CONFIGS[project_name]
    reporter = TaskReporter()
    await update.message.reply_text(f"🚀 *{project_name}* deploy...", parse_mode="Markdown")
    if cfg["path"].exists():
        await run_command(f"git pull origin {cfg['branch']}", cfg["path"])
    success = await run_deploy(cfg["path"], cfg, reporter)
    if cfg.get("health_check"):
        await check_health(cfg["health_check"], reporter)
    text = f"🚀 *Deploy: {'✅' if success else '❌'}*\n"
    for t in reporter.tests:
        text += f"  {t['status']} {t['name']}\n"
    await send_long_message(context.bot, update.effective_chat.id, text)


# ════════════════════════════════════════════════════════════
# PROJE KOMUT HANDLER  (/deprem, /eye, /astro)
# ════════════════════════════════════════════════════════════

async def cmd_project_task(update: Update, context: ContextTypes.DEFAULT_TYPE):
    chat_id = update.effective_chat.id
    if not is_authorized(chat_id):
        await update.message.reply_text("⛔ Yetkiniz yok.")
        return

    command = update.message.text.split()[0].lstrip("/").lower()
    project_name = resolve_project(command)
    if not project_name:
        await update.message.reply_text(f"❌ Bilinmeyen: /{command}")
        return

    task_text = update.message.text[len(f"/{command}"):].strip()
    if not task_text:
        cfg = PROJECT_CONFIGS[project_name]
        await update.message.reply_text(
            f"📂 *{project_name}*\n\nKullanım: `/{command} [görev]`\nÖrnek: `/{command} Ana sayfaya buton ekle`",
            parse_mode="Markdown",
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
            "⚠️ Kullanım: `Görev: deprem - açıklama`\nveya: `/deprem açıklama`",
            parse_mode="Markdown",
        )
        return

    project_name = resolve_project(project_raw)
    if not project_name:
        await update.message.reply_text(f"❌ Bilinmeyen proje: *{project_raw}*\nKomutlar: /deprem /eye /astro", parse_mode="Markdown")
        return

    await execute_task(context.bot, chat_id, project_name, task_description)


# ════════════════════════════════════════════════════════════
# BOT BAŞLATMA
# ════════════════════════════════════════════════════════════

async def post_init(application):
    commands = [
        BotCommand("start", "Bot'u başlat"),
        BotCommand("help", "Kullanım kılavuzu"),
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


def kill_other_bot_instances():
    """Aynı script'i çalıştıran diğer process'leri durdur (Conflict hatası önleme)."""
    my_pid = os.getpid()
    script_name = "ai_developer_bot.py"
    try:
        result = subprocess.run(
            ["pgrep", "-f", script_name],
            capture_output=True, text=True, timeout=5
        )
        if result.stdout:
            for line in result.stdout.strip().split("\n"):
                pid = int(line.strip())
                if pid != my_pid:
                    logger.warning(f"Eski bot process bulundu (PID {pid}), durduruluyor...")
                    try:
                        os.kill(pid, signal.SIGTERM)
                        logger.info(f"PID {pid} SIGTERM gönderildi")
                    except ProcessLookupError:
                        pass
                    except PermissionError:
                        logger.warning(f"PID {pid} durdurulamadı (izin yok)")
    except Exception as e:
        logger.debug(f"Process kontrol hatası (önemsiz): {e}")


async def delete_webhook_and_clean():
    """Başlamadan önce webhook/getUpdates çakışmasını temizle."""
    import httpx
    try:
        async with httpx.AsyncClient() as http:
            url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/deleteWebhook"
            resp = await http.post(url, params={"drop_pending_updates": True}, timeout=10)
            data = resp.json()
            if data.get("ok"):
                logger.info("Webhook temizlendi, pending updates düşürüldü")
            else:
                logger.warning(f"Webhook temizleme yanıtı: {data}")
    except Exception as e:
        logger.warning(f"Webhook temizleme hatası (devam ediliyor): {e}")


def main():
    if not TELEGRAM_BOT_TOKEN or TELEGRAM_BOT_TOKEN == "your_bot_token_here":
        logger.critical("TELEGRAM_BOT_TOKEN eksik!")
        sys.exit(1)

    # Çakışan bot instance'larını durdur
    kill_other_bot_instances()

    # Kısa bekleme — eski process'in kapanmasını bekle
    import time
    time.sleep(2)

    # Webhook temizliği
    asyncio.run(delete_webhook_and_clean())

    logger.info("=" * 50)
    logger.info("AI Developer Bot v2 başlatılıyor...")
    logger.info(f"Projeler: {', '.join(PROJECT_CONFIGS.keys())}")
    logger.info(f"Yetkili: {ALLOWED_CHAT_IDS or 'Herkese açık'}")
    logger.info("=" * 50)

    application = ApplicationBuilder().token(TELEGRAM_BOT_TOKEN).post_init(post_init).build()

    # Sistem komutları
    application.add_handler(CommandHandler("start", cmd_start))
    application.add_handler(CommandHandler("help", cmd_help))
    application.add_handler(CommandHandler("projects", cmd_projects))
    application.add_handler(CommandHandler("status", cmd_status))
    application.add_handler(CommandHandler("health", cmd_health))
    application.add_handler(CommandHandler("deploy", cmd_deploy))

    # Proje komutları — /deprem, /eye, /astro ve tüm takma adlar
    system_cmds = {"start", "help", "projects", "status", "health", "deploy"}
    project_cmds = set()
    for name in PROJECT_CONFIGS:
        project_cmds.add(name)
    for alias in PROJECT_ALIASES:
        project_cmds.add(alias)
    for cfg in PROJECT_CONFIGS.values():
        project_cmds.add(cfg["short_cmd"])
    project_cmds -= system_cmds

    for cmd in project_cmds:
        application.add_handler(CommandHandler(cmd, cmd_project_task))

    # Metin görev handler
    application.add_handler(MessageHandler(filters.TEXT & (~filters.COMMAND), handle_task_message))

    logger.info(f"Proje komutları: /{', /'.join(sorted(project_cmds))}")
    logger.info("Bot çalışıyor!")
    application.run_polling(drop_pending_updates=True)


if __name__ == "__main__":
    main()
