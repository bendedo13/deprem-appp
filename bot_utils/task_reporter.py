"""
TaskReporter — Görev raporlama yardımcı sınıfı.

Not: Ana bot (scripts/ai_developer_bot.py) artık kendi rapor sistemini
     kullanıyor. Bu dosya sadece harici entegrasyon/test için korunuyor.
"""

from datetime import datetime
from typing import List, Dict, Optional


class TaskReporter:
    """Görev raporlama sistemi."""

    def __init__(self):
        self.start_time = datetime.now()
        self.changes: List[Dict] = []
        self.tests: List[Dict] = []
        self.errors: List[Dict] = []
        self.metrics: Dict = {}

    def log_change(self, file_path: str, description: str, lines: Optional[str] = None):
        self.changes.append({"file": file_path, "description": description, "lines": lines})

    def add_test(self, test_name: str, status: bool, output: str = ""):
        self.tests.append({
            "name": test_name,
            "status": "✅" if status else "❌",
            "passed": status,
            "output": output,
        })

    def add_error(self, error_code: str, message: str, file_info: str = "", solution: str = ""):
        self.errors.append({
            "code": error_code,
            "message": message,
            "file": file_info,
            "solution": solution,
        })

    def add_metric(self, metric_name: str, value):
        self.metrics[metric_name] = value

    def get_elapsed_time(self) -> tuple:
        elapsed = (datetime.now() - self.start_time).total_seconds()
        return int(elapsed // 60), int(elapsed % 60)

    def generate_report(
        self,
        commit_hash: str = "",
        branch: str = "",
        task_name: str = "",
        github_repo: str = "bendedo13/deprem-appp",
        pushed: bool = False,
    ) -> str:
        """Telegram için rapor mesajı oluştur."""
        minutes, seconds = self.get_elapsed_time()
        passed_tests = sum(1 for t in self.tests if t["passed"])
        total_tests = len(self.tests)
        has_errors = bool(self.errors)
        status = "✅ BAŞARILI" if not has_errors else "❌ HATALAR MEVCUT"

        msg = f"🤖 RAPOR\n{'━' * 20}\n"
        msg += f"📌 {task_name}\n"
        msg += f"⏱️ {minutes}dk {seconds}s\n"
        msg += f"🎯 {status}\n"
        msg += f"🧪 Testler: {passed_tests}/{total_tests}\n\n"

        if self.changes:
            msg += f"📂 Dosyalar ({len(self.changes)}):\n"
            for c in self.changes[:15]:
                msg += f"  ✏️ {c['file']}\n"
            msg += "\n"

        if self.tests:
            msg += "🧪 Test Sonuçları:\n"
            for t in self.tests:
                output = f" - {t['output']}" if t["output"] else ""
                msg += f"  {t['status']} {t['name']}{output}\n"
            msg += "\n"

        commit_short = commit_hash[:8] if len(commit_hash) > 8 else commit_hash
        push_icon = "✅" if pushed else "❌"
        msg += f"💾 Commit: {commit_short} | Branch: {branch}\n"
        msg += f"   Push: {push_icon}\n"

        if self.errors:
            msg += "\n❌ Hatalar:\n"
            for err in self.errors:
                msg += f"  • [{err['code']}] {err['message']}\n"

        # GitHub linki sadece push başarılıysa
        if pushed and commit_hash and len(commit_hash) >= 7:
            msg += f"\n🔗 GitHub: https://github.com/{github_repo}/commit/{commit_hash}\n"

        msg += f"\n{'━' * 20}\n🕐 {datetime.now().strftime('%d.%m.%Y %H:%M')}"
        return msg

    def __repr__(self) -> str:
        return f"TaskReporter(changes={len(self.changes)}, tests={len(self.tests)}, errors={len(self.errors)})"
