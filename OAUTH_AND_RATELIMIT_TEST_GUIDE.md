"""
Google OAuth ve Rate Limiting Test Rehberi
===========================================

Bu dosya Authentication endpoint'lerini test etmek için CURL komutları içerir.
Backend'ı http://localhost:8086 adresinde çalışıyor olmalıdır.

Ön Koşullar:
- Redis bağlı olmalıdır (rate limiting için)
- PostgreSQL çalışıyor olmalıdır
- Backend start edilmiş olmalıdır
"""

# ─── Temel Endpoint'ler ────────────────────────────────────────────────

# 1. Yeni Kullanıcı Kaydı (Register)
# ─────────────────────────────────────

curl -X POST http://localhost:8086/api/v1/users/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "SecurePassword123!"
  }'

# Beklenen Yanıt (201 Created):
# {
#   "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
#   "token_type": "bearer",
#   "user": {
#     "id": 1,
#     "email": "test@example.com",
#     "is_active": true,
#     ...
#   }
# }


# 2. Kullanıcı Girişi (Login)
# ──────────────────────────

curl -X POST http://localhost:8086/api/v1/users/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "SecurePassword123!"
  }'

# Beklenen Yanıt (200 OK): Yukarıdakiyle aynı yapı


# 3. Google OAuth Girişi (Yeni Kullanıcı Oluşturma)
# ──────────────────────────────────────────────────

# Not: Gerçek bir Google ID Token gerekir. Test için, geçerli token'ı
# Google Login testi yapılıp frontend'den almalı veya 
# https://developers.google.com/oauthplayground kullanabilir.

curl -X POST http://localhost:8086/api/v1/users/oauth/google \
  -H "Content-Type: application/json" \
  -d '{
    "token": "eyJhbGciOiJSUzI1NiIsImtpZCI6IjI3ODQ2ZTY2ZTY2ZTY2ZTY2ZTY2ZTY2ZTY2ZTY2ZTY2ZTY2ZTY2ZTY2IiwidHlwIjoiSldUIn0...",
    "device_type": "web"
  }'

# Beklenen Yanıt (200 OK):
# {
#   "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
#   "token_type": "bearer",
#   "user": {
#     "id": 2,
#     "email": "user@gmail.com",
#     "name": "John Doe",
#     "avatar": "https://lh3.googleusercontent.com/...",
#     "is_active": true
#   }
# }


# 4. Apple OAuth (TBD)
# ──────────────────

curl -X POST http://localhost:8086/api/v1/users/oauth/apple \
  -H "Content-Type: application/json" \
  -d '{
    "token": "apple.identity.token",
    "device_type": "ios"
  }'

# Beklenen Yanıt (501 Not Implemented):
# {
#   "detail": "Apple OAuth şu anda geliştirme aşamasında. Lütfen Google OAuth kullanın."
# }


# ─── Rate Limiting Test'leri ────────────────────────────────────────

# Rate Limit Senaryosu: 5 başarısız giriş denememesi sonrası 429
# ──────────────────────────────────────────────────────────────

# Deneme 1-5: Hatalı şifre + Rate Limit Counter Artışı
for i in {1..5}; do
  echo "Deneme $i:"
  curl -X POST http://localhost:8086/api/v1/users/login \
    -H "Content-Type: application/json" \
    -d '{
      "email": "test@example.com",
      "password": "WrongPassword"
    }'
  echo "\n"
done

# Deneme 6: Rate Limit Aşıldı → 429 Too Many Requests
curl -X POST http://localhost:8086/api/v1/users/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "WrongPassword"
  }'

# Beklenen Yanıt (429 Too Many Requests):
# {
#   "detail": "Çok fazla deneme. 15 dakika sonra tekrar deneyin."
# }


# ─── Başarıyla Girişi Rate Limit Temizleme ───────

# 1. Rate limit reset edilmeden önce, başarılı giriş yaparsak
#    (eğer doğru şifreyi biliyorsak):
curl -X POST http://localhost:8086/api/v1/users/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "SecurePassword123!"
  }'

# Beklenen Yanıt (200 OK): Token döner ve counter sıfırlanır.
# Sonraki hatalı deneme 1'den başlar (5'e kadar izin verilir).


# ─── JWT Token Doğrulama ve Protected Endpoint Test'i ────

# Token aldıktan sonra, protected endpoint'leri test edebilirsiniz:
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

curl -X GET http://localhost:8086/api/v1/users/me \
  -H "Authorization: Bearer $TOKEN"

# Beklenen Yanıt (200 OK): Mevcut kullanıcı bilgileri döner


# ─── Farklı Senaryolar ────────────────────────────────

# Senaryo 1: Aynı e-posta adı iki kez register
# ───────────────────────────────────────────

curl -X POST http://localhost:8086/api/v1/users/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "duplicate@example.com",
    "password": "Password123!"
  }'

# İkinci deneme: 409 Conflict
curl -X POST http://localhost:8086/api/v1/users/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "duplicate@example.com",
    "password": "DifferentPassword123!"
  }'

# Beklenen Yanıt (409 Conflict):
# {
#   "detail": "Bu e-posta adresi zaten kayıtlı."
# }


# Senaryo 2: Google OAuth ile kaydedilen user, aynı e-posta ile tekrar giriş
# ──────────────────────────────────────────────────────────────────────────

# İlk giriş: Yeni user oluşacak
curl -X POST http://localhost:8086/api/v1/users/oauth/google \
  -H "Content-Type: application/json" \
  -d '{
    "token": "VALID_GOOGLE_TOKEN_1",
    "device_type": "web"
  }'
# Yanıt: id=5, is_new=true

# İkinci giriş: Aynı token/e-posta ile tekrar login
curl -X POST http://localhost:8086/api/v1/users/oauth/google \
  -H "Content-Type: application/json" \
  -d '{
    "token": "VALID_GOOGLE_TOKEN_1",
    "device_type": "mobile"
  }'
# Yanıt: id=5, is_new=false (yeni token döner ama user creation olmaz)


# ─── Hata Durumları ve Status Kod'ları ─────────

# Status Code Tablosu:
# 200 - Başarılı giriş veya OAUTH
# 201 - Başarılı register (yeni user oluşturuldu)
# 400 - Eksik field (email/password) veya format hatası
# 401 - Geçersiz token veya hatalı şifre
# 403 - Kullanıcı devre dışı (is_active=false)
# 409 - E-posta zaten kayıtlı (register'da)
# 429 - Rate limit aşıldı (5+ başarısız deneme)
# 500 - Server hatası
# 501 - Not implemented (Apple OAuth)


# ─── Integration Test Python Script ────────────────

# test_oauth.py - Python ile full test
"""
import asyncio
import httpx
import json

BASE_URL = "http://localhost:8086/api/v1"

async def test_register():
    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"{BASE_URL}/users/register",
            json={"email": "testuser@example.com", "password": "Password123!"}
        )
        assert response.status_code == 201
        data = response.json()
        assert "access_token" in data
        print("✓ Register test passed")
        return data["access_token"]

async def test_login():
    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"{BASE_URL}/users/login",
            json={"email": "testuser@example.com", "password": "Password123!"}
        )
        assert response.status_code == 200
        print("✓ Login test passed")

async def test_rate_limiting():
    async with httpx.AsyncClient() as client:
        # 5 hatalı deneme
        for i in range(5):
            response = await client.post(
                f"{BASE_URL}/users/login",
                json={"email": "testuser@example.com", "password": "WrongPassword"}
            )
            assert response.status_code == 401
        
        # 6. deneme: 429
        response = await client.post(
            f"{BASE_URL}/users/login",
            json={"email": "testuser@example.com", "password": "WrongPassword"}
        )
        assert response.status_code == 429
        print("✓ Rate limiting test passed")

async def main():
    token = await test_register()
    await test_login()
    await test_rate_limiting()
    print("\nTum testler geçti! ✓")

asyncio.run(main())
"""

# Komut dosyası ile çalıştırma:
# python test_oauth.py


# ─── Redis Rate Limit Kontrol ─────────────────────

# Redis CLI'den rate limit değerlerini kontrol etme:
# redis-cli
# > KEYS auth_failed:*
# > GET auth_failed:test@example.com
# > TTL auth_failed:test@example.com  (kaç saniye kaldığını göster)
# > DEL auth_failed:test@example.com  (manual sıfırlama)


# ─── Logging Hatası Tanılama ────────────────────

# Backend logs'da aşağıdaki satırları arayın:
# [INFO] Yeni kullanıcı kaydedildi: id=1
# [INFO] Kullanıcı girişi: id=1
# [INFO] Google OAuth Yeni kullanıcı: id=2
# [WARNING] Rate limit aşıldı: auth_failed:test@example.com

# Hata durumunuz:
# [ERROR] Google OAuth: Kullanıcı oluşturulamadı
# [WARNING] Google token doğrulama başarısız
# [ERROR] Rate limit kontrol hatası
