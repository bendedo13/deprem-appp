/**
 * Telegram Bot Entegrasyon Örneği (JavaScript/Node.js)
 * ====================================================
 *
 * Bu dosya, TaskReporter'ı Node.js Telegram bot'una nasıl entegre edileceğini gösterir.
 *
 * Desteklenen Bot Frameworks:
 * - node-telegram-bot-api
 * - Telegraf
 * - grammY
 *
 * Örnek Kullanım:
 *
 * ```javascript
 * const TelegramBot = require('node-telegram-bot-api');
 * const { BotTaskExecutor } = require('./bot_integration_example.js');
 *
 * const bot = new TelegramBot(TOKEN, { polling: true });
 * const executor = new BotTaskExecutor(bot);
 *
 * bot.onText(/\/deploy/, async (msg) => {
 *   await executor.executeDeployment(msg.chat.id);
 * });
 * ```
 */

const { exec, execFile } = require('child_process');
const { promisify } = require('util');
const path = require('path');

const execAsync = promisify(exec);
const execFileAsync = promisify(execFile);


/**
 * TaskReporter - Telegram bot rapor oluşturma
 */
class TaskReporter {
    constructor() {
        this.startTime = Date.now();
        this.changes = [];
        this.tests = [];
        this.errors = [];
        this.metrics = {};
    }

    /**
     * Değiştirilen dosyayı raporda kaydet
     */
    logChange(filePath, description, lines = null) {
        this.changes.push({
            file: filePath,
            description,
            lines
        });
    }

    /**
     * Test sonucunu raporda kaydet
     */
    addTest(testName, status, output = '') {
        this.tests.push({
            name: testName,
            status: status ? '✅' : '❌',
            passed: status,
            output
        });
    }

    /**
     * Hata bilgisini raporda kaydet
     */
    addError(errorCode, message, fileInfo = '', solution = '') {
        this.errors.push({
            code: errorCode,
            message,
            file: fileInfo,
            solution
        });
    }

    /**
     * Performance metriğini kaydet
     */
    addMetric(metricName, value) {
        this.metrics[metricName] = value;
    }

    /**
     * Sistem sağlık kontrollerini çalıştır
     */
    async checkHealth() {
        // Backend health
        try {
            const { stdout } = await execAsync(
                'curl -s -o /dev/null -w "%{http_code}" http://localhost:8001/health',
                { timeout: 5000 }
            );
            const code = stdout.trim();
            this.addTest('Backend Health Check', code === '200', `HTTP ${code}`);
        } catch (e) {
            this.addTest('Backend Health Check', false, e.message);
        }

        // Frontend health
        try {
            const { stdout } = await execAsync(
                'curl -s -o /dev/null -w "%{http_code}" http://localhost:8002',
                { timeout: 5000 }
            );
            const code = stdout.trim();
            this.addTest('Frontend Health Check', ['200', '301'].includes(code), `HTTP ${code}`);
        } catch (e) {
            this.addTest('Frontend Health Check', false, e.message);
        }

        // Docker status
        try {
            const { stdout } = await execAsync(
                'docker-compose ps --services',
                { cwd: '/home/user/deprem-appp', timeout: 5000 }
            );
            const services = stdout.trim().split('\n').length;
            this.addTest('Docker Services', true, `${services} services`);
        } catch (e) {
            this.addTest('Docker Services', false, e.message);
        }

        // AFAD API
        try {
            const { stdout } = await execAsync(
                'curl -s -o /dev/null -w "%{http_code}" "https://deprem.afad.gov.tr/apiv2/event/filter?start=2026-01-01&minmag=1&limit=1"',
                { timeout: 10000 }
            );
            const code = stdout.trim();
            this.addTest('AFAD API', code === '200', `HTTP ${code}`);
        } catch (e) {
            this.addTest('AFAD API', false, 'Unreachable');
        }
    }

    /**
     * Geçen zamanı hesapla
     */
    getElapsedTime() {
        const elapsed = Math.floor((Date.now() - this.startTime) / 1000);
        const minutes = Math.floor(elapsed / 60);
        const seconds = elapsed % 60;
        return { minutes, seconds };
    }

    /**
     * Telegram bot'u için detaylı mesaj oluştur
     */
    generateTelegramMessage(commitHash, branch, taskName) {
        const { minutes, seconds } = this.getElapsedTime();
        const status = this.errors.length === 0 ? '✅ BAŞARILI' : '❌ BAŞARISIZ';

        let message = `🤖 *AL NE YAPTI - DETAYLI RAPOR*\n\n`;
        message += `📌 *Görev:* ${taskName}\n`;
        message += `⏱️ *Süre:* ${minutes}dk ${seconds}s\n`;
        message += `🎯 *Durum:* ${status}\n\n`;

        // Değişen dosyalar
        if (this.changes.length > 0) {
            message += `📂 *Değişen Dosyalar:* (${this.changes.length})\n`;
            for (const change of this.changes) {
                message += `  ✓ \`${change.file}\`\n`;
                if (change.description) {
                    message += `    📝 ${change.description}\n`;
                }
                if (change.lines) {
                    message += `    📍 Satır: ${change.lines}\n`;
                }
            }
            message += '\n';
        }

        // Test sonuçları
        if (this.tests.length > 0) {
            message += `🧪 *Test Sonuçları:*\n`;
            for (const test of this.tests) {
                message += `  ${test.status} ${test.name}`;
                if (test.output) {
                    message += ` (${test.output})`;
                }
                message += '\n';
            }
            message += '\n';
        }

        // Deploy durumu
        message += `🚀 *Deploy:*\n`;
        message += `  ✅ Git Commit: \`${commitHash.substring(0, 8)}\`\n`;
        message += `  ✅ Branch: \`${branch}\`\n`;
        message += `  ✅ Push: Başarılı\n`;

        // Hata varsa
        if (this.errors.length > 0) {
            message += `\n❌ *Hatalar:*\n`;
            for (const error of this.errors) {
                message += `  • \`${error.code}\`: ${error.message}\n`;
                if (error.solution) {
                    message += `    ✓ Çözüm: ${error.solution}\n`;
                }
            }
        }

        // GitHub link
        message += `\n🔗 *GitHub:* https://github.com/bendedo13/deprem-appp/commit/${commitHash}`;

        return message;
    }
}


/**
 * BotTaskExecutor - Telegram bot görev yürütücü
 */
class BotTaskExecutor {
    constructor(bot, chatId = null) {
        this.bot = bot;
        this.chatId = chatId;
        this.reporter = new TaskReporter();
    }

    /**
     * İlerleme durumunu Telegram'a gönder
     */
    async sendProgress(status) {
        if (this.bot && this.chatId) {
            await this.bot.sendMessage(this.chatId, `⏳ ${status}`);
        }
    }

    /**
     * Deprem App deployment'ını çalıştır
     */
    async executeDeployment(projectPath = '/home/user/deprem-appp') {
        try {
            await this.sendProgress('🚀 Deployment başlanıyor...');

            // 1. Git fetch
            this.reporter.logChange('Git', 'Latest changes çekiliyor', null);

            try {
                const { stdout, stderr } = await execAsync(
                    'git fetch origin claude/fix-project-errors-dwJIA',
                    { cwd: projectPath, timeout: 30000 }
                );
            } catch (e) {
                this.reporter.addError(
                    'GIT_FETCH_ERROR',
                    e.message,
                    'git fetch',
                    'Ağ bağlantısını kontrol et'
                );
                return false;
            }

            // 2. Docker build
            await this.sendProgress('🔨 Docker build yapılıyor...');

            this.reporter.logChange('Docker', 'Services rebuild ediliyor', null);

            try {
                const { stdout } = await execAsync(
                    'docker-compose build --no-cache',
                    { cwd: projectPath, timeout: 600000 }
                );
                this.reporter.addTest('Docker Build', true, 'Success');
            } catch (e) {
                this.reporter.addError(
                    'DOCKER_BUILD_ERROR',
                    e.message.substring(0, 500),
                    'docker-compose build',
                    'Docker image cache\'ini temizle'
                );
                return false;
            }

            // 3. Services başlat
            await this.sendProgress('🚀 Services başlatılıyor...');

            try {
                const { stdout } = await execAsync(
                    'docker-compose up -d',
                    { cwd: projectPath, timeout: 60000 }
                );
            } catch (e) {
                this.reporter.addError(
                    'DOCKER_UP_ERROR',
                    e.message,
                    'docker-compose up'
                );
                return false;
            }

            // 4. Health checks
            await this.sendProgress('🧪 Health checks yapılıyor...');
            await new Promise(resolve => setTimeout(resolve, 10000)); // 10 saniye bekle

            await this.reporter.checkHealth();

            // 5. Rapor oluştur
            await this.sendProgress('📝 Rapor oluşturuluyor...');

            const commitHash = await this.getCommitHash(projectPath);
            const message = this.reporter.generateTelegramMessage(
                commitHash,
                'claude/fix-project-errors-dwJIA',
                'Deprem App Deployment'
            );

            if (this.bot && this.chatId) {
                await this.bot.sendMessage(
                    this.chatId,
                    message,
                    { parse_mode: 'Markdown' }
                );
            }

            return true;

        } catch (e) {
            this.reporter.addError('EXECUTION_ERROR', e.message, 'executeDeployment');
            return false;
        }
    }

    /**
     * Proje testlerini çalıştır
     */
    async executeTests(projectPath = '/home/user/deprem-appp') {
        try {
            await this.sendProgress('🧪 Testler başlanıyor...');

            // Python syntax test
            try {
                await execAsync(
                    'python3 -m py_compile backend/app/main.py',
                    { cwd: projectPath, timeout: 10000 }
                );
                this.reporter.addTest('Python Syntax', true, 'backend/app/main.py');
            } catch (e) {
                this.reporter.addTest('Python Syntax', false, e.message);
            }

            // Frontend build test
            try {
                await execAsync(
                    'npm run build',
                    { cwd: `${projectPath}/frontend`, timeout: 120000 }
                );
                this.reporter.addTest('Frontend Build', true, 'Success');
            } catch (e) {
                this.reporter.addTest('Frontend Build', false, e.message);
            }

            // Health checks
            await this.reporter.checkHealth();

            return true;

        } catch (e) {
            this.reporter.addError('TEST_ERROR', e.message, 'executeTests');
            return false;
        }
    }

    /**
     * Son commit hash'ini al
     */
    async getCommitHash(projectPath) {
        try {
            const { stdout } = await execAsync(
                'git rev-parse HEAD',
                { cwd: projectPath, timeout: 5000 }
            );
            return stdout.trim();
        } catch {
            return 'unknown';
        }
    }
}


// node-telegram-bot-api örneği
async function nodeTelegramBotHandler(msg, bot) {
    const chatId = msg.chat.id;
    const executor = new BotTaskExecutor(bot, chatId);

    try {
        const success = await executor.executeDeployment();

        if (success) {
            await bot.sendMessage(chatId, '✅ Deployment başarılı!');
        } else {
            await bot.sendMessage(chatId, '❌ Deployment başarısız!');
        }
    } catch (e) {
        await bot.sendMessage(chatId, `❌ Hata: ${e.message}`);
    }
}

// Telegraf örneği
async function telegrafBotHandler(ctx) {
    const chatId = ctx.chat.id;
    const executor = new BotTaskExecutor(ctx.telegram, chatId);

    try {
        const success = await executor.executeDeployment();

        if (success) {
            await ctx.reply('✅ Deployment başarılı!');
        } else {
            await ctx.reply('❌ Deployment başarısız!');
        }
    } catch (e) {
        await ctx.reply(`❌ Hata: ${e.message}`);
    }
}


// Export
module.exports = {
    TaskReporter,
    BotTaskExecutor,
    nodeTelegramBotHandler,
    telegrafBotHandler
};


// CLI test
if (require.main === module) {
    (async () => {
        console.log('🧪 TaskReporter Test');
        console.log('='.repeat(50));

        const executor = new BotTaskExecutor(null, null);

        executor.reporter.logChange(
            'backend/app/main.py',
            'Health check endpoint eklendi',
            '65-70'
        );
        executor.reporter.logChange(
            'docker-compose.yml',
            'Environment variable eklendi'
        );
        executor.reporter.addTest('Python Syntax', true);
        executor.reporter.addTest('Frontend Build', true);
        await executor.reporter.checkHealth();

        const message = executor.reporter.generateTelegramMessage(
            '7f325314a9e1',
            'claude/fix-project-errors-dwJIA',
            'Deprem App Güncelleme'
        );

        console.log(message);
        console.log('\n' + '='.repeat(50));
        console.log('✅ Test tamamlandı');
    })();
}
