/**
 * Form doğrulama yardımcı fonksiyonları.
 * E-posta, şifre, telefon validasyonu.
 */

/**
 * E-posta adresini doğrular.
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email.trim())
}

/**
 * Şifre güçlülüğünü kontrol eder.
 * Minimum 8 karakter gerekli.
 */
export function isValidPassword(password: string): boolean {
  return password.length >= 8
}

/**
 * Şifre güçlülük skoru döner (0-4).
 * 0: Çok zayıf, 4: Çok güçlü
 */
export function getPasswordStrength(password: string): number {
  let score = 0
  if (password.length >= 8) score++
  if (password.length >= 12) score++
  if (/[A-Z]/.test(password)) score++
  if (/[0-9]/.test(password)) score++
  if (/[^A-Za-z0-9]/.test(password)) score++
  return Math.min(score, 4)
}

/**
 * Şifre güçlülük etiketini döner.
 */
export function getPasswordStrengthLabel(score: number): string {
  const labels = ['Çok Zayıf', 'Zayıf', 'Orta', 'Güçlü', 'Çok Güçlü']
  return labels[score] ?? 'Bilinmiyor'
}

/**
 * Türkiye telefon numarasını doğrular.
 * +90 ile başlayan veya 0 ile başlayan 10 haneli numara.
 */
export function isValidPhone(phone: string): boolean {
  const cleaned = phone.replace(/[\s\-()]/g, '')
  // +905551234567 veya 05551234567 formatları
  return /^(\+90|0)[0-9]{10}$/.test(cleaned)
}

/**
 * Koordinat değerini doğrular.
 */
export function isValidLatitude(lat: number): boolean {
  return lat >= -90 && lat <= 90
}

export function isValidLongitude(lon: number): boolean {
  return lon >= -180 && lon <= 180
}

/**
 * Boş string kontrolü.
 */
export function isNotEmpty(value: string): boolean {
  return value.trim().length > 0
}

/**
 * Sayı aralığı kontrolü.
 */
export function isInRange(value: number, min: number, max: number): boolean {
  return value >= min && value <= max
}