# 🤖 Telegram Bot - DETAYLI RAPOR OLUŞTURMA KILAVUZU

Bu dokümandocküman, Telegram bot'unuzun her görevden sonra detaylı rapor vermesi için gereken adımları açıklar.

## 📋 RAPOR ÖĞELERİ (MÜSTERİ RAPORU İÇİN ZORUNLU)

Her görev tamamlandığında Telegram'a gönderilecek rapor şu elemanları **MUTLAKA** içermelidir:

### 1. ✅ GÖREV ÖZETI
```
📌 Görev: [Görev adı]
⏱️ Süre: [Toplam zaman]
🎯 Durum: ✅ BAŞARILI / ❌ BAŞARISIZ
```

### 2. 📝 NEYİ DEĞİŞTİRDİ (DETAYLI)
Tam listesi ile:
```
📂 Değişen Dosyalar:
  ✓ /path/to/file1.py (satır 45-52)
  ✓ /path/to/file2.js (fonksiyon: updateReport)
  ✓ docker-compose.yml (service: backend)

📌 Yapılan İşlemler:
  1. [Detaylı açıklama]
  2. [Detaylı açıklama]
  3. [Detaylı açıklama]
```

### 3. 🧪 TEST SONUÇLARI
```
🧪 Testler:
  ✅ Backend Health Check: HTTP 200 (/api/v1/health)
  ✅ Frontend: HTTP 200 (port 8085)
  ✅ Python Syntax: deprem-appp/backend ✓
  ✅ Node Modules: npm install ✓
  ✅ Docker Build: SUCCESS ✓
  ✅ AFAD API: Online ✓
  ✅ Database: Connected ✓
  ✅ Redis: Connected ✓
```

### 4. 🚀 DEPLOY DURUMU
```
🚀 Deployment:
  ✅ Git Commit: 7f32531 (Hata düzeltildi: [kısa açıklama])
  ✅ Git Push: origin/claude/fix-project-errors-dwJIA
  ✅ Docker Build: ~2m 11s
  ✅ Services Started: 5/5
  ⏳ Health Check: 30 saniye sonra PASSED
```

### 5. ⚠️ HATA VARSA
```
❌ Hata Detayları:
  Hata Kodu: [Error code]
  Mesaj: [Full error message]
  Dosya: [Path:LineNumber]
  Çözüm: [Uygulanan çözüm]
```

### 6. 🔗 KAYNAKLAR
```
📎 Kaynaklar:
  🔍 Git Commit: https://github.com/bendedo13/deprem-appp/commit/7f32531
  📊 Logs: [Docker logs URL if available]
  ✅ Demo: [Test results, screenshots]
```

---

## 🔧 BOT KODU İÇİN PYTHON/NODE TEMPLATE

### Python Örneği
```python
import subprocess
import json
from datetime import datetime

class TaskReporter:
    def __init__(self):
        self.start_time = datetime.now()
        self.changes = []
        self.tests = []
        self.errors = []

    def log_change(self, file_path, description, lines=None):
        """Değiştirilen dosyayı kaydet"""
        self.changes.append({
            "file": file_path,
            "description": description,
            "lines": lines
        })

    def add_test(self, test_name, status, output=""):
        """Test sonucunu kaydet"""
        self.tests.append({
            "name": test_name,
            "status": "✅" if status else "❌",
            "output": output
        })

    def add_error(self, error_code, message, file_info=""):
        """Hata bilgisini kaydet"""
        self.errors.append({
            "code": error_code,
            "message": message,
            "file": file_info
        })

    def run_health_checks(self):
        """Sistem sağlık kontrolleri"""
        checks = {
            "backend_health": self._check_endpoint("http://localhost:8000/health"),
            "frontend_health": self._check_endpoint("http://localhost:8085"),
            "python_syntax": self._check_python(),
            "docker_build": self._check_docker(),
            "database": self._check_database(),
            "redis": self._check_redis(),
            "afad_api": self._check_afad_api()
        }
        return checks

    def generate_telegram_message(self, commit_hash, branch, task_name):
        """Telegram için detaylı mesaj oluştur"""
        elapsed = (datetime.now() - self.start_time).total_seconds()
        minutes = int(elapsed // 60)
        seconds = int(elapsed % 60)

        message = f"""
🤖 **AL NE YAPTI - DETAYLI RAPOR**

📌 **Görev:** {task_name}
⏱️ **Süre:** {minutes}dk {seconds}s
🎯 **Durum:** {'✅ BAŞARILI' if not self.errors else '❌ BAŞARISIZ'}

📂 **Değişen Dosyalar:** ({len(self.changes)})
"""

        for change in self.changes:
            message += f"  ✓ {change['file']}\n"
            if change['lines']:
                message += f"    📍 Satır: {change['lines']}\n"

        message += f"""
🧪 **Test Sonuçları:**
"""
        for test in self.tests:
            message += f"  {test['status']} {test['name']}\n"

        message += f"""
🚀 **Deploy:**
  ✅ Git Commit: {commit_hash}
  ✅ Branch: {branch}
  ✅ Push: Başarılı

🔗 **GitHub:** https://github.com/bendedo13/deprem-appp/commit/{commit_hash}
"""

        if self.errors:
            message += f"\n❌ **Hatalar:**\n"
            for error in self.errors:
                message += f"  • {error['code']}: {error['message']}\n"

        return message

    def _check_endpoint(self, url):
        """HTTP endpoint kontrolü"""
        try:
            import requests
            r = requests.get(url, timeout=5)
            return r.status_code == 200
        except:
            return False

    def _check_python(self):
        """Python syntax kontrolü"""
        try:
            subprocess.run(
                ["python3", "-m", "py_compile", "backend/app/main.py"],
                cwd="/home/user/deprem-appp",
                capture_output=True,
                check=True
            )
            return True
        except:
            return False

    def _check_docker(self):
        """Docker build kontrolü"""
        try:
            result = subprocess.run(
                ["docker-compose", "build", "--no-cache"],
                cwd="/home/user/deprem-appp",
                capture_output=True,
                timeout=300
            )
            return result.returncode == 0
        except:
            return False

    def _check_database(self):
        """Database bağlantı kontrolü"""
        try:
            import psycopg2
            conn = psycopg2.connect(
                dbname="deprem_db",
                user="deprem_user",
                password="deprem_pass",
                host="localhost"
            )
            conn.close()
            return True
        except:
            return False

    def _check_redis(self):
        """Redis bağlantı kontrolü"""
        try:
            import redis
            r = redis.Redis(host='localhost', port=6379)
            r.ping()
            return True
        except:
            return False

    def _check_afad_api(self):
        """AFAD API kontrolü"""
        try:
            import requests
            r = requests.get(
                "https://deprem.afad.gov.tr/apiv2/event/filter?start=2026-01-01&minmag=1&limit=1",
                timeout=10
            )
            return r.status_code == 200
        except:
            return False

# Kullanım Örneği
reporter = TaskReporter()
reporter.log_change("backend/app/main.py", "Health check endpoint eklendi", "65-70")
reporter.log_change("docker-compose.yml", "Backend servisine environment variable eklendi")
reporter.add_test("Backend Health", True)
reporter.add_test("Frontend Build", True)
reporter.add_test("Docker Compose", True)

# Raporları çalıştır ve Telegram'a gönder
message = reporter.generate_telegram_message(
    commit_hash="7f32531",
    branch="claude/fix-project-errors-dwJIA",
    task_name="Hata Düzeltmesi"
)

# send_telegram_message(message)  # Bot'un Telegram gönderme fonksiyonu
print(message)
```

### JavaScript/Node.js Örneği
```javascript
const fs = require('fs');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

class TaskReporter {
    constructor() {
        this.startTime = Date.now();
        this.changes = [];
        this.tests = [];
        this.errors = [];
    }

    logChange(filePath, description, lines = null) {
        this.changes.push({ file: filePath, description, lines });
    }

    addTest(testName, status, output = "") {
        this.tests.push({
            name: testName,
            status: status ? "✅" : "❌",
            output
        });
    }

    addError(errorCode, message, fileInfo = "") {
        this.errors.push({ code: errorCode, message, file: fileInfo });
    }

    async runHealthChecks() {
        return {
            backend: await this.checkEndpoint('http://localhost:8000/health'),
            frontend: await this.checkEndpoint('http://localhost:8085'),
            pythonSyntax: await this.checkPython(),
            dockerBuild: await this.checkDocker(),
        };
    }

    generateTelegramMessage(commitHash, branch, taskName) {
        const elapsed = Math.floor((Date.now() - this.startTime) / 1000);
        const minutes = Math.floor(elapsed / 60);
        const seconds = elapsed % 60;

        let message = `
🤖 **AL NE YAPTI - DETAYLI RAPOR**

📌 **Görev:** ${taskName}
⏱️ **Süre:** ${minutes}dk ${seconds}s
🎯 **Durum:** ${this.errors.length === 0 ? '✅ BAŞARILI' : '❌ BAŞARISIZ'}

📂 **Değişen Dosyalar:** (${this.changes.length})
`;

        this.changes.forEach(change => {
            message += `  ✓ ${change.file}\n`;
            if (change.lines) {
                message += `    📍 Satır: ${change.lines}\n`;
            }
        });

        message += `
🧪 **Test Sonuçları:**
`;

        this.tests.forEach(test => {
            message += `  ${test.status} ${test.name}\n`;
        });

        message += `
🚀 **Deploy:**
  ✅ Git Commit: ${commitHash}
  ✅ Branch: ${branch}
  ✅ Push: Başarılı

🔗 **GitHub:** https://github.com/bendedo13/deprem-appp/commit/${commitHash}
`;

        if (this.errors.length > 0) {
            message += `\n❌ **Hatalar:**\n`;
            this.errors.forEach(error => {
                message += `  • ${error.code}: ${error.message}\n`;
            });
        }

        return message;
    }

    async checkEndpoint(url) {
        try {
            const response = await fetch(url, { timeout: 5000 });
            return response.status === 200;
        } catch {
            return false;
        }
    }

    async checkPython() {
        try {
            await execPromise(
                'python3 -m py_compile backend/app/main.py',
                { cwd: '/home/user/deprem-appp' }
            );
            return true;
        } catch {
            return false;
        }
    }

    async checkDocker() {
        try {
            await execPromise(
                'docker-compose build --no-cache',
                { cwd: '/home/user/deprem-appp', timeout: 300000 }
            );
            return true;
        } catch {
            return false;
        }
    }
}

// Kullanım
const reporter = new TaskReporter();
reporter.logChange('backend/app/main.py', 'Health check endpoint eklendi', '65-70');
reporter.addTest('Backend Health', true);
reporter.addTest('Docker Build', true);

const message = reporter.generateTelegramMessage(
    '7f32531',
    'claude/fix-project-errors-dwJIA',
    'Hata Düzeltmesi'
);

console.log(message);
// await sendTelegramMessage(message);
```

---

## ✅ KONTROL LİSTESİ - BOT HER GÖREVDEN SONRA BUNU YAPSIN

- [ ] Başlangıç zamanını kaydet
- [ ] Değiştirilecek dosyaları listele
- [ ] Kodu yaz/düzelt
- [ ] Testleri çalıştır (tüm başarıya kadar)
- [ ] `git add` ve `git commit` yap
- [ ] `git push` yap
- [ ] Docker build başlat
- [ ] `docker-compose up -d` yap
- [ ] 30 saniye bekle
- [ ] Health check'leri çalıştır
- [ ] Sonuçları topla
- [ ] **Detaylı Telegram raporunu oluştur ve gönder**
- [ ] Sonlanış zamanını kaydet

---

## 📊 TELEGRAM MESAJ ÖRNEĞİ (BAŞARILI)

```
🤖 AL NE YAPTI - DETAYLI RAPOR

📌 Görev: Deprem App Hata Düzeltmesi
⏱️ Süre: 2dk 11s
🎯 Durum: ✅ BAŞARILI

📂 Değişen Dosyalar: (3)
  ✓ backend/app/main.py
    📍 Satır: 65-70
  ✓ docker-compose.yml
    📍 Backend service section
  ✓ backend/requirements.txt
    📍 anthropic>=0.18.0 added

🧪 Test Sonuçları:
  ✅ Backend Health Check: HTTP 200
  ✅ Frontend: HTTP 200
  ✅ Python Syntax: ✓
  ✅ Node Modules: ✓
  ✅ Docker Build: SUCCESS
  ✅ AFAD API: Online
  ✅ Database: Connected
  ✅ Redis: Connected

🚀 Deploy:
  ✅ Git Commit: 7f32531
  ✅ Branch: claude/fix-project-errors-dwJIA
  ✅ Push: origin/claude/fix-project-errors-dwJIA
  ✅ Services Started: 5/5

🔗 GitHub: https://github.com/bendedo13/deprem-appp/commit/7f32531
```

---

## 📊 TELEGRAM MESAJ ÖRNEĞİ (BAŞARISIZ)

```
🤖 AL NE YAPTI - DETAYLI RAPOR

📌 Görev: Docker Build Fix
⏱️ Süre: 5dk 33s
🎯 Durum: ❌ BAŞARISIZ

📂 Değişen Dosyalar: (2)
  ✓ frontend/Dockerfile
    📍 Satır: 9-15
  ✓ docker-compose.yml
    📍 Frontend service

🧪 Test Sonuçları:
  ✅ Backend Health Check: HTTP 200
  ✅ Frontend: HTTP 200
  ❌ Docker Build: FAILED

❌ Hatalar:
  • Docker Build Error: npm ERR! code ELIFECYCLE
    📍 Dosya: frontend/Dockerfile:10
    Mesaj: npm run build exited with code 1
    Çözüm: package.json dependencies sürümü güncellendi

🔗 GitHub: Commit henüz atılmadı
```

---

## 🎯 ÖZETİ

Bot'unuzun her görev tamamladığında yukarıdaki format kullanarak Telegram raporları göndermesi:

1. **Zamanı kaydeder** ⏱️
2. **Değişen dosyaları listeler** 📂
3. **Testleri çalıştırır** 🧪
4. **Deploy durumunu kontrol eder** 🚀
5. **HTTP status kodlarını kontrol eder** 🔗
6. **Detaylı rapor gönderer** 📊
7. **Hataları ayrıntılı anlatır** ❌
8. **GitHub linkini ekler** 🔗

Bu yapı sayesinde siz her zaman bot'unuzun ne yaptığını bileceksiniz! ✅
