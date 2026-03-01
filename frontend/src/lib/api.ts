/**
 * Axios tabanlı API istemcisi.
 * JWT token otomatik eklenir, 401'de oturum temizlenir.
 */
import axios, { AxiosInstance, AxiosError } from 'axios'
import type {
  TokenResponse,
  User,
  Earthquake,
  EarthquakeListResponse,
  EmergencyContact,
  NotificationPrefs,
  Analytics,
  RiskScore,
  AdminStats,
} from '../types'

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1'

// Axios instance oluştur
export const apiClient: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 10000,
})

// İstek interceptor — JWT token ekle
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Yanıt interceptor — 401'de oturumu temizle
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('access_token')
      localStorage.removeItem('user')
    }
    return Promise.reject(error)
  }
)

// ── Auth API ──────────────────────────────────────────────────────────────────

export const authApi = {
  login: (email: string, password: string) =>
    apiClient.post<TokenResponse>('/users/login', { email, password }),

  register: (email: string, password: string) =>
    apiClient.post<TokenResponse>('/users/register', { email, password }),
}

// ── Kullanıcı API ─────────────────────────────────────────────────────────────

export const userApi = {
  getMe: () => apiClient.get<User>('/users/me'),

  updateProfile: (data: Partial<User>) =>
    apiClient.put<User>('/users/me', data),

  updateTechnical: (data: { fcm_token?: string; latitude?: number; longitude?: number }) =>
    apiClient.patch<User>('/users/me', data),

  changePassword: (currentPassword: string, newPassword: string) =>
    apiClient.put('/users/me/password', {
      current_password: currentPassword,
      new_password: newPassword,
    }),

  deleteAccount: () => apiClient.delete('/users/me'),

  getContacts: () => apiClient.get<EmergencyContact[]>('/users/me/contacts'),

  addContact: (contact: Omit<EmergencyContact, 'id'>) =>
    apiClient.post<EmergencyContact>('/users/me/contacts', contact),

  deleteContact: (id: number) => apiClient.delete(`/users/me/contacts/${id}`),

  getPreferences: () => apiClient.get<NotificationPrefs>('/users/me/preferences'),

  updatePreferences: (prefs: NotificationPrefs) =>
    apiClient.put<NotificationPrefs>('/users/me/preferences', prefs),

  iAmSafe: (data: {
    include_location: boolean
    custom_message?: string
    contact_ids?: number[]
    latitude?: number
    longitude?: number
  }) => apiClient.post('/users/i-am-safe', data),
}

// ── Deprem API ────────────────────────────────────────────────────────────────

export const earthquakeApi = {
  list: (params?: {
    min_magnitude?: number
    max_magnitude?: number
    hours?: number
    page?: number
    page_size?: number
  }) => apiClient.get<EarthquakeListResponse>('/earthquakes', { params }),

  getById: (id: string) => apiClient.get<Earthquake>(`/earthquakes/${id}`),
}

// ── Analitik API ──────────────────────────────────────────────────────────────

export const analyticsApi = {
  get: (days?: number) =>
    apiClient.get<Analytics>('/analytics', { params: { days } }),
}

// ── Risk API ──────────────────────────────────────────────────────────────────

export const riskApi = {
  score: (data: {
    latitude: number
    longitude: number
    building_year?: number
    soil_class?: string
  }) => apiClient.post<RiskScore>('/risk/score', data),
}

// ── Admin API ─────────────────────────────────────────────────────────────────

export const adminApi = {
  getStats: () => apiClient.get<AdminStats>('/admin/stats'),
  getUsers: (params?: { skip?: number; limit?: number; search?: string }) =>
    apiClient.get<User[]>('/admin/users', { params }),
}