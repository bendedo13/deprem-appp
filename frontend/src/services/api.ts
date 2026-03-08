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

export const userService = {
    updateMe: async (body: any) => {
        const { data } = await api.patch('/users/me', body);
        return data;
    },
    updateProfile: async (body: any) => {
        const { data } = await api.put('/users/me', body);
        return data;
    },
    changePassword: async (body: any) => {
        const { data } = await api.put('/users/me/password', body);
        return data;
    },
    deleteAccount: async () => {
        await api.delete('/users/me');
    },
    getContacts: async () => {
        const { data } = await api.get('/users/me/contacts');
        return data;
    },
    addContact: async (contact: any) => {
        const { data } = await api.post('/users/me/contacts', contact);
        return data;
    },
    deleteContact: async (id: number) => {
        await api.delete(`/users/me/contacts/${id}`);
    },
    getPreferences: async () => {
        const { data } = await api.get('/users/me/preferences');
        return data;
    },
    updatePreferences: async (prefs: any) => {
        const { data } = await api.put('/users/me/preferences', prefs);
        return data;
    },
    reportSafe: async (body?: { include_location: boolean, custom_message?: string, contact_ids?: number[] }) => {
        const { data } = await api.post('/users/me/safe', body || {});
        return data;
    }
};

export const earthquakeService = {
    getEarthquakes: async (limit = 50) => {
        const response = await api.get(`/earthquakes?limit=${limit}`);
        return response.data;
    },
    getStats: async (days = 7) => {
        const response = await api.get(`/analytics?days=${days}`);
        return response.data;
    },
    calculateRisk: async (riskData: { latitude: number, longitude: number, building_year?: number, soil_class?: string }) => {
        const response = await api.post('/risk/score', riskData);
        return response.data;
    },
    downloadRiskReport: async (riskData: { latitude: number, longitude: number, building_year?: number, soil_class?: string }) => {
        const response = await api.post('/risk/report', riskData, {
            responseType: 'blob'
        });
        return response.data;
    }
};

export const adminService = {
    getStats: async () => {
        const { data } = await api.get('/admin/stats');
        return data;
    },
    getUsers: async (skip = 0, limit = 50, search?: string) => {
        const { data } = await api.get('/admin/users', {
            params: { skip, limit, search }
        });
        return data;
    },
    updateUser: async (userId: number, body: {
        is_active?: boolean;
        is_admin?: boolean;
        subscription_plan?: string;
        subscription_expires_at?: string | null;
    }) => {
        const { data } = await api.patch(`/admin/users/${userId}`, body);
        return data;
    },
    deleteUser: async (userId: number) => {
        await api.delete(`/admin/users/${userId}`);
    },
    getEarthquakes: async (skip = 0, limit = 100, minMagnitude = 0) => {
        const { data } = await api.get('/admin/earthquakes', {
            params: { skip, limit, min_magnitude: minMagnitude }
        });
        return data;
    },
    createEarthquake: async (quake: any) => {
        const { data } = await api.post('/admin/earthquakes', quake);
        return data;
    },
    deleteEarthquake: async (quakeId: number) => {
        await api.delete(`/admin/earthquakes/${quakeId}`);
    },
    broadcast: async (broadcast: {
        title: string;
        body: string;
        only_active?: boolean;
        image_url?: string;
        target_user_id?: number;
    }) => {
        const { data } = await api.post('/admin/broadcast', broadcast);
        return data;
    },
    getNotifications: async (skip = 0, limit = 50) => {
        const { data } = await api.get('/admin/notifications', {
            params: { skip, limit }
        });
        return data;
    },
    changePassword: async (body: { current_password: string; new_password: string }) => {
        const { data } = await api.put('/admin/change-password', body);
        return data;
    }
};

export const subscriptionService = {
    getStatus: async () => {
        const { data } = await api.get('/subscription/status');
        return data;
    },
    activateTrial: async () => {
        const { data } = await api.post('/subscription/activate-trial');
        return data;
    },
    subscribe: async (plan: string) => {
        const { data } = await api.post('/subscription/subscribe', { plan });
        return data;
    },
    cancel: async () => {
        const { data } = await api.post('/subscription/cancel');
        return data;
    },
    checkFeature: async (feature: string) => {
        const { data } = await api.get(`/subscription/check-feature/${feature}`);
        return data;
    }
};

export default api;
