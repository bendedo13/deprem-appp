/**
 * API istemcisi testleri.
 * MSW ile HTTP istekleri mock'lanır.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { authApi, userApi, earthquakeApi, analyticsApi, riskApi, adminApi } from '../api'
import { server } from '../../test/mocks/server'
import {
  unauthorizedHandler,
  emailConflictHandler,
  wrongPasswordHandler,
  serverErrorHandler,
} from '../../test/mocks/handlers.error'
import {
  mockToken,
  mockUser,
  mockEarthquakes,
  mockAnalytics,
  mockRiskScore,
  mockAdminStats,
  mockContacts,
  mockNotificationPrefs,
} from '../../test/mocks/handlers'

describe('authApi', () => {
  describe('login', () => {
    it('başarılı girişte token döner', async () => {
      const response = await authApi.login('test@example.com', 'password123')
      expect(response.status).toBe(200)
      expect(response.data.access_token).toBe(mockToken.access_token)
      expect(response.data.user.email).toBe(mockToken.user.email)
    })

    it('yanlış şifrede 401 fırlatır', async () => {
      server.use(wrongPasswordHandler)
      await expect(
        authApi.login('test@example.com', 'wrongpassword')
      ).rejects.toMatchObject({ response: { status: 401 } })
    })
  })

  describe('register', () => {
    it('başarılı kayıtta 201 ve token döner', async () => {
      const response = await authApi.register('new@example.com', 'password123')
      expect(response.status).toBe(201)
      expect(response.data.access_token).toBeDefined()
    })

    it('mevcut e-postada 409 fırlatır', async () => {
      server.use(emailConflictHandler)
      await expect(
        authApi.register('test@example.com', 'password123')
      ).rejects.toMatchObject({ response: { status: 409 } })
    })
  })
})

describe('userApi', () => {
  beforeEach(() => {
    // Test için token ayarla
    localStorage.setItem('access_token', 'test-token')
  })

  afterEach(() => {
    localStorage.clear()
  })

  it('getMe — kullanıcı profilini döner', async () => {
    const response = await userApi.getMe()
    expect(response.status).toBe(200)
    expect(response.data.id).toBe(mockUser.id)
    expect(response.data.email).toBe(mockUser.email)
  })

  it('getMe — 401 durumunda token temizlenir', async () => {
    server.use(unauthorizedHandler)
    await expect(userApi.getMe()).rejects.toMatchObject({
      response: { status: 401 },
    })
    // Interceptor token'ı temizlemeli
    expect(localStorage.getItem('access_token')).toBeNull()
  })

  it('updateProfile — profil günceller', async () => {
    const response = await userApi.updateProfile({ name: 'Yeni İsim' })
    expect(response.status).toBe(200)
  })

  it('changePassword — şifre değiştirir', async () => {
    const response = await userApi.changePassword('oldpass', 'newpass123')
    expect(response.status).toBe(200)
    expect(response.data).toHaveProperty('message')
  })

  it('getContacts — acil kişileri döner', async () => {
    const response = await userApi.getContacts()
    expect(response.status).toBe(200)
    expect(response.data).toHaveLength(mockContacts.length)
    expect(response.data[0].name).toBe(mockContacts[0].name)
  })

  it('addContact — yeni kişi ekler', async () => {
    const newContact = {
      name: 'Yeni Kişi',
      phone: '+905551112233',
      email: null,
      relation: 'Arkadaş',
      methods: ['sms'] as string[],
      priority: 3,
    }
    const response = await userApi.addContact(newContact)
    expect(response.status).toBe(201)
    expect(response.data.name).toBe(newContact.name)
  })

  it('deleteContact — kişi siler', async () => {
    const response = await userApi.deleteContact(1)
    expect(response.status).toBe(204)
  })

  it('getPreferences — bildirim tercihlerini döner', async () => {
    const response = await userApi.getPreferences()
    expect(response.status).toBe(200)
    expect(response.data.min_magnitude).toBe(mockNotificationPrefs.min_magnitude)
  })

  it('updatePreferences — tercihleri günceller', async () => {
    const updated = { ...mockNotificationPrefs, min_magnitude: 4.0 }
    const response = await userApi.updatePreferences(updated)
    expect(response.status).toBe(200)
  })

  it('iAmSafe — ben iyiyim mesajı gönderir', async () => {
    const response = await userApi.iAmSafe({
      include_location: true,
      custom_message: 'Ben iyiyim!',
    })
    expect(response.status).toBe(200)
    expect(response.data.status).toBe('ok')
  })
})

describe('earthquakeApi', () => {
  it('list — deprem listesini döner', async () => {
    const response = await earthquakeApi.list()
    expect(response.status).toBe(200)
    expect(response.data.items).toHaveLength(mockEarthquakes.items.length)
    expect(response.data.total).toBe(mockEarthquakes.total)
  })

  it('list — filtre parametreleriyle çalışır', async () => {
    const response = await earthquakeApi.list({
      min_magnitude: 3.0,
      hours: 48,
      page: 1,
      page_size: 20,
    })
    expect(response.status).toBe(200)
    expect(response.data).toHaveProperty('items')
  })

  it('getById — mevcut depremi döner', async () => {
    const response = await earthquakeApi.getById('afad-2024001')
    expect(response.status).toBe(200)
    expect(response.data.id).toBe('afad-2024001')
    expect(response.data.magnitude).toBe(4.5)
  })

  it('getById — bulunamayan depremde 404 fırlatır', async () => {
    await expect(
      earthquakeApi.getById('nonexistent-id')
    ).rejects.toMatchObject({ response: { status: 404 } })
  })

  it('list — sunucu hatasında 500 fırlatır', async () => {
    server.use(serverErrorHandler)
    await expect(earthquakeApi.list()).rejects.toMatchObject({
      response: { status: 500 },
    })
  })
})

describe('analyticsApi', () => {
  it('get — analitik verisini döner', async () => {
    const response = await analyticsApi.get(7)
    expect(response.status).toBe(200)
    expect(response.data.period_days).toBe(7)
    expect(response.data.total_earthquakes).toBe(142)
    expect(response.data.daily_counts).toHaveLength(7)
    expect(response.data.hotspots).toHaveLength(3)
  })

  it('get — gün parametresi olmadan çalışır', async () => {
    const response = await analyticsApi.get()
    expect(response.status).toBe(200)
  })
})

describe('riskApi', () => {
  it('score — risk skoru hesaplar', async () => {
    const response = await riskApi.score({
      latitude: 41.0082,
      longitude: 28.9784,
      building_year: 1995,
      soil_class: 'Z3',
    })
    expect(response.status).toBe(200)
    expect(response.data.score).toBe(7.2)
    expect(response.data.level).toBe('Yüksek')
    expect(response.data.recommendations).toHaveLength(3)
  })
})

describe('adminApi', () => {
  it('getStats — admin istatistiklerini döner', async () => {
    const response = await adminApi.getStats()
    expect(response.status).toBe(200)
    expect(response.data.total_users).toBe(mockAdminStats.total_users)
    expect(response.data.total_earthquakes).toBe(mockAdminStats.total_earthquakes)
  })

  it('getUsers — kullanıcı listesini döner', async () => {
    const response = await adminApi.getUsers()
    expect(response.status).toBe(200)
    expect(Array.isArray(response.data)).toBe(true)
  })
})