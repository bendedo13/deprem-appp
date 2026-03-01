"""
AI Developer Telegram Bot
==========================
Telegram üzerinden görev alıp Anthropic Claude API ile kodlayan,
test eden, push eden ve deploy eden otomasyon botu.

Desteklenen projeler: eyeoftrv2, deprem-appp, astroloji
Komutlar: /start, /help, /projects, /status, /deploy, /health
Görev formatı: Görev: [proje] - [açıklama]
"""

import os
import re
import logging
import asyncio
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
from telegram.constants import ParseMode
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

# Güvenlik: Sadece izin verilen chat ID'ler botu kullanabilir
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
        "test_commands": ["npm run build", "npm run lint"],
        "health_check": "http://localhost:3000",
        "branch": "main",
        "description": "Eye of TR - Web Uygulaması",
        "extensions": [".ts", ".tsx", ".js", ".jsx", ".css", ".html", ".json"],
    },
    "depremapp": {
        "path": BASE_DIR / "deprem-appp",
        "github_repo": "bendedo13/deprem-appp",
        "github_url": "https://github.com/bendedo13/deprem-appp",
        "deploy_script": "deploy/PRODUCTION_DEPLOY.sh",
        "test_commands": ["docker-compose ps", "curl -sf http://localhost:8001/health || exit 1"],
        "health_check": "http://localhost:8001/health",
        "branch": "main",
        "description": "Deprem App - Mobil + Backend",
        "extensions": [".py", ".ts", ".tsx", ".js", ".json"],
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
    },
}

# Proje takma adları (kısa isimler)
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
    """Proje adını veya takma adını çözümle."""
    name = name.strip().lower()
    if name in PROJECT_CONFIGS:
        return name
    return PROJECT_ALIASES.get(name)


def is_authorized(chat_id: int) -> bool:
    """Chat ID'nin yetkili olup olmadığını kontrol et."""
    if not ALLOWED_CHAT_IDS:
        return True  # Hiç ID tanımlı değilse herkese izin ver (geliştirme modu)
    return chat_id in ALLOWED_CHAT_IDS


def escape_md(text: str) -> str:
    """Telegram MarkdownV2 için özel karakterleri escape et. Basit Markdown kullanıldığında sadece sorunlu olanları temizle."""
    if not text:
        return ""
    # Basit Markdown modunda sadece backtick ve * sorun çıkarır
    return text.replace("`", "'").replace("_", "\\_")


async def run_command(command: str, cwd: Path, timeout: int = 120) -> tuple:
    """Shell komutu asenkron çalıştır."""
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
        logger.error(f"Komut zaman aşımı ({timeout}s): {command}")
        return "", f"Zaman aşımı ({timeout}s)", 1
    except Exception as e:
        logger.error(f"Komut hatası: {e}")
        return "", str(e), 1


async def send_long_message(bot, chat_id: int, text: str, parse_mode: str = "Markdown"):
    """Uzun mesajları bölerek gönder (Telegram 4096 karakter limiti)."""
    max_len = 4000
    if len(text) <= max_len:
        try:
            await bot.send_message(chat_id=chat_id, text=text, parse_mode=parse_mode)
        except Exception:
            # Markdown parse hatası olursa düz metin olarak gönder
            await bot.send_message(chat_id=chat_id, text=text)
        return

    # Uzun mesajı böl
    parts = []
    while text:
        if len(text) <= max_len:
            parts.append(text)
            break
        # Son satır sonunu bul
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
    """Proje dosyalarını oku ve context olarak döndür."""
    file_contents = []
    total_size = 0
    max_total = 150000  # Toplam context limiti

    try:
        for ext in extensions:
            for file_path in sorted(project_path.rglob(f"*{ext}")):
                # Atlanacak klasörler
                if any(part in file_path.parts for part in SKIP_DIRS):
                    continue
                # package-lock, yarn.lock vb. atla
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
                except Exception as e:
                    logger.warning(f"Dosya okunamadı {file_path}: {e}")
            if total_size > max_total:
                break
    except Exception as e:
        logger.error(f"Dosya tarama hatası: {e}")

    return "\n".join(file_contents)


# ════════════════════════════════════════════════════════════
# CLAUDE AI
# ════════════════════════════════════════════════════════════

# Model listesi - öncelik sırasına göre denenecek
MODELS_COMPLEX = ["claude-sonnet-4-6", "claude-sonnet-4-5-20241022"]
MODELS_SIMPLE = ["claude-haiku-4-5-20251001", "claude-sonnet-4-6"]


def select_models(task: str, context_size: int) -> List[str]:
    """Görev karmaşıklığına göre model listesi döndür (fallback ile)."""
    complex_keywords = [
        "api", "database", "auth", "security", "algorithm", "refactor",
        "architecture", "migration", "integration", "entegrasyon",
        "veritabanı", "güvenlik", "mimari", "karmaşık", "sistem",
        "performance", "optimization",
    ]
    task_lower = task.lower()

    if any(kw in task_lower for kw in complex_keywords) or context_size > 50000:
        return MODELS_COMPLEX
    return MODELS_SIMPLE


async def ask_claude(task: str, context: str, project_name: str) -> tuple:
    """Claude'a görev gönder ve kod değişikliklerini al. (response, model_used) döndürür."""
    if not client:
        raise Exception("Anthropic API anahtarı eksik!")

    models = select_models(task, len(context))
    logger.info(f"Denenecek modeller: {models} | Proje: {project_name}")

    system_prompt = """Sen uzman bir Türk yazılım geliştiricisin. Sana verilen proje dosyalarını ve görevi analiz ederek gerekli kod değişikliklerini yapmalısın.

KURALLAR:
1. Sadece gerekli değişiklikleri yap, gereksiz kod ekleme.
2. Kod kalitesine ve best practice'lere dikkat et.
3. Türkçe yorum satırları ekle (önemli yerlere).
4. Cevabın SADECE XML formatında dosya güncellemeleri içermelidir.
5. Dosyaları güncellemek için şu formatı kullan:

<file path="relative/path/to/file.ext">
... dosyanın tam yeni içeriği ...
</file>

<explanation>
- Değişiklik 1 açıklaması
- Değişiklik 2 açıklaması
</explanation>

6. Her dosya değişikliğinden sonra MUTLAKA <explanation> tagı ile Türkçe açıklama yap.
7. Sadece değişen veya yeni dosyaları döndür.
8. Test edilebilir, çalışır kod yaz.
9. Güvenlik açığı bırakma (XSS, injection vb.)."""

    user_prompt = f"""PROJE: {project_name}
GÖREV: {task}

MEVCUT DOSYALAR:
{context[:120000]}

Lütfen görevi yerine getirmek için gerekli kod değişikliklerini üret.
Her dosya için <file> ve <explanation> taglarını kullan.
Açıklamaları Türkçe ve detaylı yap."""

    last_error = None
    for model in models:
        try:
            logger.info(f"Model deneniyor: {model}")
            message = client.messages.create(
                model=model,
                max_tokens=16000,
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

    raise Exception(f"Tüm modeller başarısız oldu. Son hata: {last_error}")


def apply_changes(response: str, project_path: Path, reporter: TaskReporter) -> List[str]:
    """Claude'un yanıtını parse edip dosyalara uygula."""
    changed_files = []

    # Dosya değişikliklerini bul
    file_pattern = r'<file path="(.*?)">\s*(.*?)\s*</file>'
    file_matches = list(re.finditer(file_pattern, response, re.DOTALL))

    # Açıklamaları bul
    explanation_pattern = r"<explanation>\s*(.*?)\s*</explanation>"
    explanations = re.findall(explanation_pattern, response, re.DOTALL)

    for idx, match in enumerate(file_matches):
        rel_path = match.group(1).strip()
        content = match.group(2)
        full_path = project_path / rel_path

        # Güvenlik: Proje dışına dosya yazımını engelle
        try:
            full_path.resolve().relative_to(project_path.resolve())
        except ValueError:
            logger.warning(f"Güvenlik: Proje dışı dosya yazımı engellendi: {rel_path}")
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

async def git_operations(project_path: Path, task: str, config: dict, reporter: TaskReporter) -> tuple:
    """Git add, commit, push işlemlerini yap. (commit_hash, branch) döndürür."""
    branch = config.get("branch", "main")

    # Git add
    await run_command("git add -A", project_path)

    # Commit mesajı
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M")
    commit_msg = f"AI Bot: {task[:80]} [{timestamp}]"
    stdout, stderr, code = await run_command(
        f'git commit -m "{commit_msg}"', project_path
    )

    if code != 0:
        if "nothing to commit" in stdout + stderr:
            reporter.add_error("GIT", "Commit edilecek değişiklik yok")
            return "no-commit", branch
        reporter.add_error("GIT_COMMIT", "Commit başarısız", stderr[:300])
        return "commit-failed", branch

    reporter.add_test("Git Commit", True, "Başarılı")

    # Commit hash
    commit_hash, _, _ = await run_command("git rev-parse --short HEAD", project_path)
    full_hash, _, _ = await run_command("git rev-parse HEAD", project_path)

    # Git push (retry ile)
    push_success = False
    for attempt in range(4):
        _, stderr, code = await run_command(f"git push origin {branch}", project_path)
        if code == 0:
            push_success = True
            reporter.add_test("Git Push", True, f"Branch: {branch}")
            break
        wait = 2 ** (attempt + 1)
        logger.warning(f"Push denemesi {attempt + 1} başarısız, {wait}s bekliyor...")
        await asyncio.sleep(wait)

    if not push_success:
        reporter.add_test("Git Push", False, stderr[:200])
        reporter.add_error("GIT_PUSH", "Push başarısız (4 deneme)", stderr[:200])

    return full_hash.strip(), branch


# ════════════════════════════════════════════════════════════
# TEST VE DEPLOY
# ════════════════════════════════════════════════════════════

async def run_tests(project_path: Path, test_commands: List[str], reporter: TaskReporter) -> bool:
    """Testleri çalıştır."""
    all_passed = True
    for cmd in test_commands:
        stdout, stderr, code = await run_command(cmd, project_path, timeout=180)
        passed = code == 0
        all_passed = all_passed and passed
        output = (stdout or stderr)[:300]
        reporter.add_test(f"Test: {cmd}", passed, output)
        logger.info(f"Test '{cmd}': {'PASS' if passed else 'FAIL'}")
    return all_passed


async def run_deploy(project_path: Path, config: dict, reporter: TaskReporter) -> bool:
    """Deploy scriptini çalıştır."""
    deploy_script = project_path / config["deploy_script"]
    if not deploy_script.exists():
        reporter.add_test("Deploy", False, f"Script bulunamadı: {config['deploy_script']}")
        return False

    stdout, stderr, code = await run_command(
        f"bash {deploy_script}", project_path, timeout=300
    )
    passed = code == 0
    reporter.add_test("Deploy", passed, (stdout or stderr)[:300])
    if not passed:
        reporter.add_error("DEPLOY", "Deploy başarısız", stderr[:300])
    return passed


async def check_health(url: str, reporter: TaskReporter) -> bool:
    """Health check endpoint'ini kontrol et."""
    stdout, stderr, code = await run_command(
        f'curl -sf -o /dev/null -w "%{{http_code}}" --connect-timeout 5 {url}',
        Path.cwd(),
        timeout=15,
    )
    http_code = stdout.strip()
    passed = http_code in ("200", "301", "302")
    reporter.add_test(f"Health Check ({url})", passed, f"HTTP {http_code}")
    return passed


# ════════════════════════════════════════════════════════════
# TELEGRAM KOMUTLARI
# ════════════════════════════════════════════════════════════

async def cmd_start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Bot başlangıç mesajı."""
    chat_id = update.effective_chat.id
    if not is_authorized(chat_id):
        await update.message.reply_text("⛔ Yetkiniz yok.")
        return

    text = """🤖 *AI Developer Bot'a Hoş Geldiniz!*

Bu bot, Anthropic Claude API kullanarak projelerinizi otomatik olarak kodlar, test eder, push eder ve deploy eder.

*Komutlar:*
/help - Yardım ve kullanım
/projects - Desteklenen projeler
/status - Sistem durumu
/health - Health check
/deploy [proje] - Manuel deploy

*Görev Gönderme:*
`Görev: [proje] - [yapılacak iş]`

*Örnek:*
`Görev: depremapp - Ana sayfaya yeni buton ekle`
`Görev: eyeoftrv2 - Login sayfasını güncelle`
`Görev: astroloji - Burç API'sini entegre et`"""

    await update.message.reply_text(text, parse_mode="Markdown")


async def cmd_help(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Detaylı yardım."""
    chat_id = update.effective_chat.id
    if not is_authorized(chat_id):
        return

    text = """📖 *Detaylı Kullanım Kılavuzu*

*1. Görev Formatı:*
`Görev: [proje_adı] - [detaylı görev açıklaması]`

*2. Proje Adları:*
• `eyeoftrv2` (veya `eyeoftr`, `eye`)
• `depremapp` (veya `deprem`, `deprem-appp`)
• `astroloji` (veya `astro`)

*3. İş Akışı:*
1️⃣ Görev alınır ve analiz edilir
2️⃣ Proje dosyaları okunur
3️⃣ Claude AI ile kod değişiklikleri üretilir
4️⃣ Değişiklikler dosyalara uygulanır
5️⃣ Git commit + push yapılır
6️⃣ Testler çalıştırılır
7️⃣ Health check yapılır
8️⃣ Deploy edilir (opsiyonel)
9️⃣ Detaylı rapor gönderilir

*4. Karmaşıklık Seviyeleri:*
🟢 Basit görevler → Claude Haiku (hızlı)
🟡 Karmaşık görevler → Claude Sonnet (güçlü)

*5. Güvenlik:*
• Sadece yetkili kullanıcılar botu kullanabilir
• Proje dışı dosya yazımı engellenir
• API anahtarları .env dosyasında saklanır"""

    await update.message.reply_text(text, parse_mode="Markdown")


async def cmd_projects(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Desteklenen projeleri listele."""
    chat_id = update.effective_chat.id
    if not is_authorized(chat_id):
        return

    text = "📂 *Desteklenen Projeler:*\n\n"
    for name, cfg in PROJECT_CONFIGS.items():
        path_exists = "✅" if cfg["path"].exists() else "❌"
        text += f"*{name}*\n"
        text += f"  📝 {cfg['description']}\n"
        text += f"  📁 `{cfg['path']}` {path_exists}\n"
        text += f"  🔗 {cfg['github_url']}\n"
        text += f"  🌿 Branch: `{cfg['branch']}`\n\n"

    await update.message.reply_text(text, parse_mode="Markdown")


async def cmd_status(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Sistem durumunu göster."""
    chat_id = update.effective_chat.id
    if not is_authorized(chat_id):
        return

    text = "📊 *Sistem Durumu*\n\n"

    # API durumu
    api_ok = "✅" if client else "❌"
    text += f"🤖 Anthropic API: {api_ok}\n"

    # Proje durumları
    for name, cfg in PROJECT_CONFIGS.items():
        exists = cfg["path"].exists()
        text += f"\n*{name}:*\n"
        text += f"  Klasör: {'✅' if exists else '❌'}\n"
        if exists:
            # Son commit
            stdout, _, code = await run_command(
                "git log -1 --format='%h - %s (%cr)'", cfg["path"]
            )
            if code == 0 and stdout:
                text += f"  Son commit: `{stdout[:80]}`\n"
            # Branch
            branch_out, _, _ = await run_command(
                "git branch --show-current", cfg["path"]
            )
            text += f"  Branch: `{branch_out.strip()}`\n"

    await update.message.reply_text(text, parse_mode="Markdown")


async def cmd_health(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Tüm projelerin health check'ini yap."""
    chat_id = update.effective_chat.id
    if not is_authorized(chat_id):
        return

    await update.message.reply_text("🔍 Health check yapılıyor...")

    text = "🏥 *Health Check Sonuçları:*\n\n"
    for name, cfg in PROJECT_CONFIGS.items():
        url = cfg.get("health_check")
        if url:
            stdout, _, code = await run_command(
                f'curl -sf -o /dev/null -w "%{{http_code}}" --connect-timeout 5 {url}',
                Path.cwd(),
                timeout=15,
            )
            http_code = stdout.strip()
            status = "✅" if http_code in ("200", "301", "302") else "❌"
            text += f"{status} *{name}:* HTTP {http_code} ({url})\n"
        else:
            text += f"⏭️ *{name}:* Health check URL yok\n"

    await update.message.reply_text(text, parse_mode="Markdown")


async def cmd_deploy(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Manuel deploy komutu: /deploy [proje]"""
    chat_id = update.effective_chat.id
    if not is_authorized(chat_id):
        return

    args = context.args
    if not args:
        await update.message.reply_text(
            "Kullanım: `/deploy [proje_adı]`\nÖrnek: `/deploy depremapp`",
            parse_mode="Markdown",
        )
        return

    project_name = resolve_project(args[0])
    if not project_name:
        await update.message.reply_text(f"❌ Bilinmeyen proje: {args[0]}")
        return

    cfg = PROJECT_CONFIGS[project_name]
    reporter = TaskReporter()

    await update.message.reply_text(f"🚀 {project_name} deploy başlatılıyor...")

    success = await run_deploy(cfg["path"], cfg, reporter)
    if cfg.get("health_check"):
        await check_health(cfg["health_check"], reporter)

    status = "✅ Başarılı" if success else "❌ Başarısız"
    text = f"🚀 *Deploy Sonucu: {status}*\n\n"
    for test in reporter.tests:
        text += f"{test['status']} {test['name']}: {test['output']}\n"

    await update.message.reply_text(text, parse_mode="Markdown")


# ════════════════════════════════════════════════════════════
# ANA GÖREV İŞLEYİCİ
# ════════════════════════════════════════════════════════════

async def handle_task_message(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Görev mesajlarını işle."""
    msg = update.message.text
    chat_id = update.effective_chat.id

    if not is_authorized(chat_id):
        await update.message.reply_text("⛔ Yetkiniz yok. Chat ID'niz: " + str(chat_id))
        return

    # "Görev:" veya "görev:" ile başlamalı
    if not msg.lower().startswith("görev:"):
        return

    # Reporter başlat
    reporter = TaskReporter()

    # Parse: Görev: [proje] - [açıklama]
    try:
        _, content = msg.split(":", 1)
        if "-" not in content:
            raise ValueError("Tire bulunamadı")
        project_raw, task_description = content.split("-", 1)
        project_raw = project_raw.strip()
        task_description = task_description.strip()

        if not task_description:
            raise ValueError("Görev açıklaması boş")
    except ValueError:
        await update.message.reply_text(
            "⚠️ *Format hatası!*\n\n"
            "Kullanım: `Görev: [proje] - [açıklama]`\n\n"
            "Örnek:\n"
            "`Görev: depremapp - Ana sayfaya buton ekle`\n"
            "`Görev: eyeoftrv2 - Login sayfasını güncelle`\n"
            "`Görev: astroloji - Burç detay sayfası ekle`\n\n"
            "Projeler: /projects",
            parse_mode="Markdown",
        )
        return

    # Proje çözümle
    project_name = resolve_project(project_raw)
    if not project_name:
        projects_list = ", ".join(PROJECT_CONFIGS.keys())
        await update.message.reply_text(
            f"❌ Bilinmeyen proje: *{project_raw}*\n\n"
            f"Mevcut projeler: `{projects_list}`\n\n"
            f"Takma adlar: eye, deprem, astro",
            parse_mode="Markdown",
        )
        return

    config = PROJECT_CONFIGS[project_name]
    project_path = config["path"]

    # Proje klasörü yoksa otomatik clone et
    if not project_path.exists():
        await update.message.reply_text(
            f"📥 Proje klasörü bulunamadı, otomatik clone ediliyor...\n"
            f"`git clone {config['github_url']} {project_path}`",
            parse_mode="Markdown",
        )
        clone_url = f"https://github.com/{config['github_repo']}.git"
        stdout, stderr, code = await run_command(
            f"git clone {clone_url} {project_path}", Path("/opt"), timeout=120
        )
        if code != 0:
            await update.message.reply_text(
                f"❌ Clone başarısız!\n`{stderr[:300]}`",
                parse_mode="Markdown",
            )
            return
        await update.message.reply_text(f"✅ Proje başarıyla clone edildi: `{project_path}`", parse_mode="Markdown")

    # ── İş akışı başlat ──────────────────────────────────
    start_time = datetime.now()

    await update.message.reply_text(
        f"🤖 *Görev Alındı!*\n\n"
        f"📂 Proje: *{project_name}*\n"
        f"📝 Görev: {task_description}\n"
        f"⏳ İşlem başlıyor...",
        parse_mode="Markdown",
    )

    try:
        # ADIM 1: Proje dosyalarını oku
        await update.message.reply_text("🔍 *Adım 1/7:* Proje dosyaları okunuyor...")
        context_data = await get_project_files(
            project_path, config.get("extensions", [".py", ".ts", ".tsx", ".js"])
        )

        if not context_data:
            await update.message.reply_text("⚠️ Proje dosyası bulunamadı!")
            return

        reporter.add_metric("context_size", len(context_data))

        # ADIM 2: Claude ile kodla
        models = select_models(task_description, len(context_data))
        await update.message.reply_text(
            f"🧠 *Adım 2/7:* Claude AI kodluyor...\n"
            f"Model: `{models[0]}` (fallback: `{models[-1]}`)"
        , parse_mode="Markdown")

        ai_response, model = await ask_claude(task_description, context_data, project_name)

        # ADIM 3: Değişiklikleri uygula
        await update.message.reply_text("📝 *Adım 3/7:* Değişiklikler uygulanıyor...")
        changed_files = apply_changes(ai_response, project_path, reporter)

        if not changed_files:
            await update.message.reply_text(
                "⚠️ Claude herhangi bir dosya değişikliği üretmedi.\n"
                "Görev açıklamasını daha detaylı yazmayı deneyin."
            )
            return

        reporter.add_metric("changed_files", len(changed_files))

        # ADIM 4: Git commit + push
        await update.message.reply_text("💾 *Adım 4/7:* Git commit & push yapılıyor...")
        commit_hash, branch = await git_operations(
            project_path, task_description, config, reporter
        )

        # ADIM 5: Testleri çalıştır
        await update.message.reply_text("🧪 *Adım 5/7:* Testler çalıştırılıyor...")
        test_passed = await run_tests(project_path, config["test_commands"], reporter)

        # ADIM 6: Health check
        await update.message.reply_text("🏥 *Adım 6/7:* Health check yapılıyor...")
        if config.get("health_check"):
            await check_health(config["health_check"], reporter)

        # ADIM 7: Deploy
        deploy_script = project_path / config["deploy_script"]
        if deploy_script.exists():
            await update.message.reply_text("🚀 *Adım 7/7:* Deploy başlatılıyor...")
            await run_deploy(project_path, config, reporter)
        else:
            reporter.add_test("Deploy", False, "Deploy script bulunamadı (atlanıyor)")

        # ── DETAYLI RAPOR ────────────────────────────────
        elapsed = (datetime.now() - start_time).total_seconds()
        minutes = int(elapsed // 60)
        seconds = int(elapsed % 60)

        github_url = config["github_url"]
        commit_short = commit_hash[:8] if len(commit_hash) > 8 else commit_hash

        report = f"""🤖 *AI DEVELOPER BOT - DETAYLI RAPOR*
━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📌 *Görev:* {task_description}
📂 *Proje:* {project_name}
⏱️ *Süre:* {minutes}dk {seconds}s
🧠 *Model:* {model}
🎯 *Durum:* {'✅ BAŞARILI' if not reporter.errors else '⚠️ HATALAR MEVCUT'}

"""

        # Değişen dosyalar
        if reporter.changes:
            report += f"📂 *Değişen Dosyalar ({len(reporter.changes)}):*\n"
            for change in reporter.changes:
                report += f"  ✏️ `{change['file']}`\n"
                desc_lines = change["description"].split("\n")
                for line in desc_lines[:3]:
                    line = line.strip("- ").strip()
                    if line:
                        report += f"     • {line}\n"
            report += "\n"

        # Test sonuçları
        if reporter.tests:
            passed = sum(1 for t in reporter.tests if t["passed"])
            total = len(reporter.tests)
            report += f"🧪 *Test Sonuçları ({passed}/{total}):*\n"
            for test in reporter.tests:
                output = f" - {test['output']}" if test["output"] else ""
                report += f"  {test['status']} {test['name']}{output}\n"
            report += "\n"

        # Git bilgileri
        report += f"""💾 *Git:*
  Commit: `{commit_short}`
  Branch: `{branch}`
  Push: {'✅' if any(t['name'] == 'Git Push' and t['passed'] for t in reporter.tests) else '❌'}

"""

        # Hatalar
        if reporter.errors:
            report += "❌ *Hatalar:*\n"
            for err in reporter.errors:
                report += f"  • [{err['code']}] {err['message']}\n"
                if err.get("solution"):
                    report += f"    Çözüm: {err['solution']}\n"
            report += "\n"

        # GitHub link
        if commit_hash and commit_hash not in ("no-commit", "commit-failed"):
            report += f"🔗 *GitHub:* {github_url}/commit/{commit_hash}\n"

        report += f"\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n🕐 {datetime.now().strftime('%d.%m.%Y %H:%M:%S')}"

        await send_long_message(context.bot, chat_id, report)

    except Exception as e:
        logger.error(f"Görev işleme hatası: {e}", exc_info=True)
        reporter.add_error("SYSTEM", str(e))

        error_msg = (
            f"❌ *HATA OLUŞTU*\n\n"
            f"📂 Proje: {project_name}\n"
            f"📝 Görev: {task_description}\n\n"
            f"⚠️ Hata: {str(e)[:500]}\n\n"
            f"Detaylı log: `journalctl -u telegram-bot -n 50`"
        )
        try:
            await update.message.reply_text(error_msg, parse_mode="Markdown")
        except Exception:
            await update.message.reply_text(error_msg)


# ════════════════════════════════════════════════════════════
# BOT BAŞLATMA
# ════════════════════════════════════════════════════════════

async def post_init(application):
    """Bot başladıktan sonra komutları kaydet."""
    commands = [
        BotCommand("start", "Bot'u başlat"),
        BotCommand("help", "Yardım ve kullanım kılavuzu"),
        BotCommand("projects", "Desteklenen projeleri listele"),
        BotCommand("status", "Sistem durumunu göster"),
        BotCommand("health", "Health check yap"),
        BotCommand("deploy", "Manuel deploy: /deploy [proje]"),
    ]
    await application.bot.set_my_commands(commands)
    logger.info("Bot komutları kaydedildi.")


def main():
    """Bot'u başlat."""
    if not TELEGRAM_BOT_TOKEN or TELEGRAM_BOT_TOKEN == "your_bot_token_here":
        logger.critical("TELEGRAM_BOT_TOKEN eksik! .env dosyasını kontrol edin.")
        sys.exit(1)

    if not ANTHROPIC_API_KEY:
        logger.warning("ANTHROPIC_API_KEY eksik. AI özellikleri devre dışı olacak.")

    logger.info("=" * 50)
    logger.info("AI Developer Bot başlatılıyor...")
    logger.info(f"Projeler: {', '.join(PROJECT_CONFIGS.keys())}")
    logger.info(f"Yetkili ID'ler: {ALLOWED_CHAT_IDS or 'Herkese açık (dev mode)'}")
    logger.info("=" * 50)

    application = ApplicationBuilder().token(TELEGRAM_BOT_TOKEN).post_init(post_init).build()

    # Komut handler'ları
    application.add_handler(CommandHandler("start", cmd_start))
    application.add_handler(CommandHandler("help", cmd_help))
    application.add_handler(CommandHandler("projects", cmd_projects))
    application.add_handler(CommandHandler("status", cmd_status))
    application.add_handler(CommandHandler("health", cmd_health))
    application.add_handler(CommandHandler("deploy", cmd_deploy))

    # Görev mesaj handler'ı
    application.add_handler(
        MessageHandler(filters.TEXT & (~filters.COMMAND), handle_task_message)
    )

    logger.info("Bot çalışıyor! Telegram'dan mesaj bekleniyor...")
    application.run_polling(drop_pending_updates=True)


if __name__ == "__main__":
    main()
