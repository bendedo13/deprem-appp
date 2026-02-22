#!/bin/bash
# PostgreSQL Database Setup Script
# Mevcut PostgreSQL'de yeni database oluşturur

set -e

echo "🔍 PostgreSQL bulunuyor..."

# PostgreSQL servisini bul
PG_SERVICE=""
if systemctl is-active --quiet postgresql; then
    PG_SERVICE="postgresql"
elif systemctl list-units --type=service --state=active | grep -q "postgresql@"; then
    PG_SERVICE=$(systemctl list-units --type=service --state=active | grep "postgresql@" | awk '{print $1}' | head -1)
else
    echo "❌ PostgreSQL servisi bulunamadı!"
    echo "Kurulu PostgreSQL servisleri:"
    systemctl list-units --type=service | grep postgres || echo "Hiç PostgreSQL servisi yok"
    exit 1
fi

echo "✓ PostgreSQL servisi bulundu: $PG_SERVICE"

# PostgreSQL versiyonunu bul
PG_VERSION=$(sudo -u postgres psql -t -c "SHOW server_version;" | cut -d'.' -f1 | tr -d ' ')
echo "✓ PostgreSQL versiyonu: $PG_VERSION"

# Database ve user oluştur
echo "📊 Database oluşturuluyor..."

sudo -u postgres psql << EOF
-- Database varsa sil ve yeniden oluştur (dikkatli kullan!)
-- DROP DATABASE IF EXISTS deprem_db;
-- DROP USER IF EXISTS deprem_user;

-- Database ve user oluştur
CREATE DATABASE deprem_db;
CREATE USER deprem_user WITH PASSWORD 'deprem2024secure';
GRANT ALL PRIVILEGES ON DATABASE deprem_db TO deprem_user;
ALTER DATABASE deprem_db OWNER TO deprem_user;

-- PostgreSQL 15+ için ek izinler
\c deprem_db
GRANT ALL ON SCHEMA public TO deprem_user;

\q
EOF

echo "✅ Database başarıyla oluşturuldu!"
echo ""
echo "📝 Bağlantı Bilgileri:"
echo "  Database: deprem_db"
echo "  User: deprem_user"
echo "  Password: deprem2024secure"
echo "  Host: localhost"
echo "  Port: 5432"
echo ""
echo "🔐 .env dosyasına eklenecek satır:"
echo "DATABASE_URL=postgresql+asyncpg://deprem_user:deprem2024secure@localhost:5432/deprem_db"
echo ""
echo "🧪 Test etmek için:"
echo "psql -U deprem_user -d deprem_db -h localhost"
