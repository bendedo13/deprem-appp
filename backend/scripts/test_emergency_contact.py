#!/usr/bin/env python3
"""
Acil Kişiler modülü test scripti.
Test verisi: Alan İnal, 05513521373

Kullanım:
  cd backend
  python scripts/test_emergency_contact.py
"""

import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

def test_phone_validation():
    """phonenumbers ile TR formatı doğrulama."""
    from app.schemas.emergency_contact import _normalize_phone_tr, EmergencyContactIn

    # Alan İnal 05513521373
    tests = [
        ("05513521373", "+905513521373"),
        ("+905513521373", "+905513521373"),
        ("5513521373", "+905513521373"),
    ]
    for inp, expected in tests:
        try:
            out = _normalize_phone_tr(inp)
            ok = out == expected
            print(f"  {inp!r} -> {out!r} {'✓' if ok else '✗ (expected ' + expected + ')'}")
        except Exception as e:
            print(f"  {inp!r} -> ERROR: {e}")

    # Schema validation
    try:
        c = EmergencyContactIn(name="Alan İnal", phone_number="05513521373", relationship="Arkadaş")
        print(f"  Schema OK: name={c.name} phone_number={c.phone_number}")
    except Exception as e:
        print(f"  Schema ERROR: {e}")


def main():
    print("=== Acil Kişiler Modülü Testi ===\n")
    print("1. Telefon doğrulama (phonenumbers):")
    test_phone_validation()
    print("\n2. API testi için:")
    print("   - Backend çalıştırın: uvicorn app.main:app --reload")
    print("   - Giriş yapın, POST /api/v1/users/me/contacts ile Alan İnal ekleyin")
    print("   - S.O.S simülasyonu: Erken Uyarı sekmesinde test edin")
    print("\n✓ Test tamamlandı.")


if __name__ == "__main__":
    main()
