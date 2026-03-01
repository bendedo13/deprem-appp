import os
import logging
import asyncio
import subprocess
from typing import List, Optional
from pathlib import Path
import sys

from telegram import Update
from telegram.ext import ApplicationBuilder, ContextTypes, MessageHandler, filters
from anthropic import Anthropic
from dotenv import load_dotenv

# TaskReporter'ı import et
sys.path.append(str(Path(__file__).resolve().parent.parent))
from bot_utils.task_reporter import TaskReporter

# Load environment variables
# Load from .env file in parent directory if script is in scripts/
env_path = Path(__file__).resolve().parent.parent / '.env'
load_dotenv(dotenv_path=env_path)

# Configuration
TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY")
BASE_DIR = Path("/opt")

# Proje yapılandırmaları
PROJECT_CONFIGS = {
    "eyeoftr": {
        "path": BASE_DIR / "eyeoftr",
        "github": "https://github.com/bendedo13/eyeoftr",
        "deploy_script": "deploy.sh",
        "test_commands": ["npm test", "npm run lint"],
        "health_check": "http://localhost:3000"
    },
    "faceseek": {
        "path": BASE_DIR / "faceseek",
        "github": "https://github.com/bendedo13/faceseek",
        "deploy_script": "deploy.sh",
        "test_commands": ["npm test"],
        "health_check": "http://localhost:3001"
    },
    "depremapp": {
        "path": BASE_DIR / "deprem-appp",
        "github": "https://github.com/bendedo13/deprem-appp",
        "deploy_script": "deploy/PRODUCTION_DEPLOY.sh",
        "test_commands": ["docker-compose ps"],
        "health_check": "http://localhost:8001/health"
    },
    "astroloji": {
        "path": BASE_DIR / "astroloji",
        "github": "https://github.com/bendedo13/astroloji",
        "deploy_script": "deploy.sh",
        "test_commands": ["npm test"],
        "health_check": "http://localhost:3002"
    }
}

# Configure logging
logging.basicConfig(
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    level=logging.INFO
)
logger = logging.getLogger(__name__)

# Initialize Anthropic Client
if ANTHROPIC_API_KEY:
    client = Anthropic(api_key=ANTHROPIC_API_KEY)
else:
    logger.warning("ANTHROPIC_API_KEY not found. AI features will be disabled.")
    client = None

async def run_command(command: str, cwd: Path) -> tuple[str, str, int]:
    """Run a shell command asynchronously."""
    try:
        process = await asyncio.create_subprocess_shell(
            command,
            cwd=cwd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE
        )
        stdout, stderr = await process.communicate()
        return stdout.decode().strip(), stderr.decode().strip(), process.returncode
    except Exception as e:
        logger.error(f"Command execution failed: {e}")
        return "", str(e), 1

async def get_project_files(project_path: Path, extensions: List[str] = ['.py', '.tsx', '.ts', '.js', '.html', '.css']) -> str:
    """Read relevant project files to provide context."""
    file_contents = []
    try:
        for ext in extensions:
            for file_path in project_path.rglob(f"*{ext}"):
                if any(part in file_path.parts for part in ['venv', 'node_modules', '.git', '__pycache__', 'dist', 'build']):
                    continue
                try:
                    with open(file_path, 'r', encoding='utf-8') as f:
                        content = f.read()
                        if len(content) < 20000:
                            file_contents.append(f"--- {file_path.relative_to(project_path)} ---\n{content}\n")
                except Exception as e:
                    logger.warning(f"Could not read file {file_path}: {e}")
    except Exception as e:
        logger.error(f"Error scanning files: {e}")
    return "\n".join(file_contents)

async def ask_claude_to_code(task: str, context: str) -> str:
    """Send task and context to Claude and get the code changes."""
    if not client:
        raise Exception("Anthropic API key is missing.")

    system_prompt = """
    Sen uzman bir Türk yazılım geliştiricisin. Sana verilen proje dosyalarını ve görevi analiz ederek gerekli kod değişikliklerini yapmalısın.
    
    KURALLAR:
    1. Sadece gerekli değişiklikleri yap, gereksiz kod ekleme.
    2. Kod kalitesine ve best practice'lere dikkat et.
    3. Türkçe yorum satırları ekle (önemli yerlere).
    4. Cevabın SADECE XML formatında dosya güncellemeleri içermelidir.
    5. Dosyaları güncellemek için şu formatı kullan:
    
    <file path="path/to/file.ext">
    ... yeni dosya içeriği ...
    </file>
    
    <explanation>
    Bu dosyada şu değişiklikleri yaptım:
    - Değişiklik 1 açıklaması
    - Değişiklik 2 açıklaması
    </explanation>
    
    6. Her dosya değişikliğinden sonra MUTLAKA <explanation> tagı ile Türkçe açıklama yap.
    7. Sadece değişen veya yeni dosyaları döndür.
    8. Test edilebilir, çalışır kod yaz.
    """
    
    user_prompt = f"""
    GÖREV: {task}
    
    MEVCUT DOSYALAR:
    {context[:100000]} # Truncate if too long
    
    Lütfen görevi yerine getirmek için gerekli kod değişikliklerini üret.
    Her dosya için <file> ve <explanation> taglarını kullan.
    Açıklamaları Türkçe ve detaylı yap.
    """
    
    try:
        message = client.messages.create(
            model="claude-3-opus-20240229",
            max_tokens=4000,
            temperature=0,
            system=system_prompt,
            messages=[{"role": "user", "content": user_prompt}]
        )
        return message.content[0].text
    except Exception as e:
        logger.error(f"Anthropic API Error: {e}")
        raise

def apply_changes(response: str, project_path: Path, reporter: TaskReporter) -> List[str]:
    """Parse Claude's response and apply changes to files."""
    import re
    changed_files = []
    
    # Dosya değişikliklerini bul
    file_pattern = r'<file path="(.*?)">\s*(.*?)\s*</file>'
    file_matches = re.finditer(file_pattern, response, re.DOTALL)
    
    # Açıklamaları bul
    explanation_pattern = r'<explanation>\s*(.*?)\s*</explanation>'
    explanations = re.findall(explanation_pattern, response, re.DOTALL)
    
    for idx, match in enumerate(file_matches):
        rel_path = match.group(1)
        content = match.group(2)
        full_path = project_path / rel_path
        full_path.parent.mkdir(parents=True, exist_ok=True)
        
        with open(full_path, 'w', encoding='utf-8') as f:
            f.write(content)
        
        # Açıklamayı raporla
        explanation = explanations[idx] if idx < len(explanations) else "Dosya güncellendi"
        reporter.log_change(rel_path, explanation.strip())
        
        changed_files.append(rel_path)
        logger.info(f"Updated file: {rel_path}")
        
    return changed_files

async def run_tests(project_path: Path, test_commands: List[str], reporter: TaskReporter) -> bool:
    """Testleri çalıştır ve sonuçları raporla."""
    all_passed = True
    
    for test_cmd in test_commands:
        try:
            stdout, stderr, code = await run_command(test_cmd, project_path)
            passed = code == 0
            all_passed = all_passed and passed
            
            output = stdout if stdout else stderr
            reporter.add_test(test_cmd, passed, output[:200] if output else "")
            
            logger.info(f"Test '{test_cmd}': {'✅ Başarılı' if passed else '❌ Başarısız'}")
        except Exception as e:
            reporter.add_test(test_cmd, False, str(e))
            all_passed = False
            logger.error(f"Test hatası '{test_cmd}': {e}")
    
    return all_passed

async def check_health_endpoint(url: str, reporter: TaskReporter) -> bool:
    """Health check endpoint'ini kontrol et."""
    try:
        stdout, stderr, code = await run_command(
            f'curl -s -o /dev/null -w "%{{http_code}}" {url}',
            Path.cwd()
        )
        http_code = stdout.strip()
        passed = http_code in ["200", "301", "302"]
        reporter.add_test(f"Health Check ({url})", passed, f"HTTP {http_code}")
        return passed
    except Exception as e:
        reporter.add_test(f"Health Check ({url})", False, str(e))
        return False

async def handle_message(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle incoming Telegram messages."""
    msg = update.message.text
    chat_id = update.effective_chat.id
    
    if not msg.startswith("Görev:"):
        return

    # TaskReporter'ı başlat
    reporter = TaskReporter()
    
    try:
        _, content = msg.split(":", 1)
        project_name, task_description = content.split("-", 1)
        project_name = project_name.strip().lower()
        task_description = task_description.strip()
    except ValueError:
        await context.bot.send_message(
            chat_id=chat_id, 
            text="⚠️ Format hatası!\n\nKullanım: `Görev: [Proje_Adı] - [Yapılacak Değişiklik]`\n\nÖrnek: `Görev: depremapp - Ana sayfaya yeni buton ekle`\n\nMevcut projeler: eyeoftr, faceseek, depremapp, astroloji"
        )
        return

    # Proje yapılandırmasını al
    if project_name not in PROJECT_CONFIGS:
        await context.bot.send_message(
            chat_id=chat_id,
            text=f"❌ Bilinmeyen proje: {project_name}\n\nMevcut projeler:\n" + 
                 "\n".join([f"• {p}" for p in PROJECT_CONFIGS.keys()])
        )
        return
    
    config = PROJECT_CONFIGS[project_name]
    project_path = config["path"]
    
    if not project_path.exists():
        project_path = Path.cwd()  # Fallback for testing locally
    
    await context.bot.send_message(
        chat_id=chat_id, 
        text=f"🤖 *Görev Alındı*\n\n📂 Proje: {project_name}\n📝 Görev: {task_description}\n\n🔍 Analiz ediliyor...",
        parse_mode="Markdown"
    )
    
    try:
        # 1. Proje dosyalarını oku
        context_data = await get_project_files(project_path)
        
        # 2. Claude ile kod değişikliklerini al
        await context.bot.send_message(chat_id=chat_id, text="🧠 Claude ile kodlanıyor...")
        ai_response = await ask_claude_to_code(task_description, context_data)
        
        # 3. Değişiklikleri uygula
        changed_files = apply_changes(ai_response, project_path, reporter)
        
        if not changed_files:
            await context.bot.send_message(chat_id=chat_id, text="⚠️ Claude herhangi bir değişiklik önermedi.")
            return

        # 4. Git işlemleri
        await context.bot.send_message(chat_id=chat_id, text="💾 Git işlemleri yapılıyor...")
        
        await run_command("git add .", project_path)
        commit_msg = f"AI Update: {task_description}"
        stdout, stderr, code = await run_command(f'git commit -m "{commit_msg}"', project_path)
        
        if code != 0:
            reporter.add_error("GIT_COMMIT", "Commit başarısız", stderr[:200])
        
        # Commit hash'i al
        commit_hash, _, _ = await run_command("git rev-parse HEAD", project_path)
        branch, _, _ = await run_command("git branch --show-current", project_path)
        
        # Git push
        _, stderr, code = await run_command("git push", project_path)
        if code == 0:
            reporter.add_test("Git Push", True, "Başarıyla push edildi")
        else:
            reporter.add_test("Git Push", False, stderr[:200])
            reporter.add_error("GIT_PUSH", "Push başarısız", stderr[:200])
        
        # 6. Testleri çalıştır
        await context.bot.send_message(chat_id=chat_id, text="🧪 Testler çalıştırılıyor...")
        test_passed = await run_tests(project_path, config["test_commands"], reporter)
        
        # 7. Health check
        if config.get("health_check"):
            await check_health_endpoint(config["health_check"], reporter)
        
        # 8. Deploy
        deploy_status = "⏭️ Atlandı"
        deploy_script = project_path / config["deploy_script"]
        
        if deploy_script.exists():
            await context.bot.send_message(chat_id=chat_id, text="🚀 Deploy başlatılıyor...")
            stdout, stderr, code = await run_command(f"bash {deploy_script}", project_path)
            
            if code == 0:
                deploy_status = "✅ Başarılı"
                reporter.add_test("Production Deploy", True, "Deploy tamamlandı")
            else:
                deploy_status = "❌ Başarısız"
                reporter.add_test("Production Deploy", False, stderr[:200])
                reporter.add_error("DEPLOY", "Deploy başarısız", stderr[:200])
        
        # 9. Detaylı rapor oluştur ve gönder
        detailed_report = reporter.generate_telegram_message(
            commit_hash.strip(),
            branch.strip(),
            f"{project_name.upper()} - {task_description}"
        )
        
        await context.bot.send_message(
            chat_id=chat_id, 
            text=detailed_report,
            parse_mode="Markdown"
        )
        
        # 10. GitHub link ekle
        github_link = f"\n\n🔗 *GitHub Commit:*\n{config['github']}/commit/{commit_hash.strip()}"
        await context.bot.send_message(
            chat_id=chat_id,
            text=github_link,
            parse_mode="Markdown"
        )

    except Exception as e:
        logger.error(f"Error processing task: {e}")
        reporter.add_error("SYSTEM", str(e), "", "Lütfen logları kontrol edin")
        
        error_report = f"""❌ *HATA OLUŞTU*

📂 Proje: {project_name}
📝 Görev: {task_description}

⚠️ Hata: {str(e)[:500]}

Detaylı log için sunucu loglarını kontrol edin.
"""
        await context.bot.send_message(chat_id=chat_id, text=error_report, parse_mode="Markdown")

if __name__ == '__main__':
    if not TELEGRAM_BOT_TOKEN:
        logger.error("TELEGRAM_BOT_TOKEN eksik! .env dosyasını kontrol edin.")
        # Try to load from input if env failed
        TELEGRAM_BOT_TOKEN = "your_bot_token_here" # Placeholder, user needs to set this in env
        
    if not TELEGRAM_BOT_TOKEN or TELEGRAM_BOT_TOKEN == "your_bot_token_here":
         logger.critical("Bot token is still missing. Exiting.")
         exit(1)
        
    application = ApplicationBuilder().token(TELEGRAM_BOT_TOKEN).build()
    application.add_handler(MessageHandler(filters.TEXT & (~filters.COMMAND), handle_message))
    
    logger.info("Bot başlatıldı...")
    application.run_polling()
