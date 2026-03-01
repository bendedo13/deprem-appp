/**
 * Form doğrulama fonksiyonları testleri.
 */

import { describe, it, expect } from 'vitest'
import {
  isValidEmail,
  isValidPassword,
  getPasswordStrength,
  getPasswordStrengthLabel,
  isValidPhone,
  isValidLatitude,
  isValidLongitude,
  isNotEmpty,
  isInRange,
} from '../../utils/validation'

describe('isValidEmail', () => {
  it('geçerli e-posta adresini kabul eder', () => {
    expect(isValidEmail('test@example.com')).toBe(true)
    expect(isValidEmail('user.name+tag@domain.co.uk')).toBe(true)
    expect(isValidEmail('user123@test.org')).toBe(true)
  })

  it('geçersiz e-posta adresini reddeder', () => {
    expect(isValidEmail('notanemail')).toBe(false)
    expect(isValidEmail('@domain.com')).toBe(false)
    expect(isValidEmail('user@')).toBe(false)
    expect(isValidEmail('')).toBe(false)
    expect(isValidEmail('user @domain.com')).toBe(false)
  })

  it('boşluklu e-postayı trim ederek kontrol eder', () => {
    expect(isValidEmail('  test@example.com  ')).toBe(true)
  })
})

describe('isValidPassword', () => {
  it('8 veya daha fazla karakterli şifreyi kabul eder', () => {
    expect(isValidPassword('12345678')).toBe(true)
    expect(isValidPassword('password123')).toBe(true)
    expect(isValidPassword('a'.repeat(128))).toBe(true)
  })

  it('8 karakterden kısa şifreyi reddeder', () => {
    expect(isValidPassword('1234567')).toBe(false)
    expect(isValidPassword('')).toBe(false)
    expect(isValidPassword('abc')).toBe(false)
  })

  it('tam 8 karakterli şifreyi kabul eder', () => {
    expect(isValidPassword('12345678')).toBe(true)
  })
})

describe('getPasswordStrength', () => {
  it('kısa basit şifre için düşük skor döner', () => {
    expect(getPasswordStrength('abc')).toBeLessThan(2)
  })

  it('uzun karmaşık şifre için yüksek skor döner', () => {
    const score = getPasswordStrength('MyP@ssw0rd123!')
    expect(score).toBeGreaterThanOrEqual(3)
  })

  it('skor 0-4 arasında olur', () => {
    const score = getPasswordStrength('test')
    expect(score).toBeGreaterThanOrEqual(0)
    expect(score).toBeLessThanOrEqual(4)
  })

  it('büyük harf içeren şifre daha yüksek skor alır', () => {
    const lower = getPasswordStrength('password123')
    const upper = getPasswordStrength('Password123')
    expect(upper).toBeGreaterThan(lower)
  })

  it('özel karakter içeren şifre daha yüksek skor alır', () => {
    const without = getPasswordStrength('Password123')
    const with_ = getPasswordStrength('Password123!')
    expect(with_).toBeGreaterThan(without)
  })
})

describe('getPasswordStrengthLabel', () => {
  it('0 için "Çok Zayıf" döner', () => {
    expect(getPasswordStrengthLabel(0)).toBe('Çok Zayıf')
  })

  it('2 için "Orta" döner', () => {
    expect(getPasswordStrengthLabel(2)).toBe('Orta')
  })

  it('4 için "Çok Güçlü" döner', () => {
    expect(getPasswordStrengthLabel(4)).toBe('Çok Güçlü')
  })

  it('geçersiz skor için "Bilinmiyor" döner', () => {
    expect(getPasswordStrengthLabel(99)).toBe('Bilinmiyor')
  })
})

describe('isValidPhone', () => {
  it('+90 ile başlayan geçerli numarayı kabul eder', () => {
    expect(isValidPhone('+905551234567')).toBe(true)
    expect(isValidPhone('+90 555 123 45 67')).toBe(true)
  })

  it('0 ile başlayan geçerli numarayı kabul eder', () => {
    expect(isValidPhone('05551234567')).toBe(true)
  })

  it('geçersiz numarayı reddeder', () => {
    expect(isValidPhone('12345')).toBe(false)
    expect(isValidPhone('abc')).toBe(false)
    expect(isValidPhone('')).toBe(false)
    expect(isValidPhone('+1234567890')).toBe(false)
  })
})

describe('isValidLatitude', () => {
  it('geçerli enlem değerlerini kabul eder', () => {
    expect(isValidLatitude(0)).toBe(true)
    expect(isValidLatitude(41.0)).toBe(true)
    expect(isValidLatitude(-90)).toBe(true)
    expect(isValidLatitude(90)).toBe(true)
  })

  it('geçersiz enlem değerlerini reddeder', () => {
    expect(isValidLatitude(91)).toBe(false)
    expect(isValidLatitude(-91)).toBe(false)
    expect(isValidLatitude(180)).toBe(false)
  })
})

describe('isValidLongitude', () => {
  it('geçerli boylam değerlerini kabul eder', () => {
    expect(isValidLongitude(0)).toBe(true)
    expect(isValidLongitude(29.0)).toBe(true)
    expect(isValidLongitude(-180)).toBe(true)
    expect(isValidLongitude(180)).toBe(true)
  })

  it('geçersiz boylam değerlerini reddeder', () => {
    expect(isValidLongitude(181)).toBe(false)
    expect(isValidLongitude(-181)).toBe(false)
  })
})

describe('isNotEmpty', () => {
  it('dolu string için true döner', () => {
    expect(isNotEmpty('hello')).toBe(true)
    expect(isNotEmpty('  hello  ')).toBe(true)
  })

  it('boş string için false döner', () => {
    expect(isNotEmpty('')).toBe(false)
    expect(isNotEmpty('   ')).toBe(false)
  })
})

describe('isInRange', () => {
  it('aralık içindeki değer için true döner', () => {
    expect(isInRange(5, 0, 10)).toBe(true)
    expect(isInRange(0, 0, 10)).toBe(true)
    expect(isInRange(10, 0, 10)).toBe(true)
  })

  it('aralık dışındaki değer için false döner', () => {
    expect(isInRange(-1, 0, 10)).toBe(false)
    expect(isInRange(11, 0, 10)).toBe(false)
  })
})