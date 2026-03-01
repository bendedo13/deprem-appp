/**
 * Hata senaryoları için MSW handler'ları.
 * Belirli testlerde server.use() ile geçici olarak eklenir.
 */
import { http, HttpResponse } from 'msw'

const BASE_URL = 'http://localhost:8000/api/v1'

// 401 Unauthorized handler
export const unauthorizedHandler = http.get(`${BASE_URL}/users/me`, () => {
  return HttpResponse.json(
    { detail: 'Geçersiz veya süresi dolmuş token.' },
    { status: 401 }
  )
})

// 409 Conflict — e-posta zaten kayıtlı
export const emailConflictHandler = http.post(`${BASE_URL}/users/register`, () => {
  return HttpResponse.json(
    { detail: 'Bu e-posta adresi zaten kayıtlı.' },
    { status: 409 }
  )
})

// 401 — yanlış şifre
export const wrongPasswordHandler = http.post(`${BASE_URL}/users/login`, () => {
  return HttpResponse.json(
    { detail: 'E-posta veya şifre hatalı.' },
    { status: 401 }
  )
})

// 500 Server Error
export const serverErrorHandler = http.get(`${BASE_URL}/earthquakes`, () => {
  return HttpResponse.json(
    { detail: 'Sunucu hatası.' },
    { status: 500 }
  )
})

// 429 Rate Limit
export const rateLimitHandler = http.post(`${BASE_URL}/users/i-am-safe`, () => {
  return HttpResponse.json(
    { detail: 'Çok fazla istek.' },
    { status: 429 }
  )
})

// 400 — acil kişi limiti
export const contactLimitHandler = http.post(`${BASE_URL}/users/me/contacts`, () => {
  return HttpResponse.json(
    { detail: 'En fazla 5 acil iletişim kişisi eklenebilir.' },
    { status: 400 }
  )
})