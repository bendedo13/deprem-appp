/**
 * LocalStorage yardımcı fonksiyonları testleri.
 */

import { describe, it, expect, beforeEach } from 'vitest'
import {
  saveToken,
  getToken,
  removeToken,
  hasToken,
  saveUser,
  getUser,
  clearAuth,
} from '../../utils/storage'

// Her testten önce localStorage'ı temizle
beforeEach(() => {
  localStorage.clear()
})

describe('saveToken / getToken', () => {
  it('token kaydeder ve okur', () => {
    saveToken('test.jwt.token')
    expect(getToken()).toBe('test.jwt.token')
  })

  it('token yoksa null döner', () => {
    expect(getToken()).toBeNull()
  })

  it('token üzerine yazar', () => {
    saveToken('old.token')
    saveToken('new.token')
    expect(getToken()).toBe('new.token')
  })
})

describe('removeToken', () => {
  it('token siler', () => {
    saveToken('test.token')
    removeToken()
    expect(getToken()).toBeNull()
  })

  it('token yokken hata fırlatmaz', () => {
    expect(() => removeToken()).not.toThrow()
  })
})

describe('hasToken', () => {
  it('token varsa true döner', () => {
    saveToken('test.token')
    expect(hasToken()).toBe(true)
  })

  it('token yoksa false döner', () => {
    expect(hasToken()).toBe(false)
  })
})

describe('saveUser / getUser', () => {
  const testUser = { id: 1, email: 'test@example.com', name: 'Test' }

  it('kullanıcı verisini kaydeder ve okur', () => {
    saveUser(testUser)
    expect(getUser()).toEqual(testUser)
  })

  it('kullanıcı yoksa null döner', () => {
    expect(getUser()).toBeNull()
  })

  it('bozuk JSON için null döner', () => {
    localStorage.setItem('user_data', 'bozuk{json')
    expect(getUser()).toBeNull()
  })

  it('farklı tip verilerle çalışır', () => {
    const data = { id: 1, roles: ['admin', 'user'], active: true }
    saveUser(data)
    expect(getUser()).toEqual(data)
  })
})

describe('clearAuth', () => {
  it('token ve kullanıcı verisini temizler', () => {
    saveToken('test.token')
    saveUser({ id: 1 })

    clearAuth()

    expect(getToken()).toBeNull()
    expect(getUser()).toBeNull()
  })

  it('boş localStorage ile hata fırlatmaz', () => {
    expect(() => clearAuth()).not.toThrow()
  })
})