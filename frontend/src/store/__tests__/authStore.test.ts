/**
 * Auth store testleri.
 * Zustand store'un doğru çalıştığını doğrular.
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { useAuthStore } from '../authStore'
import { mockUser, mockToken } from '../../test/mocks/handlers'

describe('useAuthStore', () => {
  beforeEach(() => {
    // Her testten önce store'u ve localStorage'ı temizle
    localStorage.clear()
    useAuthStore.getState().clearAuth()
  })

  it('başlangıçta kimlik doğrulanmamış', () => {
    const state = useAuthStore.getState()
    expect(state.isAuthenticated).toBe(false)
    expect(state.user).toBeNull()
    expect(state.token).toBeNull()
  })

  it('setAuth — token ve kullanıcıyı kaydeder', () => {
    useAuthStore.getState().setAuth(mockToken.access_token, mockUser)

    const state = useAuthStore.getState()
    expect(state.isAuthenticated).toBe(true)
    expect(state.token).toBe(mockToken.access_token)
    expect(state.user?.email).toBe(mockUser.email)
  })

  it('setAuth — localStorage\'a yazar', () => {
    useAuthStore.getState().setAuth(mockToken.access_token, mockUser)

    expect(localStorage.getItem('access_token')).toBe(mockToken.access_token)
    const storedUser = JSON.parse(localStorage.getItem('user') || '{}')
    expect(storedUser.email).toBe(mockUser.email)
  })

  it('clearAuth — oturumu temizler', () => {
    useAuthStore.getState().setAuth(mockToken.access_token, mockUser)
    useAuthStore.getState().clearAuth()

    const state = useAuthStore.getState()
    expect(state.isAuthenticated).toBe(false)
    expect(state.user).toBeNull()
    expect(state.token).toBeNull()
    expect(localStorage.getItem('access_token')).toBeNull()
    expect(localStorage.getItem('user')).toBeNull()
  })

  it('updateUser — kullanıcı bilgilerini günceller', () => {
    useAuthStore.getState().setAuth(mockToken.access_token, mockUser)
    useAuthStore.getState().updateUser({ name: 'Yeni İsim' })

    const state = useAuthStore.getState()
    expect(state.user?.name).toBe('Yeni İsim')
    // Diğer alanlar korunmalı
    expect(state.user?.email).toBe(mockUser.email)
  })

  it('updateUser — kullanıcı yoksa hiçbir şey yapmaz', () => {
    useAuthStore.getState().updateUser({ name: 'Test' })
    expect(useAuthStore.getState().user).toBeNull()
  })
})