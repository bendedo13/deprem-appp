/**
 * MSW API handler'ları — backend endpoint'lerini mock'lar.
 * Gerçek HTTP istekleri yerine bu handler'lar devreye girer.
 */
import { http, HttpResponse } from 'msw'

const BASE_URL = 'http://localhost:8000/api/v1'

// ── Mock Veri ────────────────────────────────────────────────────────────────

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
  access_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test.token',
  token_type: 'bearer',
  user: mockUser,
}

export const mockEarthquakes = {
  items: [
    {
      id: 'afad-2024001',
      source: 'afad',
      magnitude: 4.5,
      depth: 10.0,
      latitude: 38.4192,
      longitude: 27.1287,
      location: 'İzmir Körfezi',
      magnitude_type: 'ML',
      occurred_at: '2024-01-15T08:30:00Z',
    },
    {
      id: 'afad-2024002',
      source: 'afad',
      magnitude: 3.2,
      depth: 7.0,
      latitude: 40.9833,
      longitude: 29.0167,
      location: 'İstanbul Açıkları',
      magnitude_type: 'ML',
      occurred_at: '2024-01-15T06:15:00Z',
    },
    {
      id: 'afad-2024003',
      source: 'afad',
      magnitude: 5.1,
      depth: 15.0,
      latitude: 37.0,
      longitude: 35.3213,
      location: 'Adana',
      magnitude_type: 'ML',
      occurred_at: '2024-01-15T04:00:00Z',
    },
  ],
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

export const mockAnalytics = {
  period_days: 7,
  total_earthquakes: 142,
  avg_magnitude: 3.2,
  max_magnitude: 5.8,
  last_24h_count: 18,
  last_24h_max_mag: 4.1,
  daily_counts: [
    { date: '2024-01-09', count: 20 },
    { date: '2024-01-10', count: 15 },
    { date: '2024-01-11', count: 22 },
    { date: '2024-01-12', count: 18 },
    { date: '2024-01-13', count: 25 },
    { date: '2024-01-14', count: 24 },
    { date: '2024-01-15', count: 18 },
  ],
  magnitude_distribution: [
    { range: '< 3.0', count: 80 },
    { range: '3.0-3.9', count: 45 },
    { range: '4.0-4.9', count: 14 },
    { range: '5.0-5.9', count: 3 },
    { range: '≥ 6.0', count: 0 },
  ],
  hotspots: [
    { location: 'İzmir Körfezi', count: 35, max_magnitude: 5.8 },
    { location: 'Marmara Denizi', count: 28, max_magnitude: 4.2 },
    { location: 'Ege Denizi', count: 22, max_magnitude: 4.8 },
  ],
}

export const mockRiskScore = {
  score: 7.2,
  level: 'Yüksek',
  nearest_fault: 'Kuzey Anadolu Fay Hattı',
  fault_distance_km: 12.5,
  soil_class: 'Z3',
  building_year: 1995,
  factors: {
    fault_proximity: 8.5,
    soil_amplification: 7.0,
    building_age: 6.5,
    historical_seismicity: 7.8,
  },
  recommendations: [
    'Binanızı deprem uzmanına inceletin.',
    'Acil çıkış planı hazırlayın.',
    'Deprem çantası hazırlayın.',
  ],
}

export const mockAdminStats = {
  total_users: 1250,
  active_users: 1180,
  admin_users: 3,
  total_earthquakes: 8420,
  earthquakes_last_24h: 18,
  earthquakes_last_7d: 142,
  seismic_reports_total: 3200,
  users_with_fcm: 980,
  users_with_location: 750,
}

// ── Handler'lar ───────────────────────────────────────────────────────────────

export const handlers = [
  // Auth
  http.post(`${BASE_URL}/users/login`, () => {
    return HttpResponse.json(mockToken)
  }),

  http.post(`${BASE_URL}/users/register`, () => {
    return HttpResponse.json(mockToken, { status: 201 })
  }),

  // Kullanıcı
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

  // Acil Kişiler
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

  // Bildirim Tercihleri
  http.get(`${BASE_URL}/users/me/preferences`, () => {
    return HttpResponse.json(mockNotificationPrefs)
  }),

  http.put(`${BASE_URL}/users/me/preferences`, async ({ request }) => {
    const body = await request.json() as Record<string, unknown>
    return HttpResponse.json({ ...mockNotificationPrefs, ...body })
  }),

  // Depremler
  http.get(`${BASE_URL}/earthquakes`, () => {
    return HttpResponse.json(mockEarthquakes)
  }),

  http.get(`${BASE_URL}/earthquakes/:id`, ({ params }) => {
    const quake = mockEarthquakes.items.find(q => q.id === params.id)
    if (!quake) {
      return HttpResponse.json({ detail: 'Deprem bulunamadı' }, { status: 404 })
    }
    return HttpResponse.json(quake)
  }),

  // Analitik
  http.get(`${BASE_URL}/analytics`, () => {
    return HttpResponse.json(mockAnalytics)
  }),

  // Risk
  http.post(`${BASE_URL}/risk/score`, () => {
    return HttpResponse.json(mockRiskScore)
  }),

  // Admin
  http.get(`${BASE_URL}/admin/stats`, () => {
    return HttpResponse.json(mockAdminStats)
  }),

  http.get(`${BASE_URL}/admin/users`, () => {
    return HttpResponse.json([mockUser])
  }),

  // Health
  http.get('http://localhost:8000/health', () => {
    return HttpResponse.json({ status: 'ok', version: '1.0.0' })
  }),

  // Ben İyiyim
  http.post(`${BASE_URL}/users/i-am-safe`, () => {
    return HttpResponse.json({
      status: 'ok',
      message: 'Bildirim gönderildi.',
      notified_contacts: 2,
      total_contacts: 2,
      sms_sent: 2,
    })
  }),

  // FCM Token
  http.post(`${BASE_URL}/notifications/fcm-token`, () => {
    return HttpResponse.json({ ok: true, message: 'FCM token kaydedildi.' })
  }),
]