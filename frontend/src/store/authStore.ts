/**
 * Zustand auth store — kullanıcı oturumu yönetimi.
 */
import { create } from 'zustand'
import type { User } from '../types'

interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  setAuth: (token: string, user: User) => void
  clearAuth: () => void
  updateUser: (user: Partial<User>) => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: (() => {
    try {
      const stored = localStorage.getItem('user')
      return stored ? JSON.parse(stored) : null
    } catch {
      return null
    }
  })(),
  token: localStorage.getItem('access_token'),
  isAuthenticated: !!localStorage.getItem('access_token'),

  setAuth: (token, user) => {
    localStorage.setItem('access_token', token)
    localStorage.setItem('user', JSON.stringify(user))
    set({ token, user, isAuthenticated: true })
  },

  clearAuth: () => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('user')
    set({ token: null, user: null, isAuthenticated: false })
  },

  updateUser: (partial) => {
    set((state) => {
      if (!state.user) return state
      const updated = { ...state.user, ...partial }
      localStorage.setItem('user', JSON.stringify(updated))
      return { user: updated }
    })
  },
}))