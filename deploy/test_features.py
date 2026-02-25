import requests
import json
import time
import sys
from datetime import datetime

BASE_URL = "http://localhost:8000"
FRONTEND_URL = "http://localhost:3000"

results = []

def log(test_name, status, detail=""):
    icon = "✅" if status == "PASS" else "❌"
    msg = f"{icon} [{test_name}] {detail}"
    print(msg)
    results.append({"test": test_name, "status": status, "detail": detail})

def test_backend_health():
    try:
        r = requests.get(f"{BASE_URL}/health", timeout=5)
        if r.status_code == 200:
            log("Backend Health", "PASS", f"Status: {r.status_code} - {r.json()}")
        else:
            log("Backend Health", "FAIL", f"Status: {r.status_code}")
    except Exception as e:
        log("Backend Health", "FAIL", str(e))

def test_frontend_health():
    try:
        r = requests.get(FRONTEND_URL, timeout=5)
        if r.status_code == 200:
            log("Frontend Health", "PASS", f"Status: {r.status_code}")
        else:
            log("Frontend Health", "FAIL", f"Status: {r.status_code}")
    except Exception as e:
        log("Frontend Health", "FAIL", str(e))

def test_earthquakes_endpoint():
    try:
        r = requests.get(f"{BASE_URL}/api/earthquakes", timeout=10)
        if r.status_code == 200:
            data = r.json()
            count = len(data) if isinstance(data, list) else data.get("count", "?")
            log("Deprem Listesi API", "PASS", f"Veri sayısı: {count}")
        else:
            log("Deprem Listesi API", "FAIL", f"Status: {r.status_code}")
    except Exception as e:
        log("Deprem Listesi API", "FAIL", str(e))

def test_earthquakes_filter():
    try:
        r = requests.get(f"{BASE_URL}/api/earthquakes?min_magnitude=4.0", timeout=10)
        if r.status_code == 200:
            data = r.json()
            log("Deprem Filtre (mag>=4.0)", "PASS", f"Sonuç: {len(data) if isinstance(data, list) else data}")
        else:
            log("Deprem Filtre (mag>=4.0)", "FAIL", f"Status: {r.status_code}")
    except Exception as e:
        log("Deprem Filtre (mag>=4.0)", "FAIL", str(e))

def test_sos_create():
    try:
        payload = {
            "name": "Test Kullanıcı",
            "phone": "05001234567",
            "location": "İstanbul, Kadıköy",
            "latitude": 40.9901,
            "longitude": 29.0251,
            "message": "Test SOS mesajı - otomatik test",
            "people_count": 2,
            "injury_status": "minor"
        }
        r = requests.post(f"{BASE_URL}/api/sos", json=payload, timeout=10)
        if r.status_code in [200, 201]:
            data = r.json()
            sos_id = data.get("id", data.get("sos_id", "?"))
            log("SOS Oluşturma", "PASS", f"SOS ID: {sos_id}")
            return sos_id
        else:
            log("SOS Oluşturma", "FAIL", f"Status: {r.status_code} - {r.text[:200]}")
            return None
    except Exception as e:
        log("SOS Oluşturma", "FAIL", str(e))
        return None

def test_sos_list():
    try:
        r = requests.get(f"{BASE_URL}/api/sos", timeout=10)
        if r.status_code == 200:
            data = r.json()
            count = len(data) if isinstance(data, list) else data.get("count", "?")
            log("SOS Listesi", "PASS", f"Toplam SOS: {count}")
        else:
            log("SOS Listesi", "FAIL", f"Status: {r.status_code}")
    except Exception as e:
        log("SOS Listesi", "FAIL", str(e))

def test_sos_get_by_id(sos_id):
    if not sos_id:
        log("SOS ID ile Getir", "FAIL", "SOS ID yok, oluşturma testi başarısız")
        return
    try:
        r = requests.get(f"{BASE_URL}/api/sos/{sos_id}", timeout=10)
        if r.status_code == 200:
            data = r.json()
            log("SOS ID ile Getir", "PASS", f"SOS bulundu: {data.get('name', '?')}")
        else:
            log("SOS ID ile Getir", "FAIL", f"Status: {r.status_code}")
    except Exception as e:
        log("SOS ID ile Getir", "FAIL", str(e))

def test_sos_update_status(sos_id):
    if not sos_id:
        log("SOS Durum Güncelle", "FAIL", "SOS ID yok")
        return
    try:
        r = requests.patch(f"{BASE_URL}/api/sos/{sos_id}/status", 
                          json={"status": "rescued"}, timeout=10)
        if r.status_code == 200:
            log("SOS Durum Güncelle", "PASS", f"Status 'rescued' olarak güncellendi")
        else:
            log("SOS Durum Güncelle", "FAIL", f"Status: {r.status_code} - {r.text[:200]}")
    except Exception as e:
        log("SOS Durum Güncelle", "FAIL", str(e))

def test_sos_delete(sos_id):
    if not sos_id:
        log("SOS Silme", "FAIL", "SOS ID yok")
        return
    try:
        r = requests.delete(f"{BASE_URL}/api/sos/{sos_id}", timeout=10)
        if r.status_code in [200, 204]:
            log("SOS Silme", "PASS", f"SOS {sos_id} silindi")
        else:
            log("SOS Silme", "FAIL", f"Status: {r.status_code} - {r.text[:200]}")
    except Exception as e:
        log("SOS Silme", "FAIL", str(e))

def test_notifications_endpoint():
    try:
        r = requests.get(f"{BASE_URL}/api/notifications", timeout=10)
        if r.status_code == 200:
            data = r.json()
            log("Bildirimler API", "PASS", f"Bildirim sayısı: {len(data) if isinstance(data, list) else '?'}")
        else:
            log("Bildirimler API", "FAIL", f"Status: {r.status_code}")
    except Exception as e:
        log("Bildirimler API", "FAIL", str(e))

def test_stats_endpoint():
    try:
        r = requests.get(f"{BASE_URL}/api/stats", timeout=10)
        if r.status_code == 200:
            data = r.json()
            log("İstatistik API", "PASS", f"Data: {json.dumps(data)[:100]}")
        else:
            log("İstatistik API", "FAIL", f"Status: {r.status_code}")
    except Exception as e:
        log("İstatistik API", "FAIL", str(e))

def test_map_data_endpoint():
    try:
        r = requests.get(f"{BASE_URL}/api/map/earthquakes", timeout=10)
        if r.status_code == 200:
            data = r.json()
            log("Harita Deprem Verisi", "PASS", f"Veri: {str(data)[:100]}")
        else:
            log("Harita Deprem Verisi", "FAIL", f"Status: {r.status_code}")
    except Exception as e:
        log("Harita Deprem Verisi", "FAIL", str(e))

def test_websocket():
    try:
        import websocket
        ws_url = f"ws://localhost:8000/ws"
        received = []

        def on_message(ws, message):
            received.append(message)
            ws.close()

        def on_error(ws, error):
            pass

        def on_open(ws):
            ws.send(json.dumps({"type": "ping"}))

        ws = websocket.WebSocketApp(ws_url, on_message=on_message, on_error=on_error, on_open=on_open)
        import threading
        t = threading.Thread(target=ws.run_forever)
        t.daemon = True
        t.start()
        t.join(timeout=5)

        if received:
            log("WebSocket Bağlantısı", "PASS", f"Mesaj alındı: {received[0][:50]}")
        else:
            log("WebSocket Bağlantısı", "FAIL", "5 saniyede yanıt yok")
    except ImportError:
        log("WebSocket Bağlantısı", "FAIL", "websocket-client kurulu değil: pip install websocket-client")
    except Exception as e:
        log("WebSocket Bağlantısı", "FAIL", str(e))

def test_database_connection():
    try:
        r = requests.get(f"{BASE_URL}/api/db/status", timeout=5)
        if r.status_code == 200:
            log("Veritabanı Bağlantısı", "PASS", str(r.json()))
        else:
            r2 = requests.get(f"{BASE_URL}/health", timeout=5)
            data = r2.json()
            if "database" in str(data).lower() or "db" in str(data).lower():
                log("Veritabanı Bağlantısı", "PASS", f"Health'den: {data}")
            else:
                log("Veritabanı Bağlantısı", "FAIL", f"DB endpoint yok, status: {r.status_code}")
    except Exception as e:
        log("Veritabanı Bağlantısı", "FAIL", str(e))

def test_cors_headers():
    try:
        r = requests.options(f"{BASE_URL}/api/earthquakes", 
                           headers={"Origin": "http://localhost:3000"}, timeout=5)
        cors = r.headers.get("Access-Control-Allow-Origin", "")
        if cors:
            log("CORS Headers", "PASS", f"Allow-Origin: {cors}")
        else:
            log("CORS Headers", "FAIL", "CORS header yok")
    except Exception as e:
        log("CORS Headers", "FAIL", str(e))

def test_invalid_sos():
    try:
        payload = {"name": ""}
        r = requests.post(f"{BASE_URL}/api/sos", json=payload, timeout=5)
        if r.status_code in [400, 422]:
            log("SOS Validasyon (boş veri)", "PASS", f"Doğru hata kodu: {r.status_code}")
        else:
            log("SOS Validasyon (boş veri)", "FAIL", f"Beklenmedik status: {r.status_code}")
    except Exception as e:
        log("SOS Validasyon (boş veri)", "FAIL", str(e))

def test_rate_limiting():
    try:
        statuses = []
        for i in range(20):
            r = requests.get(f"{BASE_URL}/api/earthquakes", timeout=3)
            statuses.append(r.status_code)
        
        if 429 in statuses:
            log("Rate Limiting", "PASS", f"429 alındı, limit aktif")
        else:
            log("Rate Limiting", "FAIL", "20 istekte rate limit yok (güvenlik riski olabilir)")
    except Exception as e:
        log("Rate Limiting", "FAIL", str(e))

def test_docker_containers():
    try:
        import subprocess
        result = subprocess.run(
            ["docker", "ps", "--format", "{{.Names}}\t{{.Status}}"],
            capture_output=True, text=True, timeout=10
        )
        if result.returncode == 0:
            lines = result.stdout.strip().split("\n")
            running = [l for l in lines if "Up" in l]
            log("Docker Containers", "PASS" if running else "FAIL", 
                f"{len(running)} container çalışıyor:\n    " + "\n    ".join(running))
        else:
            log("Docker Containers", "FAIL", result.stderr[:200])
    except Exception as e:
        log("Docker Containers", "FAIL", str(e))

def test_api_response_time():
    try:
        start = time.time()
        r = requests.get(f"{BASE_URL}/api/earthquakes", timeout=10)
        elapsed = (time.time() - start) * 1000
        if elapsed < 2000:
            log("API Yanıt Süresi", "PASS", f"{elapsed:.0f}ms (< 2000ms)")
        else:
            log("API Yanıt Süresi", "FAIL", f"{elapsed:.0f}ms (çok yavaş!)")
    except Exception as e:
        log("API Yanıt Süresi", "FAIL", str(e))

def print_summary():
    total = len(results)
    passed = sum(1 for r in results if r["status"] == "PASS")
    failed = total - passed
    
    print("\n" + "="*60)
    print(f"TEST SONUÇLARI - {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("="*60)
    print(f"Toplam  : {total}")
    print(f"Başarılı: {passed} ✅")
    print(f"Başarısız: {failed} ❌")
    print(f"Başarı Oranı: {(passed/total*100):.1f}%")
    print("="*60)
    
    if failed > 0:
        print("\nBAŞARISIZ TESTLER:")
        for r in results:
            if r["status"] == "FAIL":
                print(f"  ❌ {r['test']}: {r['detail']}")
    
    print("\nTÜM TEST SONUÇLARI (JSON):")
    print(json.dumps(results, ensure_ascii=False, indent=2))

if __name__ == "__main__":
    print("="*60)
    print("DEPREM APP - KAPSAMLI ÖZELLİK TESTİ")
    print(f"Tarih: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"Backend: {BASE_URL}")
    print(f"Frontend: {FRONTEND_URL}")
    print("="*60)
    print()

    print(">>> ALTYAPI TESTLERİ")
    test_docker_containers()
    test_backend_health()