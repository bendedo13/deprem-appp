/**
 * LocalStorage yardımcı fonksiyonları.
 * Type-safe okuma/yazma işlemleri.
 */

const TOKEN_KEY = 'access_token'
const USER_KEY = 'user_data'

/**
 * JWT token'ı localStorage'a kaydeder.
 */
export function saveToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token)
}

/**
 * JWT token'ı localStorage'dan okur.
 */
export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

/**
 * JWT token'ı localStorage'dan siler.
 */
export function removeToken(): void {
  localStorage.removeItem(TOKEN_KEY)
}

/**
 * Token'ın varlığını kontrol eder.
 */
export function hasToken(): boolean {
  return !!getToken()
}

/**
 * Kullanıcı verisini localStorage'a kaydeder.
 */
export function saveUser<T>(user: T): void {
  localStorage.setItem(USER_KEY, JSON.stringify(user))
}

/**
 * Kullanıcı verisini localStorage'dan okur.
 */
export function getUser<T>(): T | null {
  const raw = localStorage.getItem(USER_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

/**
 * Tüm auth verilerini temizler.
 */
export function clearAuth(): void {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
}