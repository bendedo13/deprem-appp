/**
 * MSW (Mock Service Worker) sunucu kurulumu.
 * API isteklerini test ortamında yakalar ve mock yanıt döner.
 */

import { setupServer } from 'msw/node'
import { handlers } from './handlers'

// Test sunucusunu handler'larla başlat
export const server = setupServer(...handlers)