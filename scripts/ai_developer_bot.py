"""
AI Developer Telegram Bot v3
==============================
Telegram üzerinden görev alıp Anthropic Claude API ile kodlayan,
test eden, push eden ve Telegram'a rapor gönderen otomasyon botu.

Desteklenen projeler: eyeoftrv2, deprem-appp, astroloji

Görev Kabul Yöntemleri:
  1. Komut:   /deprem Ana sayfaya buton ekle
  2. Komut:   /eye Login sayfasını güncelle
  3. Komut:   /astro Burç API entegre et
  4. Metin:   Görev: depremapp - Ana sayfaya buton ekle

Diğer Komutlar: /start, /help, /projects, /status, /deploy, /health
"""

import os
import re
import sys
import signal
import logging
import asyncio
import subprocess
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

# ── Environment ──────────────────────────────────────────
env_path = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(dotenv_path=env_path)

TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY")
TELEGRAM_CHAT_ID = os.getenv("TELEGRAM_CHAT_ID")
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
    logger.warning("ANTHROPIC_API_KEY bulunamadı — AI özellikleri devre dışı.")

# ── Claude Model Listesi (güncel, çalışan modeller) ──────
# İlk model denenir, başarısız olursa sonraki denenir
MODELS_PRIMARY = ["claude-sonnet-4-6", "claude-haiku-4-5-20251001"]
MODELS_FAST = ["claude-haiku-4-5-20251001", "claude-sonnet-4-6"]

# ── Proje Yapılandırmaları ───────────────────────────────
PROJECT_CONFIGS: Dict[str, dict] = {
    "eyeoftrv2": {
        "path": BASE_DIR / "eye-of-tr-v2",
        "github_repo": "bendedo13/eye-of-tr-v2",
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


# ════════════════════════════════════════════════════════════
# YARDIMCI FONKSİYONLAR
# ════════════════════════════════════════════════════════════

def resolve_project(name: str) -> Optional[str]:
    """Proje ismini veya takma adını standart isme çevir."""
    name = name.strip().lower()
    if name in PROJECT_CONFIGS:
        return name
    return PROJECT_ALIASES.get(name)


def is_authorized(chat_id: int) -> bool:
    """Chat ID yetkili mi kontrol et."""
    if not ALLOWED_CHAT_IDS:
        return True
    return chat_id in ALLOWED_CHAT_IDS


def escape_md(text: str) -> str:
    """Telegram Markdown v1 için özel karakterleri escape et."""
    # Markdown v1'de sorun yaratan karakterler: _ * [ ] ( ) ~ ` > # + - = | { } . !
    # Sadece en sık sorun çıkaranları escape edelim
    for ch in ("_", "*", "[", "]", "(", ")", "`"):
        text = text.replace(ch, f"\\{ch}")
    return text


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
    """Telegram mesajı gönder. Markdown başarısız olursa düz metin gönder."""
    # Telegram 4096 karakter limiti
    max_len = 4000
    if len(text) <= max_len:
        try:
            await bot.send_message(chat_id=chat_id, text=text, parse_mode=parse_mode)
        except Exception:
            # Markdown parse hatası — düz metin olarak tekrar dene
            try:
                await bot.send_message(chat_id=chat_id, text=text)
            except Exception as e:
                logger.error(f"Mesaj gönderilemedi: {e}")
        return

    # Uzun mesajları parçala
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
                        content = content[:30_000] + "\n... (dosya kırpıldı)"
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
        "performance", "optimization", "docker", "deploy",
    ]
    if any(kw in task.lower() for kw in complex_kw) or context_size > 50_000:
        return MODELS_PRIMARY
    return MODELS_FAST


async def ask_claude(task: str, context: str, project_name: str) -> tuple:
    """Claude'a görev gönder ve cevabı al."""
    if not client:
        raise RuntimeError("Anthropic API anahtarı eksik!")

    models = pick_models(task, len(context))
    logger.info(f"Modeller: {models} | Proje: {project_name}")

    system_prompt = """Sen uzman bir Türk yazılım geliştiricisin. Verilen proje dosyalarını ve görevi analiz ederek gerekli kod değişikliklerini yap.

KURALLAR:
1. Sadece gerekli değişiklikleri yap, gereksiz kod ekleme.
2. Kod kalitesine ve best practice'lere dikkat et.
3. Türkçe yorum satırları ekle.
4. Dosyaları güncellemek için şu formatı kullan:

<file path="relative/path/to/file.ext">
... dosyanın tam yeni içeriği ...
</file>

<explanation>
- Değişiklik açıklaması (Türkçe)
</explanation>

5. Sadece değişen veya yeni dosyaları döndür.
6. Test edilebilir, çalışır kod yaz.
7. Güvenlik açığı bırakma."""

    max_ctx = 180_000
    user_prompt = f"""PROJE: {project_name}
GÖREV: {task}

MEVCUT DOSYALAR:
{context[:max_ctx]}

Lütfen görevi yerine getirmek için gerekli kod değişikliklerini üret."""

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


def apply_changes(response: str, project_path: Path) -> List[dict]:
    """Claude'un cevabından dosya değişikliklerini uygula."""
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
            logger.warning(f"GÜVENLIK: Proje dışı yazım engellendi: {rel_path}")
            continue

        full_path.parent.mkdir(parents=True, exist_ok=True)
        full_path.write_text(content, encoding="utf-8")

        explanation = explanations[idx].strip() if idx < len(explanations) else "Dosya güncellendi"
        changes.append({"file": rel_path, "description": explanation})
        logger.info(f"Dosya güncellendi: {rel_path}")

    return changes


# ════════════════════════════════════════════════════════════
# GIT İŞLEMLERİ
# ════════════════════════════════════════════════════════════

async def get_current_branch(project_path: Path) -> str:
    """Mevcut git branch'ini al."""
    out, _, code = await run_cmd("git branch --show-current", project_path)
    return out.strip() if code == 0 and out.strip() else "main"


async def git_commit_and_push(project_path: Path, task: str, config: dict) -> dict:
    """
    Git add + commit + push yap.
    Sonuç dict döndür: {hash, branch, pushed, error}
    """
    result = {"hash": "", "branch": "", "pushed": False, "error": ""}

    # Branch belirle (config'den veya aktif branch)
    branch = await get_current_branch(project_path)
    if not branch or branch == "HEAD":
        branch = config.get("branch", "main")
    result["branch"] = branch

    # Stage
    await run_cmd("git add -A", project_path)

    # Commit
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M")
    safe_task = task[:80].replace('"', "'")
    commit_msg = f"AI Bot: {safe_task} [{timestamp}]"
    stdout, stderr, code = await run_cmd(f'git commit -m "{commit_msg}"', project_path)

    if code != 0:
        combined = stdout + stderr
        if "nothing to commit" in combined:
            result["error"] = "nothing_to_commit"
        else:
            result["error"] = f"commit_failed: {stderr[:200]}"
        return result

    # Commit hash al
    out, _, _ = await run_cmd("git rev-parse HEAD", project_path)
    result["hash"] = out.strip()

    # Push (retry 4 kez, exponential backoff)
    for attempt in range(4):
        _, stderr, code = await run_cmd(
            f"git push origin {branch}", project_path, timeout=60
        )
        if code == 0:
            result["pushed"] = True
            logger.info(f"Git push başarılı: {branch}")
            break
        wait = 2 ** (attempt + 1)
        logger.warning(f"Push denemesi {attempt+1}/4 başarısız, {wait}s bekleniyor...")
        await asyncio.sleep(wait)

    if not result["pushed"]:
        result["error"] = f"push_failed: {stderr[:200]}"
        logger.error(f"Git push başarısız (4 deneme): {stderr[:200]}")

    return result


async def ensure_cloned(project_path: Path, config: dict, bot, chat_id: int) -> bool:
    """Proje yoksa clone et."""
    if project_path.exists():
        # Mevcut projeyi güncelle
        await run_cmd(f"git pull origin {config.get('branch', 'main')}", project_path, timeout=60)
        return True

    repo = config["github_repo"]
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
    """Test komutlarını çalıştır ve sonuçları döndür."""
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
    """HTTP health check yap."""
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
) -> str:
    """Telegram'a gönderilecek rapor mesajını oluştur."""
    minutes = int(elapsed_seconds // 60)
    seconds = int(elapsed_seconds % 60)

    has_errors = bool(errors) or not git_result.get("pushed", False)
    status = "BASARILI" if not has_errors else "HATALAR MEVCUT"
    status_icon = "✅" if not has_errors else "⚠️"

    report = f"🤖 RAPOR\n{'━' * 20}\n"
    report += f"📌 {task[:200]}\n"
    report += f"📂 {project_name} | ⏱️ {minutes}dk {seconds}s\n"
    report += f"🧠 {model_used}\n"
    report += f"🎯 {status_icon} {status}\n\n"

    # Değişen dosyalar
    if changes:
        report += f"📂 Dosyalar ({len(changes)}):\n"
        for c in changes[:15]:
            report += f"  ✏️ {c['file']}\n"
        report += "\n"

    # Test sonuçları
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

    # Git bilgileri
    commit_hash = git_result.get("hash", "")
    branch = git_result.get("branch", "?")
    pushed = git_result.get("pushed", False)
    commit_short = commit_hash[:8] if commit_hash else "yok"

    push_icon = "✅" if pushed else "❌"
    report += f"💾 Commit: {commit_short} | Branch: {branch}\n"
    report += f"   Push: {push_icon}\n"

    # GitHub linki — sadece push başarılıysa göster
    if pushed and commit_hash and len(commit_hash) >= 7:
        github_repo = PROJECT_CONFIGS.get(project_name, {}).get("github_repo", "")
        if github_repo:
            report += f"\n🔗 GitHub: https://github.com/{github_repo}/commit/{commit_hash}\n"

    # Hatalar
    if errors:
        report += "\n❌ Hatalar:\n"
        for err in errors[:5]:
            report += f"  • {err}\n"

    report += f"\n{'━' * 20}\n🕐 {datetime.now().strftime('%d.%m.%Y %H:%M')}"
    return report


# ════════════════════════════════════════════════════════════
# BİRLEŞİK GÖREV İŞLEYİCİ
# ════════════════════════════════════════════════════════════

async def execute_task(bot, chat_id: int, project_name: str, task_description: str):
    """Tüm görev akışını çalıştırır — tek giriş noktası."""
    config = PROJECT_CONFIGS[project_name]
    project_path = config["path"]
    start_time = datetime.now()
    errors = []

    # 0. Proje clone/pull
    if not await ensure_cloned(project_path, config, bot, chat_id):
        return

    await safe_send(
        bot, chat_id,
        f"🤖 Görev Alındı!\n📂 {project_name}\n📝 {task_description[:300]}\n⏳ İşlem başlıyor..."
    )

    changes = []
    test_results = []
    health_result = None
    git_result = {"hash": "", "branch": "", "pushed": False, "error": ""}
    model_used = "?"

    try:
        # 1. Dosyaları oku
        await safe_send(bot, chat_id, "🔍 1/6 — Dosyalar okunuyor...")
        extensions = config.get("extensions", [".py", ".ts", ".tsx", ".js"])
        context_data = await read_project_files(project_path, extensions)
        if not context_data:
            await safe_send(bot, chat_id, "⚠️ Proje dosyası bulunamadı!")
            return

        # 2. Claude AI
        await safe_send(bot, chat_id, "🧠 2/6 — Claude kodluyor...")
        ai_response, model_used = await ask_claude(task_description, context_data, project_name)

        # 3. Değişiklikleri uygula
        await safe_send(bot, chat_id, "📝 3/6 — Değişiklikler uygulanıyor...")
        changes = apply_changes(ai_response, project_path)
        if not changes:
            await safe_send(bot, chat_id, "⚠️ Değişiklik üretilemedi. Görevi daha detaylı yazın.")
            return

        # 4. Git commit & push
        await safe_send(bot, chat_id, "💾 4/6 — Git commit & push...")
        git_result = await git_commit_and_push(project_path, task_description, config)
        if git_result["error"]:
            errors.append(git_result["error"])

        # 5. Test
        await safe_send(bot, chat_id, "🧪 5/6 — Testler çalışıyor...")
        test_results = await run_tests(project_path, config["test_commands"])

        # 6. Health check
        if config.get("health_check"):
            await safe_send(bot, chat_id, "🏥 6/6 — Health check...")
            health_result = await check_health(config["health_check"])

    except Exception as e:
        logger.error(f"Görev hatası: {e}", exc_info=True)
        errors.append(str(e)[:300])

    # Rapor oluştur ve gönder
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
    )
    await safe_send(bot, chat_id, report)


# ════════════════════════════════════════════════════════════
# TELEGRAM KOMUTLARI
# ════════════════════════════════════════════════════════════

async def cmd_start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if not is_authorized(update.effective_chat.id):
        await update.message.reply_text("⛔ Yetkiniz yok.")
        return
    text = (
        "🤖 AI Developer Bot v3\n\n"
        "Görev Gönder:\n"
        "  /deprem Ana sayfaya buton ekle\n"
        "  /eye Login sayfasını güncelle\n"
        "  /astro Burç detay sayfası ekle\n"
        "  Görev: depremapp - buton ekle\n\n"
        "Komutlar: /help /projects /status /health /deploy"
    )
    await update.message.reply_text(text)


async def cmd_help(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if not is_authorized(update.effective_chat.id):
        return
    text = (
        "📖 Kullanım\n\n"
        "Hızlı: /deprem [görev]  /eye [görev]  /astro [görev]\n"
        "Detaylı: Görev: [proje] - [açıklama]\n\n"
        "Akış: Dosya oku → Claude AI → Kod yaz → Git push → Test → Rapor\n\n"
        "Uzun görevler desteklenir."
    )
    await update.message.reply_text(text)


async def cmd_projects(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if not is_authorized(update.effective_chat.id):
        return
    text = "📂 Projeler:\n\n"
    for name, cfg in PROJECT_CONFIGS.items():
        exists = "✅" if cfg["path"].exists() else "❌"
        text += f"{name} (/{cfg['short_cmd']})\n  {cfg['description']}\n  {exists} {cfg['path']}\n\n"
    await update.message.reply_text(text)


async def cmd_status(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if not is_authorized(update.effective_chat.id):
        return
    api_status = "✅" if client else "❌"
    text = f"📊 Sistem\n🤖 API: {api_status}\n\n"
    for name, cfg in PROJECT_CONFIGS.items():
        exists = cfg["path"].exists()
        text += f"{name} (/{cfg['short_cmd']}): {'✅' if exists else '❌'}\n"
        if exists:
            out, _, code = await run_cmd("git log -1 --format='%h %s (%cr)'", cfg["path"])
            if code == 0 and out:
                text += f"  {out[:80]}\n"
    await update.message.reply_text(text)


async def cmd_health(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if not is_authorized(update.effective_chat.id):
        return
    await update.message.reply_text("🔍 Health check yapılıyor...")

    text = "🏥 Health Check:\n\n"

    # Docker durumu
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

    deploy_script = cfg["path"] / cfg["deploy_script"]
    if deploy_script.exists():
        stdout, stderr, code = await run_cmd(
            f"bash {deploy_script}", cfg["path"], timeout=600
        )
        deploy_ok = code == 0
    else:
        deploy_ok = False

    # Health check
    health_ok = False
    if cfg.get("health_check"):
        result = await check_health(cfg["health_check"])
        health_ok = result["passed"]

    deploy_icon = "✅" if deploy_ok else "❌"
    health_icon = "✅" if health_ok else "❌"
    text = f"🚀 Deploy: {deploy_icon}\n🏥 Health: {health_icon}"
    await update.message.reply_text(text)


# ════════════════════════════════════════════════════════════
# PROJE KOMUT HANDLER (/deprem, /eye, /astro)
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
            f"📂 {project_name}\n\nKullanım: /{command} [görev]\nÖrnek: /{command} Ana sayfaya buton ekle"
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
            "⚠️ Kullanım: Görev: deprem - açıklama\nveya: /deprem açıklama"
        )
        return

    project_name = resolve_project(project_raw)
    if not project_name:
        names = ", ".join(f"/{c['short_cmd']}" for c in PROJECT_CONFIGS.values())
        await update.message.reply_text(
            f"❌ Bilinmeyen proje: {project_raw}\nKomutlar: {names}"
        )
        return

    await execute_task(context.bot, chat_id, project_name, task_description)


# ════════════════════════════════════════════════════════════
# BOT BAŞLATMA
# ════════════════════════════════════════════════════════════

async def post_init(application):
    """Bot başlatıldıktan sonra komut listesini ayarla."""
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


def kill_old_instances():
    """Çakışan bot process'lerini durdur (Telegram Conflict hatası önleme)."""
    my_pid = os.getpid()
    try:
        result = subprocess.run(
            ["pgrep", "-f", "ai_developer_bot.py"],
            capture_output=True, text=True, timeout=5
        )
        if result.stdout:
            for line in result.stdout.strip().split("\n"):
                pid = int(line.strip())
                if pid != my_pid:
                    logger.warning(f"Eski bot (PID {pid}) durduruluyor...")
                    try:
                        os.kill(pid, signal.SIGTERM)
                    except (ProcessLookupError, PermissionError):
                        pass
    except Exception:
        pass


async def clean_webhook():
    """Başlamadan önce webhook çakışmasını temizle."""
    import httpx
    try:
        async with httpx.AsyncClient() as http:
            url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/deleteWebhook"
            resp = await http.post(url, params={"drop_pending_updates": True}, timeout=10)
            data = resp.json()
            if data.get("ok"):
                logger.info("Webhook temizlendi, bekleyen güncellemeler düşürüldü")
    except Exception as e:
        logger.warning(f"Webhook temizleme hatası (devam ediliyor): {e}")


def main():
    if not TELEGRAM_BOT_TOKEN:
        logger.critical("TELEGRAM_BOT_TOKEN eksik! .env dosyasını kontrol edin.")
        sys.exit(1)

    # Çakışan bot instance'larını durdur
    kill_old_instances()
    import time
    time.sleep(2)

    # Webhook temizliği
    asyncio.run(clean_webhook())

    logger.info("=" * 50)
    logger.info("AI Developer Bot v3 başlatılıyor...")
    logger.info(f"Projeler: {', '.join(PROJECT_CONFIGS.keys())}")
    logger.info(f"Yetkili chat ID'ler: {ALLOWED_CHAT_IDS or 'Herkese açık'}")
    logger.info("=" * 50)

    app = ApplicationBuilder().token(TELEGRAM_BOT_TOKEN).post_init(post_init).build()

    # Sistem komutları
    app.add_handler(CommandHandler("start", cmd_start))
    app.add_handler(CommandHandler("help", cmd_help))
    app.add_handler(CommandHandler("projects", cmd_projects))
    app.add_handler(CommandHandler("status", cmd_status))
    app.add_handler(CommandHandler("health", cmd_health))
    app.add_handler(CommandHandler("deploy", cmd_deploy))

    # Proje komutları — /deprem, /eye, /astro ve takma adlar
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
        app.add_handler(CommandHandler(cmd, cmd_project_task))

    # Metin görev handler
    app.add_handler(MessageHandler(filters.TEXT & (~filters.COMMAND), handle_task_message))

    logger.info(f"Proje komutları: /{', /'.join(sorted(project_cmds))}")
    logger.info("Bot çalışıyor! Telegram'dan görev gönderin.")
    app.run_polling(drop_pending_updates=True)


if __name__ == "__main__":
    main()
