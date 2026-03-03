import { create } from 'zustand';
import { authService } from '../services/api';
import type { User } from '../types';

interface AuthState {
    user: User | null;
    token: string | null;
    loading: boolean;
    setUser: (user: User | null) => void;
    setToken: (token: string | null) => void;
    login: (credentials: { email: string; password: string }) => Promise<void>;
    logout: () => void;
    checkAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
    user: null,
    token: localStorage.getItem('token'),
    loading: true,

    setUser: (user) => set({ user }),
    setToken: (token) => {
        if (token) {
            localStorage.setItem('token', token);
        } else {
            localStorage.removeItem('token');
        }
        set({ token });
    },

    login: async (credentials) => {
        set({ loading: true });
        try {
            const data = await authService.login(credentials);
            localStorage.setItem('token', data.access_token);
            set({ user: data.user, token: data.access_token, loading: false });
        } catch (error) {
            set({ loading: false });
            throw error;
        }
    },

    logout: () => {
        localStorage.removeItem('token');
        set({ user: null, token: null });
    },

    checkAuth: async () => {
        const token = localStorage.getItem('token');
        if (!token) {
            set({ loading: false });
            return;
        }
        try {
            const user = await authService.getMe();
            set({ user, loading: false });
        } catch {
            localStorage.removeItem('token');
            set({ user: null, token: null, loading: false });
        }
    }
}));
