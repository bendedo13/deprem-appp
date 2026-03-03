/**
 * API istemci servisi.
 * Axios tabanlı, JWT token yönetimi ve hata işleme dahil.
 */

import axios, { AxiosInstance, AxiosError } from 'axios'
import type {
  TokenResponse,
  LoginRequest,
  RegisterRequest,
  User,
  ProfileUpdateRequest,
  PasswordChangeRequest,
  Earthquake,
  EarthquakeListResponse,
  EarthquakeFilters,
  EmergencyContact,
  EmergencyContactRequest,
  NotificationPrefs,
  RiskScoreRequest,
  RiskScoreResponse,
  AnalyticsResponse,
  ImSafeRequest,
  ImSafeResponse,
  AdminStats,
  AdminUser,
  AdminEarthquake,
  AdminSOSRecord,
} from '../types'

// API temel URL'i
const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1'

// Token storage key (tek yerde yönet)
const TOKEN_KEY = 'token'

// Axios instance oluştur
const apiClient: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
})

// İstek interceptor — JWT token ekle
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY)
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Yanıt interceptor — 401 durumunda oturumu kapat
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      localStorage.removeItem(TOKEN_KEY)
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

// ─── Auth Servisi ─────────────────────────────────────────────────────────────

export const authService = {
  async login(data: LoginRequest): Promise<TokenResponse> {
    const response = await apiClient.post<TokenResponse>('/users/login', data)
    return response.data
  },

  async register(data: RegisterRequest): Promise<TokenResponse> {
    const response = await apiClient.post<TokenResponse>('/users/register', data)
    return response.data
  },

  async getMe(): Promise<User> {
    const response = await apiClient.get<User>('/users/me')
    return response.data
  },

  logout(): void {
    localStorage.removeItem(TOKEN_KEY)
  },
}

// ─── Kullanıcı Servisi ────────────────────────────────────────────────────────

export const userService = {
  async getProfile(): Promise<User> {
    const response = await apiClient.get<User>('/users/me')
    return response.data
  },

  async updateProfile(data: ProfileUpdateRequest): Promise<User> {
    const response = await apiClient.put<User>('/users/me', data)
    return response.data
  },

  async changePassword(data: PasswordChangeRequest): Promise<{ message: string }> {
    const response = await apiClient.put<{ message: string }>('/users/me/password', data)
    return response.data
  },

  async deleteAccount(): Promise<void> {
    await apiClient.delete('/users/me')
  },

  async sendImSafe(data: ImSafeRequest): Promise<ImSafeResponse> {
    const response = await apiClient.post<ImSafeResponse>('/users/i-am-safe', data)
    return response.data
  },

  async getContacts(): Promise<EmergencyContact[]> {
    const response = await apiClient.get<EmergencyContact[]>('/users/me/contacts')
    return response.data
  },

  async addContact(data: EmergencyContactRequest): Promise<EmergencyContact> {
    const response = await apiClient.post<EmergencyContact>('/users/me/contacts', data)
    return response.data
  },

  async deleteContact(id: number): Promise<void> {
    await apiClient.delete(`/users/me/contacts/${id}`)
  },

  async getPreferences(): Promise<NotificationPrefs> {
    const response = await apiClient.get<NotificationPrefs>('/users/me/preferences')
    return response.data
  },

  async updatePreferences(data: NotificationPrefs): Promise<NotificationPrefs> {
    const response = await apiClient.put<NotificationPrefs>('/users/me/preferences', data)
    return response.data
  },

  async reportSafe(data: ImSafeRequest): Promise<ImSafeResponse> {
    const response = await apiClient.post<ImSafeResponse>('/users/i-am-safe', data)
    return response.data
  },
}

// ─── Deprem Servisi ───────────────────────────────────────────────────────────

export const earthquakeService = {
  async getList(filters?: EarthquakeFilters): Promise<EarthquakeListResponse> {
    const response = await apiClient.get<EarthquakeListResponse>('/earthquakes', {
      params: filters,
    })
    return response.data
  },

  async getById(id: string): Promise<Earthquake> {
    const response = await apiClient.get<Earthquake>(`/earthquakes/${id}`)
    return response.data
  },
}

// ─── Acil Kişi Servisi ────────────────────────────────────────────────────────

export const contactService = {
  async getContacts(): Promise<EmergencyContact[]> {
    const response = await apiClient.get<EmergencyContact[]>('/users/me/contacts')
    return response.data
  },

  async addContact(data: EmergencyContactRequest): Promise<EmergencyContact> {
    const response = await apiClient.post<EmergencyContact>('/users/me/contacts', data)
    return response.data
  },

  async deleteContact(id: number): Promise<void> {
    await apiClient.delete(`/users/me/contacts/${id}`)
  },
}

// ─── Bildirim Servisi ─────────────────────────────────────────────────────────

export const notificationService = {
  async getPreferences(): Promise<NotificationPrefs> {
    const response = await apiClient.get<NotificationPrefs>('/users/me/preferences')
    return response.data
  },

  async updatePreferences(data: NotificationPrefs): Promise<NotificationPrefs> {
    const response = await apiClient.put<NotificationPrefs>('/users/me/preferences', data)
    return response.data
  },

  async registerFcmToken(token: string): Promise<{ ok: boolean; message: string }> {
    const response = await apiClient.post('/notifications/fcm-token', { fcm_token: token })
    return response.data
  },
}

// ─── Risk Servisi ─────────────────────────────────────────────────────────────

export const riskService = {
  async calculateScore(data: RiskScoreRequest): Promise<RiskScoreResponse> {
    const response = await apiClient.post<RiskScoreResponse>('/risk/score', data)
    return response.data
  },
}

// ─── Analitik Servisi ─────────────────────────────────────────────────────────

export const analyticsService = {
  async getAnalytics(days?: number): Promise<AnalyticsResponse> {
    const response = await apiClient.get<AnalyticsResponse>('/analytics', {
      params: { days },
    })
    return response.data
  },
}

// ─── Admin Servisi ────────────────────────────────────────────────────────────

export const adminService = {
  async getStats(): Promise<AdminStats> {
    const response = await apiClient.get<AdminStats>('/admin/stats')
    return response.data
  },

  async getUsers(skip = 0, limit = 50, search?: string): Promise<AdminUser[]> {
    const response = await apiClient.get<AdminUser[]>('/admin/users', {
      params: { skip, limit, search: search || undefined },
    })
    return response.data
  },

  async updateUser(userId: number, data: { is_active?: boolean; is_admin?: boolean; plan?: string }): Promise<AdminUser> {
    const response = await apiClient.patch<AdminUser>(`/admin/users/${userId}`, data)
    return response.data
  },

  async deleteUser(userId: number): Promise<void> {
    await apiClient.delete(`/admin/users/${userId}`)
  },

  async getEarthquakes(skip = 0, limit = 100, minMagnitude = 0): Promise<AdminEarthquake[]> {
    const response = await apiClient.get<AdminEarthquake[]>('/admin/earthquakes', {
      params: { skip, limit, min_magnitude: minMagnitude },
    })
    return response.data
  },

  async createEarthquake(data: {
    magnitude: number
    depth: number
    latitude: number
    longitude: number
    location: string
    occurred_at?: string
    source?: string
  }): Promise<AdminEarthquake> {
    const response = await apiClient.post<AdminEarthquake>('/admin/earthquakes', data)
    return response.data
  },

  async deleteEarthquake(quakeId: string): Promise<void> {
    await apiClient.delete(`/admin/earthquakes/${quakeId}`)
  },

  async getSosRecords(skip = 0, limit = 50, aciliyet?: string): Promise<AdminSOSRecord[]> {
    const response = await apiClient.get<AdminSOSRecord[]>('/admin/sos-records', {
      params: { skip, limit, aciliyet: aciliyet || undefined },
    })
    return response.data
  },

  async deleteSosRecord(sosId: string): Promise<void> {
    await apiClient.delete(`/admin/sos-records/${sosId}`)
  },

  async broadcast(data: { title: string; body: string; only_active: boolean }): Promise<{ sent: number; total_targets: number }> {
    const response = await apiClient.post<{ sent: number; total_targets: number }>('/admin/broadcast', data)
    return response.data
  },

  async getSystemHealth(): Promise<{ database: string; redis: string; timestamp: string }> {
    const response = await apiClient.get('/admin/system/health')
    return response.data
  },
}

export default apiClient
