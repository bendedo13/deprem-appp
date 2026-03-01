"""
Bot Görev Raporlama Sistemi
============================
Telegram bot'unun her görevden sonra detaylı rapor oluşturmasını sağlar.
Proje bazlı GitHub link desteği ile.
"""

import subprocess
from datetime import datetime
from typing import List, Dict, Optional


class TaskReporter:
    """Telegram bot'u için görev raporlama sistemi."""

    def __init__(self):
        self.start_time = datetime.now()
        self.changes: List[Dict] = []
        self.tests: List[Dict] = []
        self.errors: List[Dict] = []
        self.metrics: Dict = {}

    def log_change(self, file_path: str, description: str, lines: Optional[str] = None):
        """Değiştirilen dosyayı kaydet."""
        self.changes.append({
            "file": file_path,
            "description": description,
            "lines": lines,
        })

    def add_test(self, test_name: str, status: bool, output: str = ""):
        """Test sonucunu kaydet."""
        self.tests.append({
            "name": test_name,
            "status": "\u2705" if status else "\u274c",
            "passed": status,
            "output": output,
        })

    def add_error(self, error_code: str, message: str, file_info: str = "", solution: str = ""):
        """Hata bilgisini kaydet."""
        self.errors.append({
            "code": error_code,
            "message": message,
            "file": file_info,
            "solution": solution,
        })

    def add_metric(self, metric_name: str, value):
        """Performance metriğini kaydet."""
        self.metrics[metric_name] = value

    def get_elapsed_time(self) -> tuple:
        """Geçen zamanı hesapla."""
        elapsed = (datetime.now() - self.start_time).total_seconds()
        return int(elapsed // 60), int(elapsed % 60)

    def generate_telegram_message(
        self,
        commit_hash: str,
        branch: str,
        task_name: str,
        github_repo: str = "bendedo13/deprem-appp",
    ) -> str:
        """Telegram için detaylı rapor mesajı oluştur."""
        minutes, seconds = self.get_elapsed_time()
        passed_tests = sum(1 for t in self.tests if t["passed"])
        total_tests = len(self.tests)
        status = "\u2705 BA\u015eARILI" if not self.errors else "\u274c HATALAR MEVCUT"

        msg = f"""\U0001f916 *AI DEVELOPER BOT - DETAYLI RAPOR*
\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501

\U0001f4cc *G\u00f6rev:* {task_name}
\u23f1\ufe0f *S\u00fcre:* {minutes}dk {seconds}s
\U0001f3af *Durum:* {status}
\U0001f9ea *Testler:* {passed_tests}/{total_tests} ge\u00e7ti

"""
        # Değişen dosyalar
        if self.changes:
            msg += f"\U0001f4c2 *De\u011fi\u015fen Dosyalar ({len(self.changes)}):*\n"
            for change in self.changes:
                msg += f"  \u270f\ufe0f `{change['file']}`\n"
                if change["description"]:
                    for line in change["description"].split("\n")[:3]:
                        line = line.strip("- ").strip()
                        if line:
                            msg += f"     \u2022 {line}\n"
                if change["lines"]:
                    msg += f"     \U0001f4cd Sat\u0131r: {change['lines']}\n"
            msg += "\n"

        # Test sonuçları
        if self.tests:
            msg += "\U0001f9ea *Test Sonu\u00e7lar\u0131:*\n"
            for test in self.tests:
                output = f" - {test['output']}" if test["output"] else ""
                msg += f"  {test['status']} {test['name']}{output}\n"
            msg += "\n"

        # Git bilgileri
        commit_short = commit_hash[:8] if len(commit_hash) > 8 else commit_hash
        push_ok = any(t["name"] == "Git Push" and t["passed"] for t in self.tests)
        push_icon = "\u2705" if push_ok else "\u274c"
        msg += f"""\U0001f4be *Git:*
  Commit: `{commit_short}`
  Branch: `{branch}`
  Push: {push_icon}
"""

        # Hatalar
        if self.errors:
            msg += "\n\u274c *Hatalar:*\n"
            for err in self.errors:
                msg += f"  \u2022 [{err['code']}] {err['message']}\n"
                if err.get("solution"):
                    msg += f"    \u2713 \u00c7\u00f6z\u00fcm: {err['solution']}\n"

        # GitHub link
        if commit_hash and len(commit_hash) > 8:
            msg += f"\n\U0001f517 *GitHub:* https://github.com/{github_repo}/commit/{commit_hash}\n"

        msg += f"\n\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\n\U0001f550 {datetime.now().strftime('%d.%m.%Y %H:%M:%S')}"
        return msg

    def __repr__(self) -> str:
        return (
            f"TaskReporter(changes={len(self.changes)}, "
            f"tests={len(self.tests)}, errors={len(self.errors)})"
        )
