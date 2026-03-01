"""
Telegram Report Script
========================
Git diff'ten otomatik rapor oluşturup Telegram'a gönderir.
CI/CD pipeline'larında veya cron job olarak kullanılabilir.
"""

import os
import logging
import asyncio

import httpx
from anthropic import Anthropic
from dotenv import load_dotenv
from pathlib import Path

# Env yükle
env_path = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(dotenv_path=env_path)

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")
TELEGRAM_CHAT_ID = os.getenv("TELEGRAM_CHAT_ID")
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY")


async def get_git_diff() -> str:
    """Son commit'ten itibaren git diff al."""
    try:
        process = await asyncio.create_subprocess_shell(
            "git diff HEAD~1",
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        stdout, stderr = await process.communicate()
        if process.returncode != 0:
            logger.error(f"Git diff hatası: {stderr.decode()}")
            return ""
        return stdout.decode()
    except Exception as e:
        logger.error(f"Git diff exception: {e}")
        return ""


async def get_git_info() -> dict:
    """Git commit bilgilerini al."""
    info = {}
    cmds = {
        "hash": "git rev-parse --short HEAD",
        "message": "git log -1 --format=%s",
        "author": "git log -1 --format=%an",
        "branch": "git branch --show-current",
    }
    for key, cmd in cmds.items():
        try:
            proc = await asyncio.create_subprocess_shell(
                cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )
            stdout, _ = await proc.communicate()
            info[key] = stdout.decode().strip()
        except Exception:
            info[key] = "bilinmiyor"
    return info


async def generate_summary(diff_content: str) -> str:
    """Claude ile değişikliklerin özetini oluştur."""
    if not ANTHROPIC_API_KEY:
        return "Özet oluşturulamadı (API Key eksik)."
    if not diff_content:
        return "Değişiklik bulunamadı."

    # Model fallback listesi
    models = ["claude-haiku-4-5-20251001", "claude-sonnet-4-6"]
    client = Anthropic(api_key=ANTHROPIC_API_KEY)

    prompt_content = f"""Aşağıdaki kod değişikliklerini incele ve yapılan işleri
teknik olmayan bir dille, maddeler halinde Türkçe özetle.

Format:
🚀 **Yapılan Değişiklikler**

- [Değişiklik 1]
- [Değişiklik 2]
...

Git Diff:
{diff_content[:15000]}"""

    for model in models:
        try:
            logger.info(f"Model deneniyor: {model}")
            message = client.messages.create(
                model=model,
                max_tokens=1500,
                temperature=0,
                messages=[{"role": "user", "content": prompt_content}],
            )
            return message.content[0].text
        except Exception as e:
            logger.warning(f"Model {model} başarısız: {e}")
            continue

    return "Özet oluşturulamadı (tüm modeller başarısız)."


async def send_telegram_message(message: str):
    """Telegram'a mesaj gönder."""
    if not TELEGRAM_BOT_TOKEN or not TELEGRAM_CHAT_ID:
        logger.warning("Telegram token/chat_id eksik.")
        print(f"Telegram mesajı:\n{message}")
        return

    url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage"

    # 4096 karakter limitine göre böl
    max_len = 4000
    parts = [message] if len(message) <= max_len else []
    if len(message) > max_len:
        while message:
            if len(message) <= max_len:
                parts.append(message)
                break
            idx = message.rfind("\n", 0, max_len)
            if idx == -1:
                idx = max_len
            parts.append(message[:idx])
            message = message[idx:].lstrip("\n")

    async with httpx.AsyncClient(timeout=30) as http_client:
        for part in parts:
            payload = {
                "chat_id": TELEGRAM_CHAT_ID,
                "text": part,
                "parse_mode": "Markdown",
            }
            try:
                resp = await http_client.post(url, json=payload)
                resp.raise_for_status()
                logger.info("Telegram mesajı gönderildi.")
            except httpx.HTTPStatusError as e:
                logger.error(f"Telegram API hatası: {e.response.text}")
                # Markdown hatası olabilir, düz metin dene
                payload["parse_mode"] = None
                try:
                    await http_client.post(url, json=payload)
                except Exception:
                    pass
            except Exception as e:
                logger.error(f"Telegram gönderim hatası: {e}")


async def main():
    """Ana rapor akışı."""
    logger.info("Telegram rapor scripti başlıyor...")

    # Git bilgileri
    git_info = await get_git_info()
    diff_content = await get_git_diff()

    # REPORT.md varsa kullan
    report_content = ""
    if os.path.exists("REPORT.md"):
        with open("REPORT.md", "r", encoding="utf-8") as f:
            report_content = f.read().strip()

    # Yoksa AI ile özet oluştur
    if not report_content:
        logger.info("REPORT.md boş/yok. AI ile özet oluşturuluyor...")
        report_content = await generate_summary(diff_content)

    # Mesajı formatla
    message = f"""📋 *Git Raporu*

📌 Commit: `{git_info.get('hash', '?')}`
🌿 Branch: `{git_info.get('branch', '?')}`
👤 Yazar: {git_info.get('author', '?')}
💬 Mesaj: {git_info.get('message', '?')}

{report_content}"""

    await send_telegram_message(message)
    logger.info("Rapor tamamlandı.")


if __name__ == "__main__":
    asyncio.run(main())
