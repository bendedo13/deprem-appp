# 🤖 Bot Utils - Telegram Bot Yardımcı Modülleri

Telegram bot'unuzun görevleri yürütmesinden sonra detaylı raporlar oluşturmasını sağlayan yardımcı modüller.

## 📦 İçerik

### 1. `task_reporter.py` - Python TaskReporter Sınıfı

Telegram bot'u için görev raporlama sistemi.

**Özellikleri:**
- ✅ Değişen dosyaları tracks eder
- ✅ Test sonuçlarını kaydeder
- ✅ Hata detaylarını kaydeder
- ✅ System health checks çalıştırır
- ✅ Detaylı Telegram mesajı oluşturur
- ✅ Performance metrikleri kaydeder

**Örnek Kullanım:**

```python
from bot_utils import TaskReporter

# Reporter oluştur
reporter = TaskReporter()

# Değişen dosyaları kaydet
reporter.log_change('backend/app/main.py', 'Health check endpoint eklendi', '65-70')
reporter.log_change('docker-compose.yml', 'Environment variable eklendi')

# Test sonuçlarını kaydet
reporter.add_test('Backend Health Check', True, 'HTTP 200')
reporter.add_test('Frontend Build', True)

# Health check'leri çalıştır
reporter.check_health()

# Telegram mesajı oluştur
message = reporter.generate_telegram_message(
    commit_hash='7f325314',
    branch='claude/fix-project-errors-dwJIA',
    task_name='Deprem App Deployment'
)

# Bot ile Telegram'a gönder
await bot.send_message(chat_id=CHAT_ID, text=message, parse_mode='Markdown')
```

### 2. `bot_integration_example.py` - Python Bot Entegrasyon Örneği

Aiogram, python-telegram-bot gibi frameworklere entegrasyon örnekleri.

**BotTaskExecutor Sınıfı:**
- `execute_deployment()` - Full deployment pipeline
- `execute_tests()` - Test suite çalıştırma
- `send_progress()` - İlerleme durumunu Telegram'a gönderme

**Örnek:**

```python
from bot_utils.bot_integration_example import BotTaskExecutor
from aiogram import Bot

# Executor oluştur
executor = BotTaskExecutor(bot=bot, chat_id=message.chat.id)

# Deployment çalıştır
success = await executor.execute_deployment()

if success:
    await bot.send_message(message.chat.id, '✅ Deployment başarılı!')
else:
    await bot.send_message(message.chat.id, '❌ Deployment başarısız!')
```

### 3. `bot_integration_example.js` - JavaScript/Node.js Bot Entegrasyon

node-telegram-bot-api, Telegraf gibi frameworklere entegrasyon örnekleri.

**Örnek:**

```javascript
const { BotTaskExecutor } = require('./bot_utils/bot_integration_example.js');

const executor = new BotTaskExecutor(bot, chatId);
const success = await executor.executeDeployment();

if (success) {
    await bot.sendMessage(chatId, '✅ Deployment başarılı!', { parse_mode: 'Markdown' });
}
```

---

## 🚀 Kurulum

### Python Bot'ı için

```bash
# 1. TaskReporter'ı import et
from bot_utils import TaskReporter

# 2. Entegrasyon örneğini kontrol et
from bot_utils.bot_integration_example import BotTaskExecutor

# 3. Bot komut handler'ında kullan
@dp.message_handler(commands=['deploy'])
async def deploy_handler(message: types.Message):
    executor = BotTaskExecutor(bot=bot, chat_id=message.chat.id)
    success = await executor.execute_deployment()
    # ...
```

### Node.js Bot'ı için

```javascript
// 1. Modülü require et
const { TaskReporter, BotTaskExecutor } = require('./bot_utils/bot_integration_example.js');

// 2. Bot komutunda kullan
bot.onText(/\/deploy/, async (msg) => {
    const executor = new BotTaskExecutor(bot, msg.chat.id);
    const success = await executor.executeDeployment();
    // ...
});
```

---

## 📊 Örnek Telegram Raporu

```
🤖 AL NE YAPTI - DETAYLI RAPOR

📌 Görev: Deprem App Deployment
⏱️ Süre: 5dk 33s
🎯 Durum: ✅ BAŞARILI

📂 Değişen Dosyalar: (3)
  ✓ `backend/app/main.py`
    📝 Health check endpoint eklendi
    📍 Satır: 65-70
  ✓ `docker-compose.yml`
    📝 Environment variable eklendi

🧪 Test Sonuçları:
  ✅ Backend Health Check (HTTP 200)
  ✅ Frontend Build (Success)
  ✅ Docker Build (Success)
  ✅ Python Syntax (backend/app/main.py)
  ✅ Backend Health Check (HTTP 200)
  ✅ Frontend Health Check (HTTP 200)
  ✅ Docker Services (5 services)
  ✅ AFAD API (HTTP 200)

🚀 Deploy:
  ✅ Git Commit: `7f325314`
  ✅ Branch: `claude/fix-project-errors-dwJIA`
  ✅ Push: Başarılı

🔗 GitHub: https://github.com/bendedo13/deprem-appp/commit/7f325314
```

---

## 🧪 Test Etme

### Python Test

```bash
cd /home/user/deprem-appp
python3 bot_utils/bot_integration_example.py
```

**Output:**
```
🧪 TaskReporter Test
==================================================
🤖 AL NE YAPTI - DETAYLI RAPOR
...
==================================================
✅ Test tamamlandı
```

### Node.js Test

```bash
cd /home/user/deprem-appp
node bot_utils/bot_integration_example.js
```

---

## 📋 Health Check'ler

TaskReporter otomatik olarak şu checks'i çalıştırır:

1. **Backend Health** - HTTP 200 on `/health`
2. **Frontend Health** - HTTP 200/301 on main page
3. **Docker Services** - All services running
4. **AFAD API** - Earthquake data API online
5. **Python Syntax** - No syntax errors
6. **Frontend Build** - Build succeeds

---

## 🔧 Kustomizasyon

### Custom Health Check Eklemek

```python
# Python
reporter = TaskReporter()

# Custom check
try:
    import psycopg2
    conn = psycopg2.connect("dbname=deprem_db user=deprem_user")
    conn.close()
    reporter.add_test("PostgreSQL Connection", True)
except Exception as e:
    reporter.add_test("PostgreSQL Connection", False, str(e))
```

### Custom Telegram Mesajı

```python
# TaskReporter'ı extend et
class CustomReporter(TaskReporter):
    def generate_telegram_message(self, commit_hash, branch, task_name):
        # Base message'ı al
        message = super().generate_telegram_message(commit_hash, branch, task_name)
        # Custom footer ekle
        message += "\n\n🔔 *Custom Notification*\nBu deployment otomatik olarak yapıldı."
        return message
```

---

## 🚨 Error Handling

```python
reporter = TaskReporter()

try:
    # Görev yap
    result = subprocess.run(['docker-compose', 'build'], ...)

    if result.returncode != 0:
        reporter.add_error(
            'DOCKER_BUILD_ERROR',
            result.stderr.decode(),
            'docker-compose build',
            'Docker image cache\'ini temizle'
        )
except Exception as e:
    reporter.add_error(
        'EXECUTION_ERROR',
        str(e),
        'task_execution',
        'Logs\'ları kontrol et'
    )
```

---

## 📞 Troubleshooting

### Problem: Tests geçmiyor
- Health check'leri manuel olarak çalıştır:
  ```bash
  curl http://localhost:8001/health
  curl http://localhost:8002
  docker-compose ps
  ```

### Problem: Telegram mesajı göndermiyor
- Bot token'ını kontrol et
- Chat ID'nin doğru olduğunu kontrol et
- Network bağlantısını kontrol et

### Problem: Docker build başarısız
- Cache'i temizle: `docker builder prune -af`
- Dockerfile'ı kontrol et
- Memory yetersiz olabilir

---

## 📚 Dosyalar

```
bot_utils/
├── __init__.py              # Package init
├── task_reporter.py         # Python TaskReporter class
├── bot_integration_example.py   # Python bot examples
├── bot_integration_example.js   # Node.js bot examples
└── README.md               # Bu dosya
```

---

## 🎯 Workflow

```
User sends /deploy command
    ↓
BotTaskExecutor receives request
    ↓
Sends progress: "🚀 Deployment başlanıyor..."
    ↓
Runs git fetch, docker build, docker-compose up
    ↓
Runs health checks
    ↓
TaskReporter generates detailed message
    ↓
Sends comprehensive report to Telegram
    ↓
User sees full deployment details ✅
```

---

## ✅ Kontrol Listesi

- [x] TaskReporter class oluşturuldu
- [x] Python entegrasyon örneği sağlandı
- [x] Node.js entegrasyon örneği sağlandı
- [x] Health check fonksiyonları yazıldı
- [x] Telegram mesaj formatter oluşturuldu
- [x] BotTaskExecutor sınıfı uygulandı
- [x] Deployment pipeline kodlandı
- [x] Test examples sağlandı
- [x] README yazıldı

---

## 🚀 Hemen Başlangıç

**Python Bot'u için:**

```bash
# 1. Bot kodunuza TaskReporter'ı import et
from bot_utils import TaskReporter

# 2. Her /deploy komutunda
reporter = TaskReporter()
# ... görev yap ...
reporter.check_health()
message = reporter.generate_telegram_message(...)
await bot.send_message(chat_id, message, parse_mode='Markdown')
```

**Node.js Bot'u için:**

```bash
# 1. Modülü require et
const { BotTaskExecutor } = require('./bot_utils/bot_integration_example.js');

# 2. Her /deploy komutunda
const executor = new BotTaskExecutor(bot, chatId);
const success = await executor.executeDeployment();
```

---

**Yazarı:** Claude AI
**Tarih:** 2026-02-26
**Versiyon:** 1.0
**Durum:** ✅ Production Ready

Sorular? GitHub Issues'ında rapor et! 🎉
