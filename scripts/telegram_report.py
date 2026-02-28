import os
import sys
import logging
import asyncio
import httpx
from anthropic import Anthropic

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Load environment variables
TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")
TELEGRAM_CHAT_ID = os.getenv("TELEGRAM_CHAT_ID")
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY")

async def get_git_diff():
    """Get the git diff since the last commit."""
    try:
        process = await asyncio.create_subprocess_shell(
            "git diff HEAD",
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE
        )
        stdout, stderr = await process.communicate()
        if process.returncode != 0:
            logger.error(f"Error getting git diff: {stderr.decode()}")
            return ""
        return stdout.decode()
    except Exception as e:
        logger.error(f"Exception getting git diff: {e}")
        return ""

async def generate_summary(diff_content):
    """Generate a summary of changes using Claude."""
    if not ANTHROPIC_API_KEY:
        logger.warning("ANTHROPIC_API_KEY not found. Skipping summary generation.")
        return "Özet oluşturulamadı (API Key eksik)."
    
    if not diff_content:
        return "Değişiklik bulunamadı."

    try:
        client = Anthropic(api_key=ANTHROPIC_API_KEY)
        prompt = f"""
        Aşağıdaki kod değişikliklerini incele ve yapılan işleri teknik olmayan bir dille, maddeler halinde Türkçe özetle.
        Özetin şu formatta olmalı:
        
        🚀 **Yapılan Değişiklikler ve Geliştirmeler**
        
        - [Değişiklik 1]
        - [Değişiklik 2]
        ...
        
        Git Diff:
        {diff_content[:10000]}  # Truncate to avoid token limits
        """
        
        message = client.messages.create(
            model="claude-3-haiku-20240307",
            max_tokens=1000,
            temperature=0,
            messages=[{"role": "user", "content": prompt}]
        )
        return message.content[0].text
    except Exception as e:
        logger.error(f"Error generating summary: {e}")
        return f"Özet oluşturulurken hata oluştu: {e}"

async def send_telegram_message(message):
    """Send a message to Telegram."""
    if not TELEGRAM_BOT_TOKEN or not TELEGRAM_CHAT_ID:
        logger.warning("TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID not found. Skipping Telegram message.")
        print(f"Would have sent to Telegram:\n{message}")
        return

    url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage"
    payload = {
        "chat_id": TELEGRAM_CHAT_ID,
        "text": message,
        "parse_mode": "Markdown"
    }
    
    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(url, json=payload)
            response.raise_for_status()
            logger.info("Telegram message sent successfully.")
        except httpx.HTTPStatusError as e:
            logger.error(f"Error sending Telegram message: {e.response.text}")
        except Exception as e:
            logger.error(f"Exception sending Telegram message: {e}")

async def main():
    logger.info("Starting Telegram report script...")
    
    # 1. Get changes
    diff_content = await get_git_diff()
    
    # 2. Check if REPORT.md exists and use it if available
    report_content = ""
    if os.path.exists("REPORT.md"):
        with open("REPORT.md", "r", encoding="utf-8") as f:
            report_content = f.read()
    
    # 3. Generate summary if REPORT.md is empty or missing
    if not report_content.strip():
        logger.info("REPORT.md is empty or missing. Generating summary from git diff...")
        report_content = await generate_summary(diff_content)
    
    # 4. Send to Telegram
    await send_telegram_message(report_content)

if __name__ == "__main__":
    asyncio.run(main())
