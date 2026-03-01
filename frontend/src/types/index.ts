/**
 * Uygulama genelinde kullanılan TypeScript tip tanımları.
 * Backend şemalarıyla birebir uyumlu.
 */

// ─── Deprem ───────────────────────────────────────────────────────────────────

export interface Earthquake {
  id: string
  source: string
  magnitude: number
  depth: number
  latitude: number
  longitude: number
  location: string
  magnitude_type: string
  occurred_at: string
}

export interface EarthquakeListResponse {
  items: Earthquake[]
  total: number
  page: number
  page_size: number
}

export interface EarthquakeFilters {
  min_magnitude?: number
  max_magnitude?: number
  hours?: number
  page?: number
  page_size?: number
}

// ─── Kullanıcı ────────────────────────────────────────────────────────────────

export interface User {
  id: number
  email: string
  name: string | null
  phone: string | null
  avatar: string | null
  plan: string
  join_date: string
  is_active: boolean
  is_admin: boolean
  fcm_token: string | null
  latitude: number | null
  longitude: number | null
  created_at: string
}

export interface TokenResponse {
  access_token: string
  token_type: string
  user: User
}

export interface LoginRequest {
  email: string
  password: string
}

export interface RegisterRequest {
  email: string
  password: string
}

export interface ProfileUpdateRequest {
  name?: string
  phone?: string
  avatar?: string
  email?: string
}

export interface PasswordChangeRequest {
  current_password: string
  new_password: string
}

// ─── Acil Kişi ────────────────────────────────────────────────────────────────

export interface EmergencyContact {
  id: number
  name: string
  phone: string
  email: string | null
  relation: string
  methods: string[]
  priority: number
}

export interface EmergencyContactRequest {
  name: string
  phone: string
  email?: string
  relation: string
  methods: string[]
  priority: number
}

// ─── Bildirim Tercihleri ──────────────────────────────────────────────────────

export interface NotificationPrefs {
  min_magnitude: number
  locations: string[]
  push_enabled: boolean
  sms_enabled: boolean
  email_enabled: boolean
  quiet_hours_enabled: boolean
  quiet_start: string | null
  quiet_end: string | null
  weekly_summary: boolean
  aftershock_alerts: boolean
}

// ─── Risk ─────────────────────────────────────────────────────────────────────

export interface RiskScoreRequest {
  latitude: number
  longitude: number
  building_year: number
  soil_class: string
}

export interface RiskScoreResponse {
  score: number
  level: string
  nearest_fault: string
  fault_distance_km: number
  soil_class: string
  building_year: number
  factors: Record<string, number>
  recommendations: string[]
}

// ─── Analitik ─────────────────────────────────────────────────────────────────

export interface DailyCount {
  date: string
  count: number
}

export interface MagnitudeDistribution {
  range: string
  count: number
}

export interface HotSpot {
  location: string
  count: number
  max_magnitude: number
}

export interface AnalyticsResponse {
  period_days: number
  total_earthquakes: number
  avg_magnitude: number | null
  max_magnitude: number | null
  last_24h_count: number
  last_24h_max_mag: number | null
  daily_counts: DailyCount[]
  magnitude_distribution: MagnitudeDistribution[]
  hotspots: HotSpot[]
}

// ─── Ben İyiyim ───────────────────────────────────────────────────────────────

export interface ImSafeRequest {
  include_location: boolean
  custom_message?: string
  contact_ids?: number[]
  latitude?: number
  longitude?: number
}

export interface ImSafeResponse {
  status: string
  message: string
  notified_contacts: number
  total_contacts: number
  sms_sent: number
}