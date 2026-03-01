/**
 * MSW API handler'ları.
 * Backend endpoint'lerini mock'lar — gerçek HTTP isteği gitmez.
 */

import { http, HttpResponse } from 'msw'

const BASE_URL = 'http://localhost:8000/api/v1'

// ─── Mock Veri ────────────────────────────────────────────────────────────────

export const mockUser = {
  id: 1,
  email: 'test@example.com',
  name: 'Test Kullanıcı',
  phone: '+905551234567',
  avatar: '🧑',
  plan: 'free',
  join_date: '2024-01-15T10:00:00Z',
  is_active: true,
  is_admin: false,
  fcm_token: null,
  latitude: 41.0082,
  longitude: 28.9784,
  created_at: '2024-01-15T10:00:00Z',
}

export const mockToken = {
  access_token: 'mock.jwt.token.for.testing',
  token_type: 'bearer',
  user: mockUser,
}

export const mockEarthquakes = [
  {
    id: 'afad-2024001',
    source: 'afad',
    magnitude: 4.5,
    depth: 10.0,
    latitude: 38.4192,
    longitude: 27.1287,
    location: 'İzmir Körfezi',
    magnitude_type: 'ML',
    occurred_at: '2024-02-20T14:30:00Z',
  },
  {
    id: 'afad-2024002',
    source: 'afad',
    magnitude: 3.2,
    depth: 7.0,
    latitude: 40.9833,
    longitude: 29.0167,
    location: 'Marmara Denizi',
    magnitude_type: 'ML',
    occurred_at: '2024-02-20T12:00:00Z',
  },
  {
    id: 'afad-2024003',
    source: 'afad',
    magnitude: 5.1,
    depth: 15.0,
    latitude: 37.0,
    longitude: 36.5,
    location: 'Kahramanmaraş',
    magnitude_type: 'ML',
    occurred_at: '2024-02-20T10:00:00Z',
  },
]

export const mockEarthquakeList = {
  items: mockEarthquakes,
  total: 3,
  page: 1,
  page_size: 50,
}

export const mockContacts = [
  {
    id: 1,
    name: 'Ahmet Yılmaz',
    phone: '+905551234567',
    email: 'ahmet@example.com',
    relation: 'Aile',
    methods: ['sms', 'whatsapp'],
    priority: 1,
  },
  {
    id: 2,
    name: 'Ayşe Kaya',
    phone: '+905559876543',
    email: null,
    relation: 'Arkadaş',
    methods: ['sms'],
    priority: 2,
  },
]

export const mockNotificationPrefs = {
  min_magnitude: 3.0,
  locations: ['İstanbul', 'İzmir'],
  push_enabled: true,
  sms_enabled: false,
  email_enabled: false,
  quiet_hours_enabled: false,
  quiet_start: null,
  quiet_end: null,
  weekly_summary: false,
  aftershock_alerts: false,
}

export const mockRiskScore = {
  score: 7.2,
  level: 'Yüksek',
  nearest_fault: 'Kuzey Anadolu Fay Hattı',
  fault_distance_km: 12.5,
  soil_class: 'Z3',
  building_year: 1990,
  factors: {
    fault_proximity: 8.0,
    soil_amplification: 7.5,
    building_age: 6.0,
  },
  recommendations: [
    'Binanızı deprem uzmanına inceletin.',
    'Acil çıkış planı hazırlayın.',
    'Deprem çantası hazırlayın.',
  ],
}

export const mockAnalytics = {
  period_days: 7,
  total_earthquakes: 42,
  avg_magnitude: 3.1,
  max_magnitude: 5.1,
  last_24h_count: 8,
  last_24h_max_mag: 4.2,
  daily_counts: [
    { date: '2024-02-14', count: 5 },
    { date: '2024-02-15', count: 7 },
    { date: '2024-02-16', count: 3 },
    { date: '2024-02-17', count: 9 },
    { date: '2024-02-18', count: 6 },
    { date: '2024-02-19', count: 4 },
    { date: '2024-02-20', count: 8 },
  ],
  magnitude_distribution: [
    { range: '< 3.0', count: 20 },
    { range: '3.0-3.9', count: 15 },
    { range: '4.0-4.9', count: 5 },
    { range: '5.0-5.9', count: 2 },
    { range: '≥ 6.0', count: 0 },
  ],
  hotspots: [
    { location: 'İzmir Körfezi', count: 12, max_magnitude: 4.5 },
    { location: 'Marmara Denizi', count: 8, max_magnitude: 3.8 },
    { location: 'Kahramanmaraş', count: 6, max_magnitude: 5.1 },
  ],
}

// ─── Handler'lar ──────────────────────────────────────────────────────────────

export const handlers = [
  // Auth
  http.post(`${BASE_URL}/users/login`, () => {
    return HttpResponse.json(mockToken)
  }),

  http.post(`${BASE_URL}/users/register`, () => {
    return HttpResponse.json(mockToken, { status: 201 })
  }),

  // Kullanıcı profili
  http.get(`${BASE_URL}/users/me`, () => {
    return HttpResponse.json(mockUser)
  }),

  http.put(`${BASE_URL}/users/me`, async ({ request }) => {
    const body = await request.json() as Record<string, unknown>
    return HttpResponse.json({ ...mockUser, ...body })
  }),

  http.patch(`${BASE_URL}/users/me`, async ({ request }) => {
    const body = await request.json() as Record<string, unknown>
    return HttpResponse.json({ ...mockUser, ...body })
  }),

  http.put(`${BASE_URL}/users/me/password`, () => {
    return HttpResponse.json({ message: 'Şifre başarıyla güncellendi.' })
  }),

  http.delete(`${BASE_URL}/users/me`, () => {
    return new HttpResponse(null, { status: 204 })
  }),

  // Depremler
  http.get(`${BASE_URL}/earthquakes`, () => {
    return HttpResponse.json(mockEarthquakeList)
  }),

  http.get(`${BASE_URL}/earthquakes/:id`, ({ params }) => {
    const quake = mockEarthquakes.find(q => q.id === params.id)
    if (!quake) {
      return HttpResponse.json({ detail: 'Deprem bulunamadı' }, { status: 404 })
    }
    return HttpResponse.json(quake)
  }),

  // Acil kişiler
  http.get(`${BASE_URL}/users/me/contacts`, () => {
    return HttpResponse.json(mockContacts)
  }),

  http.post(`${BASE_URL}/users/me/contacts`, async ({ request }) => {
    const body = await request.json() as Record<string, unknown>
    return HttpResponse.json({ id: 3, ...body }, { status: 201 })
  }),

  http.delete(`${BASE_URL}/users/me/contacts/:id`, () => {
    return new HttpResponse(null, { status: 204 })
  }),

  // Bildirim tercihleri
  http.get(`${BASE_URL}/users/me/preferences`, () => {
    return HttpResponse.json(mockNotificationPrefs)
  }),

  http.put(`${BASE_URL}/users/me/preferences`, async ({ request }) => {
    const body = await request.json() as Record<string, unknown>
    return HttpResponse.json({ ...mockNotificationPrefs, ...body })
  }),

  // Risk skoru
  http.post(`${BASE_URL}/risk/score`, () => {
    return HttpResponse.json(mockRiskScore)
  }),

  // Analitik
  http.get(`${BASE_URL}/analytics`, () => {
    return HttpResponse.json(mockAnalytics)
  }),

  // Health check
  http.get(`http://localhost:8000/health`, () => {
    return HttpResponse.json({ status: 'ok', version: '1.0.0' })
  }),

  // Ben İyiyim
  http.post(`${BASE_URL}/users/i-am-safe`, () => {
    return HttpResponse.json({
      status: 'ok',
      message: 'Bildirim gönderildi.',
      notified_contacts: 2,
      total_contacts: 2,
      sms_sent: 1,
    })
  }),

  // FCM Token
  http.post(`${BASE_URL}/notifications/fcm-token`, () => {
    return HttpResponse.json({ ok: true, message: 'FCM token kaydedildi.' })
  }),
]