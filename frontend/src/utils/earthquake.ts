/**
 * Deprem verisi için yardımcı fonksiyonlar.
 * Büyüklük rengi, mesafe hesaplama, tarih formatlama.
 */

import { formatDistanceToNow, format, parseISO } from 'date-fns'
import { tr } from 'date-fns/locale'

/**
 * Deprem büyüklüğüne göre renk kodu döner.
 * @param magnitude - Deprem büyüklüğü (Richter)
 * @returns Tailwind CSS renk sınıfı
 */
export function getMagnitudeColor(magnitude: number): string {
  if (magnitude < 2.0) return 'text-gray-500'
  if (magnitude < 3.0) return 'text-blue-500'
  if (magnitude < 4.0) return 'text-green-500'
  if (magnitude < 5.0) return 'text-yellow-500'
  if (magnitude < 6.0) return 'text-orange-500'
  return 'text-red-600'
}

/**
 * Deprem büyüklüğüne göre arka plan rengi döner.
 */
export function getMagnitudeBgColor(magnitude: number): string {
  if (magnitude < 2.0) return 'bg-gray-100'
  if (magnitude < 3.0) return 'bg-blue-100'
  if (magnitude < 4.0) return 'bg-green-100'
  if (magnitude < 5.0) return 'bg-yellow-100'
  if (magnitude < 6.0) return 'bg-orange-100'
  return 'bg-red-100'
}

/**
 * Deprem büyüklüğüne göre tehlike seviyesi etiketi döner.
 */
export function getMagnitudeLabel(magnitude: number): string {
  if (magnitude < 2.0) return 'Mikro'
  if (magnitude < 3.0) return 'Küçük'
  if (magnitude < 4.0) return 'Hafif'
  if (magnitude < 5.0) return 'Orta'
  if (magnitude < 6.0) return 'Güçlü'
  if (magnitude < 7.0) return 'Büyük'
  return 'Çok Büyük'
}

/**
 * Risk seviyesine göre renk döner.
 */
export function getRiskColor(level: string): string {
  const colors: Record<string, string> = {
    'Düşük': 'text-green-600',
    'Orta': 'text-yellow-600',
    'Yüksek': 'text-orange-600',
    'Çok Yüksek': 'text-red-600',
  }
  return colors[level] ?? 'text-gray-600'
}

/**
 * İki koordinat arasındaki mesafeyi km cinsinden hesaplar (Haversine formülü).
 * @param lat1 - Birinci nokta enlemi
 * @param lon1 - Birinci nokta boylamı
 * @param lat2 - İkinci nokta enlemi
 * @param lon2 - İkinci nokta boylamı
 * @returns Mesafe (km)
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371 // Dünya yarıçapı (km)
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180)
}

/**
 * ISO tarih stringini Türkçe göreli zaman formatına çevirir.
 * Örnek: "3 saat önce"
 */
export function formatRelativeTime(isoDate: string): string {
  try {
    return formatDistanceToNow(parseISO(isoDate), {
      addSuffix: true,
      locale: tr,
    })
  } catch {
    return isoDate
  }
}

/**
 * ISO tarih stringini Türkçe tarih/saat formatına çevirir.
 * Örnek: "20 Şubat 2024, 14:30"
 */
export function formatDateTime(isoDate: string): string {
  try {
    return format(parseISO(isoDate), "d MMMM yyyy, HH:mm", { locale: tr })
  } catch {
    return isoDate
  }
}

/**
 * Derinliği okunabilir formata çevirir.
 */
export function formatDepth(depth: number): string {
  return `${depth.toFixed(1)} km`
}

/**
 * Büyüklüğü sabit ondalık formata çevirir.
 */
export function formatMagnitude(magnitude: number): string {
  return magnitude.toFixed(1)
}