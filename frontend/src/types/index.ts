/**
 * Uygulama genelinde kullanılan TypeScript tipleri.
 * Backend şemalarıyla birebir uyumlu.
 */

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

export interface EmergencyContact {
  id: number
  name: string
  phone: string
  email: string | null
  relation: string
  methods: string[]
  priority: number
}

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

export interface Analytics {
  period_days: number
  total_earthquakes: number
  avg_magnitude: number | null
  max_magnitude: number | null
  last_24h_count: number
  last_24h_max_mag: number | null
  daily_counts: { date: string; count: number }[]
  magnitude_distribution: { range: string; count: number }[]
  hotspots: { location: string; count: number; max_magnitude: number }[]
}

export interface RiskScore {
  score: number
  level: string
  nearest_fault: string
  fault_distance_km: number
  soil_class: string
  building_year: number
  factors: Record<string, number>
  recommendations: string[]
}

export interface AdminStats {
  total_users: number
  active_users: number
  admin_users: number
  total_earthquakes: number
  earthquakes_last_24h: number
  earthquakes_last_7d: number
  seismic_reports_total: number
  users_with_fcm: number
  users_with_location: number
}