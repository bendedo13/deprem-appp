import axios from 'axios';

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1',
    headers: {
        'Content-Type': 'application/json',
    },
});

export const earthquakeService = {
    getEarthquakes: async (limit = 50) => {
        const response = await api.get(`/earthquakes/?limit=${limit}`);
        return response.data;
    },
    getStats: async () => {
        const response = await api.get('/analytics/stats');
        return response.data;
    },
    calculateRisk: async (lat: number, lng: number) => {
        const response = await api.post('/risk/calculate', { lat, lng });
        return response.data;
    }
};

export default api;
