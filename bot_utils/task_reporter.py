"""
TaskReporter — Görev Raporlama Yardımcısı
==========================================
Geriye dönük uyumluluk için korunmuştur.
Yeni kodda doğrudan scripts/ai_developer_bot.py içindeki raporlama kullanılır.
"""

from __future__ import annotations

from datetime import datetime
from typing import Dict, List, Optional


class TaskReporter:
    """Görev ilerlemesini takip eder ve Telegram mesajı üretir."""

    def __init__(self) -> None:
        self.start_time = datetime.now()
        self.changes: List[Dict] = []
        self.tests: List[Dict] = []
        self.errors: List[Dict] = []
        self.metrics: Dict = {}

    # ── Kayıt metotları ──────────────────────────────────────

    def log_change(self, file_path: str, description: str, lines: Optional[str] = None) -> None:
        self.changes.append({"file": file_path, "description": description, "lines": lines})

    def add_test(self, name: str, passed: bool, output: str = "") -> None:
        self.tests.append({
            "name": name,
            "status": "✅" if passed else "❌",
            "passed": passed,
            "output": output,
        })

    def add_error(self, code: str, message: str, file_info: str = "", solution: str = "") -> None:
        self.errors.append({
            "code": code,
            "message": message,
            "file": file_info,
            "solution": solution,
        })

    def add_metric(self, name: str, value) -> None:
        self.metrics[name] = value

    # ── Hesaplama ────────────────────────────────────────────

    def elapsed(self) -> tuple:
        """(dakika, saniye) döndürür."""
        secs = (datetime.now() - self.start_time).total_seconds()
        return int(secs // 60), int(secs % 60)

    # ── Rapor ────────────────────────────────────────────────

    def generate_telegram_message(
        self,
        commit_hash: str,
        branch: str,
        task_name: str,
        github_repo: str = "bendedo13/deprem-appp",
    ) -> str:
        minutes, seconds = self.elapsed()
        passed = sum(1 for t in self.tests if t["passed"])
        total = len(self.tests)
        status = "✅ BAŞARILI" if not self.errors else "❌ HATALAR MEVCUT"

        msg = (
            f"🤖 *AI DEVELOPER BOT*\n"
            f"━━━━━━━━━━━━━━━━━━━━━━\n\n"
            f"📌 *Görev:* {task_name}\n"
            f"⏱️ *Süre:* {minutes}dk {seconds}s\n"
            f"🎯 *Durum:* {status}\n"
            f"🧪 *Testler:* {passed}/{total}\n\n"
        )

        if self.changes:
            msg += f"📂 *Değişen Dosyalar ({len(self.changes)}):*\n"
            for ch in self.changes:
                msg += f"  ✏️ `{ch['file']}`\n"
                for line in (ch["description"] or "").split("\n")[:3]:
                    line = line.strip("- ").strip()
                    if line:
                        msg += f"     • {line}\n"
            msg += "\n"

        if self.tests:
            msg += "🧪 *Test Sonuçları:*\n"
            for t in self.tests:
                suffix = f" — {t['output']}" if t["output"] else ""
                msg += f"  {t['status']} {t['name']}{suffix}\n"
            msg += "\n"

        cshort = commit_hash[:8] if len(commit_hash) > 8 else commit_hash
        push_ok = any(t["name"] == "Git Push" and t["passed"] for t in self.tests)
        msg += (
            f"💾 *Git:*\n"
            f"  Commit: `{cshort}`\n"
            f"  Branch: `{branch}`\n"
            f"  Push: {'✅' if push_ok else '❌'}\n"
        )

        if self.errors:
            msg += "\n❌ *Hatalar:*\n"
            for err in self.errors:
                msg += f"  • [{err['code']}] {err['message']}\n"
                if err.get("solution"):
                    msg += f"    ✓ Çözüm: {err['solution']}\n"

        if commit_hash and len(commit_hash) > 8:
            msg += f"\n🔗 https://github.com/{github_repo}/commit/{commit_hash}\n"

        msg += f"\n━━━━━━━━━━━━━━━━━━━━━━\n🕐 {datetime.now().strftime('%d.%m.%Y %H:%M:%S')}"
        return msg

    def __repr__(self) -> str:
        return (
            f"TaskReporter(changes={len(self.changes)}, "
            f"tests={len(self.tests)}, errors={len(self.errors)})"
        )
