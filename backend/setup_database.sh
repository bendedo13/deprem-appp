#!/bin/bash
# PostgreSQL Database Setup Script
# Mevcut PostgreSQL'de yeni database oluşturur

set -e

# Rastgele güçlü şifre oluştur
DB_PASSWORD=${DB_PASSWORD:-$(openssl rand -hex 16)}

echo "PostgreSQL bulunuyor..."

# PostgreSQL servisini bul
PG_SERVICE=""
if systemctl is-active --quiet postgresql; then
    PG_SERVICE="postgresql"
elif systemctl list-units --type=service --state=active | grep -q "postgresql@"; then
    PG_SERVICE=$(systemctl list-units --type=service --state=active | grep "postgresql@" | awk '{print $1}' | head -1)
else
    echo "HATA: PostgreSQL servisi bulunamadi!"
    exit 1
fi

echo "PostgreSQL servisi bulundu: $PG_SERVICE"

# Database ve user oluştur
echo "Database olusturuluyor..."

sudo -u postgres psql << EOF
CREATE DATABASE deprem_db;
CREATE USER deprem_user WITH PASSWORD '$DB_PASSWORD';
GRANT ALL PRIVILEGES ON DATABASE deprem_db TO deprem_user;
ALTER DATABASE deprem_db OWNER TO deprem_user;
\c deprem_db
GRANT ALL ON SCHEMA public TO deprem_user;
\q
EOF

echo "Database basariyla olusturuldu!"
echo ""
echo "Baglanti Bilgileri:"
echo "  Database: deprem_db"
echo "  User: deprem_user"
echo "  Password: $DB_PASSWORD"
echo "  Host: localhost"
echo "  Port: 5432"
echo ""
echo ".env dosyasina eklenecek satir:"
echo "DATABASE_URL=postgresql+asyncpg://deprem_user:${DB_PASSWORD}@localhost:5432/deprem_db"
echo ""
echo "ONEMLI: Bu sifreyi guvenli bir yerde saklayin!"
