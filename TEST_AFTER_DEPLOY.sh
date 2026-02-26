#!/bin/bash
# Deprem App - Deployment Test Script
# Deploy sonrası tüm endpoint'leri test eder

set -e

VPS_URL="http://46.4.123.77:8001"

echo "═══════════════════════════════════════════════════════════════"
echo "🧪 DEPREM APP - DEPLOYMENT TEST"
echo "═══════════════════════════════════════════════════════════════"

echo ""
echo "📋 Test 1: Health Check"
echo "─────────────────────────────────────────────────────────────"
curl -s "${VPS_URL}/api/v1/health" | jq .

echo ""
echo "📋 Test 2: Kullanıcı Kaydı"
echo "─────────────────────────────────────────────────────────────"
REGISTER_RESPONSE=$(curl -s -X POST "${VPS_URL}/api/v1/users/register" \
  -H 'Content-Type: application/json' \
  -d "{\"email\":\"test_$(date +%s)@example.com\",\"password\":\"test123456\"}")

echo "$REGISTER_RESPONSE" | jq .

# Token'ı al
TOKEN=$(echo "$REGISTER_RESPONSE" | jq -r '.access_token')

if [ "$TOKEN" == "null" ] || [ -z "$TOKEN" ]; then
    echo "❌ HATA: Token alınamadı!"
    echo "Response: $REGISTER_RESPONSE"
    exit 1
fi

echo "✅ Token alındı: ${TOKEN:0:20}..."

echo ""
echo "📋 Test 3: Profil Bilgisi"
echo "─────────────────────────────────────────────────────────────"
curl -s -X GET "${VPS_URL}/api/v1/users/me" \
  -H "Authorization: Bearer $TOKEN" | jq .

echo ""
echo "📋 Test 4: Profil Güncelleme"
echo "─────────────────────────────────────────────────────────────"
curl -s -X PUT "${VPS_URL}/api/v1/users/me" \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"name":"Test User","phone":"+905551234567","avatar":"👤"}' | jq .

echo ""
echo "📋 Test 5: Acil Kişi Ekleme"
echo "─────────────────────────────────────────────────────────────"
CONTACT_RESPONSE=$(curl -s -X POST "${VPS_URL}/api/v1/users/me/contacts" \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"name":"Acil Kişi","phone":"+905551234567","relation":"Arkadaş","methods":["sms"],"priority":1}')

echo "$CONTACT_RESPONSE" | jq .

echo ""
echo "📋 Test 6: Acil Kişileri Listele"
echo "─────────────────────────────────────────────────────────────"
curl -s -X GET "${VPS_URL}/api/v1/users/me/contacts" \
  -H "Authorization: Bearer $TOKEN" | jq .

echo ""
echo "📋 Test 7: Ben İyiyim (SMS Gönderir!)"
echo "─────────────────────────────────────────────────────────────"
curl -s -X POST "${VPS_URL}/api/v1/users/i-am-safe" \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"custom_message":"Test mesajı - Ben iyiyim!","include_location":true,"latitude":41.0082,"longitude":28.9784}' | jq .

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "✅ TÜM TESTLER TAMAMLANDI!"
echo "═══════════════════════════════════════════════════════════════"
echo ""
echo "📱 Twilio SMS kontrol edin: +905551234567 numarasına SMS gitti mi?"
echo ""
