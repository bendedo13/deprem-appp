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
        const response = await api.put('/notifications/preferences', prefs);
        return response.data;
    }
};

export default api;
