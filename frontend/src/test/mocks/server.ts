/**
 * MSW (Mock Service Worker) sunucusu.
 * API isteklerini test ortamında yakalar.
 */
import { setupServer } from 'msw/node'
import { handlers } from './handlers'

export const server = setupServer(...handlers)