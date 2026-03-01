/**
 * Yardımcı fonksiyon testleri.
 * Saf fonksiyonlar — DOM gerektirmez.
 */
import { describe, it, expect } from 'vitest'
import {
  getMagnitudeColor,
  getMagnitudeBgColor,
  getRiskLevelColor,
  formatDate,
  timeAgo,
  formatCoordinates,
  getMagnitudeLabel,
  formatNumber,
  isValidEmail,
  isStrongPassword,
} from '../utils'

describe('getMagnitudeColor', () => {
  it('3.0 altı için yeşil döner', () => {
    expect(getMagnitudeColor(1.5)).toBe('text-green-600')
    expect(getMagnitudeColor(2.9)).toBe('text-green-600')
  })

  it('3.0-3.9 arası için sarı döner', () => {
    expect(getMagnitudeColor(3.0)).toBe('text-yellow-500')
    expect(getMagnitudeColor(3.9)).toBe('text-yellow-500')
  })

  it('4.0-4.9 arası için turuncu döner', () => {
    expect(getMagnitudeColor(4.0)).toBe('text-orange-500')
    expect(getMagnitudeColor(4.9)).toBe('text-orange-500')
  })

  it('5.0-5.9 arası için kırmızı döner', () => {
    expect(getMagnitudeColor(5.0)).toBe('text-red-500')
    expect(getMagnitudeColor(5.9)).toBe('text-red-500')
  })

  it('6.0 ve üzeri için koyu kırmızı döner', () => {
    expect(getMagnitudeColor(6.0)).toBe('text-red-800')
    expect(getMagnitudeColor(7.5)).toBe('text-red-800')
  })
})

describe('getMagnitudeBgColor', () => {
  it('büyüklüğe göre doğru arka plan rengi döner', () => {
    expect(getMagnitudeBgColor(2.5)).toBe('bg-green-100')
    expect(getMagnitudeBgColor(3.5)).toBe('bg-yellow-100')
    expect(getMagnitudeBgColor(4.5)).toBe('bg-orange-100')
    expect(getMagnitudeBgColor(5.5)).toBe('bg-red-100')
    expect(getMagnitudeBgColor(6.5)).toBe('bg-red-200')
  })
})

describe('getRiskLevelColor', () => {
  it('risk seviyelerine göre doğru renk döner', () => {
    expect(getRiskLevelColor('Düşük')).toBe('text-green-600')
    expect(getRiskLevelColor('Orta')).toBe('text-yellow-600')
    expect(getRiskLevelColor('Yüksek')).toBe('text-orange-600')
    expect(getRiskLevelColor('Çok Yüksek')).toBe('text-red-600')
  })

  it('bilinmeyen seviye için gri döner', () => {
    expect(getRiskLevelColor('Bilinmiyor')).toBe('text-gray-600')
  })
})

describe('formatDate', () => {
  it('ISO tarihi Türkçe formatlar', () => {
    const result = formatDate('2024-01-15T08:30:00Z')
    // Türkçe locale formatı kontrol et
    expect(result).toMatch(/\d{2}\.\d{2}\.\d{4}/)
  })

  it('geçerli bir string döner', () => {
    const result = formatDate('2024-06-01T12:00:00Z')
    expect(typeof result).toBe('string')
    expect(result.length).toBeGreaterThan(0)
  })
})

describe('timeAgo', () => {
  it('az önce döner', () => {
    const now = new Date().toISOString()
    expect(timeAgo(now)).toBe('Az önce')
  })

  it('dakika önce döner', () => {
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()
    expect(timeAgo(fiveMinAgo)).toBe('5 dakika önce')
  })

  it('saat önce döner', () => {
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
    expect(timeAgo(twoHoursAgo)).toBe('2 saat önce')
  })

  it('gün önce döner', () => {
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
    expect(timeAgo(threeDaysAgo)).toBe('3 gün önce')
  })
})

describe('formatCoordinates', () => {
  it('pozitif koordinatları doğru formatlar', () => {
    const result = formatCoordinates(41.0082, 28.9784)
    expect(result).toBe('41.0082°K, 28.9784°D')
  })

  it('negatif koordinatları doğru formatlar', () => {
    const result = formatCoordinates(-33.8688, -70.6693)
    expect(result).toBe('33.8688°G, 70.6693°B')
  })
})

describe('getMagnitudeLabel', () => {
  it('büyüklük etiketlerini doğru döner', () => {
    expect(getMagnitudeLabel(1.5)).toBe('Mikro')
    expect(getMagnitudeLabel(2.5)).toBe('Çok Küçük')
    expect(getMagnitudeLabel(3.5)).toBe('Küçük')
    expect(getMagnitudeLabel(4.5)).toBe('Orta')
    expect(getMagnitudeLabel(5.5)).toBe('Güçlü')
    expect(getMagnitudeLabel(6.5)).toBe('Büyük')
    expect(getMagnitudeLabel(7.5)).toBe('Çok Büyük')
  })
})

describe('formatNumber', () => {
  it('sayıyı Türkçe formatlar', () => {
    const result = formatNumber(1250)
    expect(result).toMatch(/1[.,]250/)
  })

  it('küçük sayıları doğru formatlar', () => {
    expect(formatNumber(0)).toBe('0')
    expect(formatNumber(999)).toBe('999')
  })
})

describe('isValidEmail', () => {
  it('geçerli e-postaları kabul eder', () => {
    expect(isValidEmail('test@example.com')).toBe(true)
    expect(isValidEmail('user.name+tag@domain.co.uk')).toBe(true)
  })

  it('geçersiz e-postaları reddeder', () => {
    expect(isValidEmail('notanemail')).toBe(false)
    expect(isValidEmail('@domain.com')).toBe(false)
    expect(isValidEmail('user@')).toBe(false)
    expect(isValidEmail('')).toBe(false)
  })
})

describe('isStrongPassword', () => {
  it('8+ karakter şifreyi kabul eder', () => {
    expect(isStrongPassword('password123')).toBe(true)
    expect(isStrongPassword('12345678')).toBe(true)
  })

  it('7 karakter altı şifreyi reddeder', () => {
    expect(isStrongPassword('short')).toBe(false)
    expect(isStrongPassword('1234567')).toBe(false)
  })
})