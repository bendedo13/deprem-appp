/**
 * Yardımcı fonksiyonlar — büyüklük rengi, tarih formatlama vb.
 */

/**
 * Deprem büyüklüğüne göre renk sınıfı döner.
 */
export function getMagnitudeColor(magnitude: number): string {
  if (magnitude < 3.0) return 'text-green-600'
  if (magnitude < 4.0) return 'text-yellow-500'
  if (magnitude < 5.0) return 'text-orange-500'
  if (magnitude < 6.0) return 'text-red-500'
  return 'text-red-800'
}

/**
 * Deprem büyüklüğüne göre arka plan rengi döner.
 */
export function getMagnitudeBgColor(magnitude: number): string {
  if (magnitude < 3.0) return 'bg-green-100'
  if (magnitude < 4.0) return 'bg-yellow-100'
  if (magnitude < 5.0) return 'bg-orange-100'
  if (magnitude < 6.0) return 'bg-red-100'
  return 'bg-red-200'
}

/**
 * Risk seviyesine göre renk döner.
 */
export function getRiskLevelColor(level: string): string {
  const map: Record<string, string> = {
    'Düşük': 'text-green-600',
    'Orta': 'text-yellow-600',
    'Yüksek': 'text-orange-600',
    'Çok Yüksek': 'text-red-600',
  }
  return map[level] ?? 'text-gray-600'
}

/**
 * ISO tarih stringini Türkçe formatlar.
 */
export function formatDate(isoString: string): string {
  const date = new Date(isoString)
  return date.toLocaleString('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/**
 * Kaç dakika/saat/gün önce olduğunu döner.
 */
export function timeAgo(isoString: string): string {
  const now = new Date()
  const date = new Date(isoString)
  const diffMs = now.getTime() - date.getTime()
  const diffMin = Math.floor(diffMs / 60000)

  if (diffMin < 1) return 'Az önce'
  if (diffMin < 60) return `${diffMin} dakika önce`
  const diffHour = Math.floor(diffMin / 60)
  if (diffHour < 24) return `${diffHour} saat önce`
  const diffDay = Math.floor(diffHour / 24)
  return `${diffDay} gün önce`
}

/**
 * Koordinatları okunabilir formata çevirir.
 */
export function formatCoordinates(lat: number, lon: number): string {
  const latDir = lat >= 0 ? 'K' : 'G'
  const lonDir = lon >= 0 ? 'D' : 'B'
  return `${Math.abs(lat).toFixed(4)}°${latDir}, ${Math.abs(lon).toFixed(4)}°${lonDir}`
}

/**
 * Büyüklük değerini risk açıklamasına çevirir.
 */
export function getMagnitudeLabel(magnitude: number): string {
  if (magnitude < 2.0) return 'Mikro'
  if (magnitude < 3.0) return 'Çok Küçük'
  if (magnitude < 4.0) return 'Küçük'
  if (magnitude < 5.0) return 'Orta'
  if (magnitude < 6.0) return 'Güçlü'
  if (magnitude < 7.0) return 'Büyük'
  return 'Çok Büyük'
}

/**
 * Sayıyı Türkçe formatlar (1000 → 1.000).
 */
export function formatNumber(n: number): string {
  return n.toLocaleString('tr-TR')
}

/**
 * E-posta validasyonu.
 */
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

/**
 * Şifre güç kontrolü.
 */
export function isStrongPassword(password: string): boolean {
  return password.length >= 8
}