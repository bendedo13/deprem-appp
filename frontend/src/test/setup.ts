/**
 * Vitest global test kurulum dosyası.
 * Her test dosyasından önce çalışır.
 */
import '@testing-library/jest-dom'
import { afterEach, beforeAll, afterAll } from 'vitest'
import { cleanup } from '@testing-library/react'
import { server } from './mocks/server'

// Her testten sonra DOM temizle
afterEach(() => {
  cleanup()
})

// MSW sunucusunu başlat/durdur
beforeAll(() => server.listen({ onUnhandledRequest: 'warn' }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())