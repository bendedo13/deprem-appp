"""
Bot Görev Raporlama Sistemi
============================
Telegram bot'unun her görevden sonra detaylı rapor oluşturmasını sağlar.

Kullanım:
    reporter = TaskReporter()
    reporter.log_change('file.py', 'Açıklama')
    reporter.add_test('Test Adı', True)
    message = reporter.generate_telegram_message('commit_hash', 'branch', 'Görev')
    await bot.send_message(chat_id, message, parse_mode='Markdown')
"""

import subprocess
import json
from datetime import datetime
from typing import List, Dict, Optional


class TaskReporter:
    """
    Telegram bot'u için görev raporlama sistemi.
    Test sonuçları, deploy durumu ve değişiklikleri tracks eder.
    """

    def __init__(self):
        """Reporter'ı initialize et"""
        self.start_time = datetime.now()
        self.changes: List[Dict] = []
        self.tests: List[Dict] = []
        self.errors: List[Dict] = []
        self.metrics: Dict = {}

    def log_change(self, file_path: str, description: str, lines: Optional[str] = None):
        """
        Değiştirilen dosyayı raporda kaydet.

        Args:
            file_path: Değiştirilen dosyanın path'i
            description: Değişikliğin açıklaması
            lines: Değiştirilen satır numaraları (opsiyonel)
        """
        self.changes.append({
            "file": file_path,
            "description": description,
            "lines": lines
        })

    def add_test(self, test_name: str, status: bool, output: str = ""):
        """
        Test sonucunu raporda kaydet.

        Args:
            test_name: Test adı
            status: True=başarılı, False=başarısız
            output: Test çıktısı (opsiyonel)
        """
        self.tests.append({
            "name": test_name,
            "status": "✅" if status else "❌",
            "passed": status,
            "output": output
        })

    def add_error(self, error_code: str, message: str, file_info: str = "", solution: str = ""):
        """
        Hata bilgisini raporda kaydet.

        Args:
            error_code: Hata kodu
            message: Hata mesajı
            file_info: Hata konumu (dosya:satır)
            solution: Uygulanan çözüm
        """
        self.errors.append({
            "code": error_code,
            "message": message,
            "file": file_info,
            "solution": solution
        })

    def add_metric(self, metric_name: str, value):
        """Performance metriğini kaydet"""
        self.metrics[metric_name] = value

    def check_health(self) -> Dict[str, bool]:
        """
        Sistem sağlık kontrollerini çalıştır.

        Returns:
            Health check sonuçları
        """
        checks = {}

        # Backend health
        try:
            result = subprocess.run(
                ["curl", "-s", "-o", "/dev/null", "-w", "%{http_code}",
                 "http://localhost:8001/health"],
                capture_output=True,
                timeout=5
            )
            code = result.stdout.decode().strip()
            checks["backend_health"] = code == "200"
            self.add_test("Backend Health Check", code == "200", f"HTTP {code}")
        except Exception as e:
            checks["backend_health"] = False
            self.add_test("Backend Health Check", False, str(e))

        # Frontend health
        try:
            result = subprocess.run(
                ["curl", "-s", "-o", "/dev/null", "-w", "%{http_code}",
                 "http://localhost:8002"],
                capture_output=True,
                timeout=5
            )
            code = result.stdout.decode().strip()
            checks["frontend_health"] = code in ["200", "301"]
            self.add_test("Frontend Health Check", code in ["200", "301"], f"HTTP {code}")
        except Exception as e:
            checks["frontend_health"] = False
            self.add_test("Frontend Health Check", False, str(e))

        # Docker status
        try:
            result = subprocess.run(
                ["docker-compose", "ps", "--services"],
                cwd="/home/user/deprem-appp",
                capture_output=True,
                timeout=5
            )
            checks["docker"] = result.returncode == 0
            services = result.stdout.decode().strip().split('\n') if result.returncode == 0 else []
            self.add_test("Docker Services", result.returncode == 0, f"{len(services)} services")
        except Exception as e:
            checks["docker"] = False
            self.add_test("Docker Services", False, str(e))

        # AFAD API
        try:
            result = subprocess.run(
                ["curl", "-s", "-o", "/dev/null", "-w", "%{http_code}",
                 "https://deprem.afad.gov.tr/apiv2/event/filter?start=2026-01-01&minmag=1&limit=1"],
                capture_output=True,
                timeout=10
            )
            code = result.stdout.decode().strip()
            checks["afad_api"] = code == "200"
            self.add_test("AFAD API", code == "200", f"HTTP {code}")
        except Exception as e:
            checks["afad_api"] = False
            self.add_test("AFAD API", False, str(e))

        return checks

    def get_elapsed_time(self) -> tuple:
        """
        Geçen zamanı hesapla.

        Returns:
            (minutes, seconds) tuple
        """
        elapsed = (datetime.now() - self.start_time).total_seconds()
        minutes = int(elapsed // 60)
        seconds = int(elapsed % 60)
        return minutes, seconds

    def generate_telegram_message(self, commit_hash: str, branch: str, task_name: str) -> str:
        """
        Telegram bot'u için detaylı mesaj oluştur.

        Args:
            commit_hash: Git commit hash'i
            branch: Git branch'i
            task_name: Görev adı

        Returns:
            Telegram'a gönderilebilecek formatted mesaj
        """
        minutes, seconds = self.get_elapsed_time()
        status = "✅ BAŞARILI" if not self.errors else "❌ BAŞARISIZ"

        message = f"""🤖 *AL NE YAPTI - DETAYLI RAPOR*

📌 *Görev:* {task_name}
⏱️ *Süre:* {minutes}dk {seconds}s
🎯 *Durum:* {status}

"""

        # Değişen dosyalar
        if self.changes:
            message += f"📂 *Değişen Dosyalar:* ({len(self.changes)})\n"
            for change in self.changes:
                message += f"  ✓ `{change['file']}`\n"
                if change['description']:
                    message += f"    📝 {change['description']}\n"
                if change['lines']:
                    message += f"    📍 Satır: {change['lines']}\n"
            message += "\n"

        # Test sonuçları
        if self.tests:
            message += "🧪 *Test Sonuçları:*\n"
            for test in self.tests:
                message += f"  {test['status']} {test['name']}"
                if test['output']:
                    message += f" ({test['output']})"
                message += "\n"
            message += "\n"

        # Deploy durumu
        message += f"""🚀 *Deploy:*
  ✅ Git Commit: `{commit_hash[:8]}`
  ✅ Branch: `{branch}`
  ✅ Push: Başarılı
"""

        # Hata varsa
        if self.errors:
            message += "\n❌ *Hatalar:*\n"
            for error in self.errors:
                message += f"  • `{error['code']}`: {error['message']}\n"
                if error['solution']:
                    message += f"    ✓ Çözüm: {error['solution']}\n"

        # GitHub link
        message += f"\n🔗 *GitHub:* https://github.com/bendedo13/deprem-appp/commit/{commit_hash}"

        return message

    def generate_slack_message(self, commit_hash: str, branch: str, task_name: str) -> dict:
        """Slack için JSON formatted mesaj (opsiyonel)"""
        minutes, seconds = self.get_elapsed_time()
        passed_tests = sum(1 for t in self.tests if t['passed'])
        total_tests = len(self.tests)

        return {
            "blocks": [
                {
                    "type": "header",
                    "text": {
                        "type": "plain_text",
                        "text": f"🤖 {task_name} - {'✅ BAŞARILI' if not self.errors else '❌ BAŞARISIZ'}"
                    }
                },
                {
                    "type": "section",
                    "fields": [
                        {"type": "mrkdwn", "text": f"*Görev:*\n{task_name}"},
                        {"type": "mrkdwn", "text": f"*Süre:*\n{minutes}dk {seconds}s"},
                        {"type": "mrkdwn", "text": f"*Testler:*\n{passed_tests}/{total_tests} Passed"},
                        {"type": "mrkdwn", "text": f"*Commit:*\n`{commit_hash[:8]}`"}
                    ]
                }
            ]
        }

    def __repr__(self) -> str:
        """Reporter durumunun string temsili"""
        return (
            f"TaskReporter("
            f"changes={len(self.changes)}, "
            f"tests={len(self.tests)}, "
            f"errors={len(self.errors)}"
            f")"
        )


# Örnek kullanım
if __name__ == "__main__":
    # Test
    reporter = TaskReporter()
    reporter.log_change("backend/app/main.py", "Health check endpoint eklendi", "65-70")
    reporter.log_change("docker-compose.yml", "Environment variable eklendi")
    reporter.add_test("Backend Health Check", True, "HTTP 200")
    reporter.add_test("Frontend Build", True)
    reporter.check_health()

    message = reporter.generate_telegram_message(
        "7f325314a9e1",
        "claude/fix-project-errors-dwJIA",
        "Deprem App Hata Düzeltmesi"
    )

    print(message)
    print("\n" + "="*50)
    print(f"Reporter Status: {reporter}")
