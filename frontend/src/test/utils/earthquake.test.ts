/**
 * Deprem yardımcı fonksiyonları testleri.
 * getMagnitudeColor, calculateDistance, formatRelativeTime vb.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  getMagnitudeColor,
  getMagnitudeBgColor,
  getMagnitudeLabel,
  getRiskColor,
  calculateDistance,
  formatRelativeTime,
  formatDateTime,
  formatDepth,
  formatMagnitude,
} from '../../utils/earthquake'

describe('getMagnitudeColor', () => {
  it('1.5 büyüklük için gri renk döner', () => {
    expect(getMagnitudeColor(1.5)).toBe('text-gray-500')
  })

  it('2.5 büyüklük için mavi renk döner', () => {
    expect(getMagnitudeColor(2.5)).toBe('text-blue-500')
  })

  it('3.5 büyüklük için yeşil renk döner', () => {
    expect(getMagnitudeColor(3.5)).toBe('text-green-500')
  })

  it('4.5 büyüklük için sarı renk döner', () => {
    expect(getMagnitudeColor(4.5)).toBe('text-yellow-500')
  })

  it('5.5 büyüklük için turuncu renk döner', () => {
    expect(getMagnitudeColor(5.5)).toBe('text-orange-500')
  })

  it('6.5 büyüklük için kırmızı renk döner', () => {
    expect(getMagnitudeColor(6.5)).toBe('text-red-600')
  })

  it('tam sınır değeri 3.0 için yeşil renk döner', () => {
    expect(getMagnitudeColor(3.0)).toBe('text-green-500')
  })

  it('tam sınır değeri 6.0 için kırmızı renk döner', () => {
    expect(getMagnitudeColor(6.0)).toBe('text-red-600')
  })
})

describe('getMagnitudeBgColor', () => {
  it('4.5 büyüklük için sarı arka plan döner', () => {
    expect(getMagnitudeBgColor(4.5)).toBe('bg-yellow-100')
  })

  it('6.0 büyüklük için kırmızı arka plan döner', () => {
    expect(getMagnitudeBgColor(6.0)).toBe('bg-red-100')
  })
})

describe('getMagnitudeLabel', () => {
  it('1.5 için "Mikro" döner', () => {
    expect(getMagnitudeLabel(1.5)).toBe('Mikro')
  })

  it('2.5 için "Küçük" döner', () => {
    expect(getMagnitudeLabel(2.5)).toBe('Küçük')
  })

  it('3.5 için "Hafif" döner', () => {
    expect(getMagnitudeLabel(3.5)).toBe('Hafif')
  })

  it('4.5 için "Orta" döner', () => {
    expect(getMagnitudeLabel(4.5)).toBe('Orta')
  })

  it('5.5 için "Güçlü" döner', () => {
    expect(getMagnitudeLabel(5.5)).toBe('Güçlü')
  })

  it('6.5 için "Büyük" döner', () => {
    expect(getMagnitudeLabel(6.5)).toBe('Büyük')
  })

  it('7.5 için "Çok Büyük" döner', () => {
    expect(getMagnitudeLabel(7.5)).toBe('Çok Büyük')
  })
})

describe('getRiskColor', () => {
  it('"Düşük" için yeşil renk döner', () => {
    expect(getRiskColor('Düşük')).toBe('text-green-600')
  })

  it('"Orta" için sarı renk döner', () => {
    expect(getRiskColor('Orta')).toBe('text-yellow-600')
  })

  it('"Yüksek" için turuncu renk döner', () => {
    expect(getRiskColor('Yüksek')).toBe('text-orange-600')
  })

  it('"Çok Yüksek" için kırmızı renk döner', () => {
    expect(getRiskColor('Çok Yüksek')).toBe('text-red-600')
  })

  it('bilinmeyen seviye için gri renk döner', () => {
    expect(getRiskColor('Bilinmiyor')).toBe('text-gray-600')
  })
})

describe('calculateDistance', () => {
  it('aynı nokta için 0 km döner', () => {
    const dist = calculateDistance(41.0, 29.0, 41.0, 29.0)
    expect(dist).toBe(0)
  })

  it('İstanbul - Ankara arası yaklaşık 350 km döner', () => {
    // İstanbul: 41.0082, 28.9784 — Ankara: 39.9334, 32.8597
    const dist = calculateDistance(41.0082, 28.9784, 39.9334, 32.8597)
    expect(dist).toBeGreaterThan(340)
    expect(dist).toBeLessThan(360)
  })

  it('İstanbul - İzmir arası yaklaşık 440 km döner', () => {
    // İstanbul: 41.0082, 28.9784 — İzmir: 38.4192, 27.1287
    const dist = calculateDistance(41.0082, 28.9784, 38.4192, 27.1287)
    expect(dist).toBeGreaterThan(420)
    expect(dist).toBeLessThan(460)
  })

  it('negatif koordinatlarla çalışır', () => {
    const dist = calculateDistance(-33.8688, 151.2093, -37.8136, 144.9631)
    expect(dist).toBeGreaterThan(700)
    expect(dist).toBeLessThan(750)
  })

  it('pozitif değer döner', () => {
    const dist = calculateDistance(0, 0, 1, 1)
    expect(dist).toBeGreaterThan(0)
  })
})

describe('formatRelativeTime', () => {
  it('geçerli ISO tarih için string döner', () => {
    const result = formatRelativeTime('2024-02-20T14:30:00Z')
    expect(typeof result).toBe('string')
    expect(result.length).toBeGreaterThan(0)
  })

  it('geçersiz tarih için orijinal string döner', () => {
    const result = formatRelativeTime('geçersiz-tarih')
    expect(result).toBe('geçersiz-tarih')
  })
})

describe('formatDateTime', () => {
  it('geçerli ISO tarih için Türkçe format döner', () => {
    const result = formatDateTime('2024-02-20T14:30:00Z')
    expect(result).toContain('2024')
    expect(result).toContain('14:30')
  })

  it('geçersiz tarih için orijinal string döner', () => {
    const result = formatDateTime('geçersiz')
    expect(result).toBe('geçersiz')
  })
})

describe('formatDepth', () => {
  it('10 km derinliği "10.0 km" formatında döner', () => {
    expect(formatDepth(10)).toBe('10.0 km')
  })

  it('7.5 km derinliği "7.5 km" formatında döner', () => {
    expect(formatDepth(7.5)).toBe('7.5 km')
  })

  it('0 derinliği "0.0 km" formatında döner', () => {
    expect(formatDepth(0)).toBe('0.0 km')
  })
})

describe('formatMagnitude', () => {
  it('4.5 büyüklüğü "4.5" formatında döner', () => {
    expect(formatMagnitude(4.5)).toBe('4.5')
  })

  it('tam sayı büyüklüğü ondalıklı döner', () => {
    expect(formatMagnitude(5)).toBe('5.0')
  })

  it('çok ondalıklı sayıyı 1 ondalığa yuvarlar', () => {
    expect(formatMagnitude(4.567)).toBe('4.6')
  })
})