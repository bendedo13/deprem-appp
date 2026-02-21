import axios from 'axios';

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1',
    headers: {
        'Content-Type': 'application/json',
    },
});

// Auth interceptor
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

export const authService = {
    login: async (credentials: any) => {
        const { data } = await api.post('/users/login', credentials);
        return data;
    },
    register: async (userData: any) => {
        const { data } = await api.post('/users/register', userData);
        return data;
    },
    getMe: async () => {
        const { data } = await api.get('/users/me');
        return data;
    }
};

export const earthquakeService = {
    getEarthquakes: async (limit = 50) => {
        const response = await api.get(`/earthquakes/?limit=${limit}`);
        return response.data;
    },
    getStats: async (days = 7) => {
        const response = await api.get(`/analytics?days=${days}`);
        return response.data;
    },
    calculateRisk: async (lat: number, lng: number) => {
        const response = await api.post('/risk/calculate', { lat, lng });
        return response.data;
    },
    getNotificationPrefs: async () => {
        const response = await api.get('/notifications/preferences');
        return response.data;
    },
    updateNotificationPrefs: async (prefs: { min_magnitude: number, radius_km: number, is_enabled: boolean }) => {
        const { data } = await api.put('/api/v1/notifications/preferences', prefs);
        return data;
    }
};

export const adminService = {
    getStats: async () => {
        const { data } = await api.get('/api/v1/admin/stats');
        return data;
    },
    getUsers: async (skip = 0, limit = 50, search?: string) => {
        const { data } = await api.get('/api/v1/admin/users', {
            params: { skip, limit, search }
        });
        return data;
    },
    updateUser: async (userId: number, body: { is_active?: boolean, is_admin?: boolean }) => {
        const { data } = await api.patch(`/api/v1/admin/users/${userId}`, body);
        return data;
    },
    deleteUser: async (userId: number) => {
        await api.delete(`/api/v1/admin/users/${userId}`);
    },
    getEarthquakes: async (skip = 0, limit = 100, minMagnitude = 0) => {
        const { data } = await api.get('/api/v1/admin/earthquakes', {
            params: { skip, limit, min_magnitude: minMagnitude }
        });
        return data;
    },
    createEarthquake: async (quake: any) => {
        const { data } = await api.post('/api/v1/admin/earthquakes', quake);
        return data;
    },
    deleteEarthquake: async (quakeId: number) => {
        await api.delete(`/api/v1/admin/earthquakes/${quakeId}`);
    },
    broadcast: async (broadcast: { title: string, body: string, only_active: boolean }) => {
        const { data } = await api.post('/api/v1/admin/broadcast', broadcast);
        return data;
    }
};

export default api;
