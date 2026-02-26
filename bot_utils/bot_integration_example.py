"""
Telegram Bot Entegrasyon Örneği
================================

Bu dosya, TaskReporter'ı Telegram bot'una nasıl entegre edileceğini gösterir.

Desteklenen Bot Frameworks:
- aiogram (Recommended)
- python-telegram-bot
- pyTelegramBotAPI

Örnek Kullanım:
    from bot_utils import TaskReporter
    from aiogram import Bot

    # Bot komutunu işle
    reporter = TaskReporter()

    # Görev yap
    await run_deployment(reporter)

    # Rapor oluştur
    message = reporter.generate_telegram_message(
        commit_hash="abc1234",
        branch="claude/fix-...",
        task_name="Deployment"
    )

    # Telegram'a gönder
    await bot.send_message(
        chat_id=CHAT_ID,
        text=message,
        parse_mode="Markdown"
    )
"""

import subprocess
import asyncio
from typing import Optional
from datetime import datetime

from task_reporter import TaskReporter


class BotTaskExecutor:
    """
    Telegram bot'u için görev yürütücü.
    Deployment, testing ve raporlama işlemlerini yönetir.
    """

    def __init__(self, bot=None, chat_id: Optional[str] = None):
        """
        Executor'u initialize et.

        Args:
            bot: Aiogram Bot instance
            chat_id: Telegram chat ID (rapor göndermek için)
        """
        self.bot = bot
        self.chat_id = chat_id
        self.reporter = TaskReporter()

    async def send_progress(self, status: str):
        """
        İlerleme durumunu Telegram'a gönder.

        Args:
            status: Durumun açıklaması
        """
        if self.bot and self.chat_id:
            await self.bot.send_message(
                chat_id=self.chat_id,
                text=f"⏳ {status}"
            )

    async def execute_deployment(self, project_path: str = "/home/user/deprem-appp"):
        """
        Deprem App deployment'ını çalıştır ve rapor oluştur.

        Args:
            project_path: Proje root path'i

        Returns:
            Success/Failure
        """
        try:
            await self.send_progress("🚀 Deployment başlanıyor...")

            # 1. Git update
            self.reporter.log_change(
                "Git",
                "Latest changes GitHub'dan çekiliyor",
                None
            )

            result = subprocess.run(
                ["git", "fetch", "origin", "claude/fix-project-errors-dwJIA"],
                cwd=project_path,
                capture_output=True,
                timeout=30
            )

            if result.returncode != 0:
                self.reporter.add_error(
                    "GIT_FETCH_ERROR",
                    result.stderr.decode(),
                    "git fetch",
                    "Ağ bağlantısı kontrol edin"
                )
                return False

            # 2. Docker build
            await self.send_progress("🔨 Docker build yapılıyor...")

            self.reporter.log_change(
                "Docker",
                "Services rebuild ediliyor",
                None
            )

            result = subprocess.run(
                ["docker-compose", "build", "--no-cache"],
                cwd=project_path,
                capture_output=True,
                timeout=600
            )

            if result.returncode != 0:
                self.reporter.add_error(
                    "DOCKER_BUILD_ERROR",
                    result.stderr.decode()[-500:],  # Son 500 char
                    "docker-compose build",
                    "Docker image cache'ini temizle ve tekrar dene"
                )
                return False

            self.reporter.add_test("Docker Build", True, "Success")

            # 3. Services başlat
            await self.send_progress("🚀 Services başlatılıyor...")

            result = subprocess.run(
                ["docker-compose", "up", "-d"],
                cwd=project_path,
                capture_output=True,
                timeout=60
            )

            if result.returncode != 0:
                self.reporter.add_error(
                    "DOCKER_UP_ERROR",
                    result.stderr.decode(),
                    "docker-compose up",
                    "Docker daemon'ın çalışıp çalışmadığını kontrol et"
                )
                return False

            # 4. Health checks
            await self.send_progress("🧪 Health checks yapılıyor...")
            await asyncio.sleep(10)  # Services başlansın diye bekle

            self.reporter.check_health()

            # 5. Rapor oluştur ve gönder
            await self.send_progress("📝 Rapor oluşturuluyor...")

            message = self.reporter.generate_telegram_message(
                commit_hash=self._get_commit_hash(project_path),
                branch="claude/fix-project-errors-dwJIA",
                task_name="Deprem App Deployment"
            )

            if self.bot and self.chat_id:
                await self.bot.send_message(
                    chat_id=self.chat_id,
                    text=message,
                    parse_mode="Markdown"
                )

            return True

        except Exception as e:
            self.reporter.add_error(
                "EXECUTION_ERROR",
                str(e),
                "execute_deployment",
                "Logs'u kontrol et"
            )
            return False

    async def execute_tests(self, project_path: str = "/home/user/deprem-appp"):
        """
        Proje testlerini çalıştır.

        Args:
            project_path: Proje root path'i
        """
        try:
            await self.send_progress("🧪 Testler başlanıyor...")

            # Python syntax test
            result = subprocess.run(
                ["python3", "-m", "py_compile", "backend/app/main.py"],
                cwd=project_path,
                capture_output=True,
                timeout=10
            )

            self.reporter.add_test(
                "Python Syntax Check",
                result.returncode == 0,
                "backend/app/main.py"
            )

            # Frontend build test
            result = subprocess.run(
                ["npm", "run", "build"],
                cwd=f"{project_path}/frontend",
                capture_output=True,
                timeout=120
            )

            self.reporter.add_test(
                "Frontend Build",
                result.returncode == 0,
                "npm run build"
            )

            # Health checks
            self.reporter.check_health()

            return True

        except Exception as e:
            self.reporter.add_error(
                "TEST_ERROR",
                str(e),
                "execute_tests"
            )
            return False

    def _get_commit_hash(self, project_path: str) -> str:
        """Son commit hash'ini al"""
        try:
            result = subprocess.run(
                ["git", "rev-parse", "HEAD"],
                cwd=project_path,
                capture_output=True,
                timeout=5
            )
            return result.stdout.decode().strip()[:12]
        except:
            return "unknown"


# Aiogram örneği
async def aiogram_bot_handler_example(message, bot):
    """
    Aiogram bot'u örneği.

    Kullanım:
        @dp.message_handler(commands=['deploy'])
        async def deploy_handler(message: types.Message):
            await aiogram_bot_handler_example(message, bot)
    """
    from aiogram import types

    executor = BotTaskExecutor(bot=bot, chat_id=message.chat.id)

    try:
        success = await executor.execute_deployment()

        if success:
            await bot.send_message(
                chat_id=message.chat.id,
                text="✅ Deployment başarılı!"
            )
        else:
            await bot.send_message(
                chat_id=message.chat.id,
                text="❌ Deployment başarısız! Logs'ları kontrol et."
            )

    except Exception as e:
        await bot.send_message(
            chat_id=message.chat.id,
            text=f"❌ Hata: {str(e)}"
        )


# python-telegram-bot örneği
async def python_telegram_bot_handler_example(update, context):
    """
    python-telegram-bot örneği.

    Kullanım:
        deploy_handler = CommandHandler('deploy', python_telegram_bot_handler_example)
        dispatcher.add_handler(deploy_handler)
    """
    chat_id = update.effective_chat.id
    executor = BotTaskExecutor(bot=context.bot, chat_id=chat_id)

    try:
        success = await executor.execute_deployment()

        if success:
            await context.bot.send_message(
                chat_id=chat_id,
                text="✅ Deployment başarılı!"
            )
        else:
            await context.bot.send_message(
                chat_id=chat_id,
                text="❌ Deployment başarısız!"
            )

    except Exception as e:
        await context.bot.send_message(
            chat_id=chat_id,
            text=f"❌ Hata: {str(e)}"
        )


# CLI örneği (test için)
async def main():
    """
    TaskReporter'ı CLI'da test et.
    """
    executor = BotTaskExecutor(bot=None, chat_id=None)

    print("🧪 TaskReporter Test")
    print("=" * 50)

    executor.reporter.log_change(
        "backend/app/main.py",
        "Health check endpoint eklendi",
        "65-70"
    )
    executor.reporter.log_change(
        "docker-compose.yml",
        "Environment variable eklendi"
    )
    executor.reporter.add_test("Python Syntax", True)
    executor.reporter.add_test("Frontend Build", True)
    executor.reporter.check_health()

    message = executor.reporter.generate_telegram_message(
        "7f325314a9e1",
        "claude/fix-project-errors-dwJIA",
        "Deprem App Güncelleme"
    )

    print(message)
    print("\n" + "=" * 50)
    print("✅ Test tamamlandı")


if __name__ == "__main__":
    asyncio.run(main())
