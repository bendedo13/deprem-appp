import os
import logging
import asyncio
import subprocess
from typing import List, Optional
from pathlib import Path

from telegram import Update
from telegram.ext import ApplicationBuilder, ContextTypes, MessageHandler, filters
from anthropic import Anthropic
from dotenv import load_dotenv

# Load environment variables
# Load from .env file in parent directory if script is in scripts/
env_path = Path(__file__).resolve().parent.parent / '.env'
load_dotenv(dotenv_path=env_path)

# Configuration
TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY")
BASE_DIR = Path("/opt")

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
    Sen uzman bir yazılım geliştiricisin. Sana verilen proje dosyalarını ve görevi analiz ederek gerekli kod değişikliklerini yapmalısın.
    
    Kurallar:
    1. Sadece gerekli değişiklikleri yap.
    2. Cevabın SADECE geçerli Python/JavaScript/TypeScript kodu içermelidir veya XML formatında dosya güncellemeleri olmalıdır.
    3. Dosyaları güncellemek için şu formatı kullan:
    
    <file path="path/to/file.ext">
    ... yeni dosya içeriği ...
    </file>
    
    Eğer yeni dosya oluşturulacaksa aynı formatı kullan.
    Sadece değişen veya yeni dosyaları döndür.
    """
    
    user_prompt = f"""
    GÖREV: {task}
    
    MEVCUT DOSYALAR:
    {context[:100000]} # Truncate if too long
    
    Lütfen görevi yerine getirmek için gerekli kod değişikliklerini üret.
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

def apply_changes(response: str, project_path: Path) -> List[str]:
    """Parse Claude's response and apply changes to files."""
    import re
    changed_files = []
    pattern = r'<file path="(.*?)">\s*(.*?)\s*</file>'
    matches = re.finditer(pattern, response, re.DOTALL)
    
    for match in matches:
        rel_path = match.group(1)
        content = match.group(2)
        full_path = project_path / rel_path
        full_path.parent.mkdir(parents=True, exist_ok=True)
        with open(full_path, 'w', encoding='utf-8') as f:
            f.write(content)
        changed_files.append(rel_path)
        logger.info(f"Updated file: {rel_path}")
        
    return changed_files

async def handle_message(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle incoming Telegram messages."""
    msg = update.message.text
    chat_id = update.effective_chat.id
    
    if not msg.startswith("Görev:"):
        return

    try:
        _, content = msg.split(":", 1)
        project_name, task_description = content.split("-", 1)
        project_name = project_name.strip()
        task_description = task_description.strip()
    except ValueError:
        await context.bot.send_message(chat_id=chat_id, text="⚠️ Format hatası! Kullanım: `Görev: [Proje_Adı] - [Yapılacak Değişiklik]`")
        return

    project_path = BASE_DIR / project_name
    if not project_path.exists():
        project_path = Path.cwd() # Fallback for testing locally
    
    await context.bot.send_message(chat_id=chat_id, text=f"🤖 Görev alındı: {project_name}\nAnaliz ediliyor...")
    
    try:
        context_data = await get_project_files(project_path)
        await context.bot.send_message(chat_id=chat_id, text="🧠 Claude ile kodlanıyor...")
        ai_response = await ask_claude_to_code(task_description, context_data)
        
        changed_files = apply_changes(ai_response, project_path)
        
        if not changed_files:
            await context.bot.send_message(chat_id=chat_id, text="⚠️ Claude herhangi bir değişiklik önermedi.")
            return

        await context.bot.send_message(chat_id=chat_id, text="💾 Git işlemleri yapılıyor...")
        
        await run_command("git add .", project_path)
        await run_command(f'git commit -m "AI Update: {task_description}"', project_path)
        _, _, code = await run_command("git push", project_path)
        push_status = "✅ Başarılı" if code == 0 else "❌ Başarısız"
        
        deploy_status = "⏭️ Atlandı"
        deploy_script = project_path / "deploy/PRODUCTION_DEPLOY.sh"
        if deploy_script.exists():
             await context.bot.send_message(chat_id=chat_id, text="🚀 Deploy başlatılıyor...")
             _, _, code = await run_command(f"bash {deploy_script}", project_path)
             deploy_status = "✅ Başarılı" if code == 0 else "❌ Başarısız"
        
        report = f"""
✅ **Görev Tamamlandı!**

📂 **Proje:** {project_name}
📝 **Görev:** {task_description}

🛠️ **Değişiklikler:**
{chr(10).join([f"- {f}" for f in changed_files])}

☁️ **Git Push:** {push_status}
🚀 **Deploy:** {deploy_status}
"""
        await context.bot.send_message(chat_id=chat_id, text=report)

    except Exception as e:
        logger.error(f"Error processing task: {e}")
        await context.bot.send_message(chat_id=chat_id, text=f"❌ Hata:\n{str(e)}")

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
