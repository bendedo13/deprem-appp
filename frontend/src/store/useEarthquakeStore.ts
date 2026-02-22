import { create } from 'zustand';

interface Earthquake {
    id: string;
    location: string;
    magnitude: number;
    latitude: number;
    longitude: number;
    depth: number;
    occurred_at: string;
    source: string;
}

interface DailyCount {
    date: string;
    count: number;
}

interface MagnitudeDistribution {
    range: string;
    count: number;
}

interface HotSpot {
    location: string;
    count: number;
    max_magnitude: number;
}

interface AnalyticsData {
    period_days: number;
    total_earthquakes: number;
    avg_magnitude: number | null;
    max_magnitude: number | null;
    last_24h_count: number;
    last_24h_max_mag: number | null;
    daily_counts: DailyCount[];
    magnitude_distribution: MagnitudeDistribution[];
    hotspots: HotSpot[];
}

interface EarthquakeState {
    earthquakes: Earthquake[];
    analyticsData: AnalyticsData | null;
    loading: boolean;
    setEarthquakes: (quakes: Earthquake[]) => void;
    addEarthquake: (quake: Earthquake) => void;
    setAnalyticsData: (data: AnalyticsData) => void;
    setLoading: (loading: boolean) => void;
}

export const useEarthquakeStore = create<EarthquakeState>((set) => ({
    earthquakes: [],
    analyticsData: null,
    loading: false,
    setEarthquakes: (earthquakes) => set({ earthquakes: Array.isArray(earthquakes) ? earthquakes : [] }),
    addEarthquake: (quake) => set((state) => ({
        earthquakes: [quake, ...(Array.isArray(state.earthquakes) ? state.earthquakes.slice(0, 99) : [])]
    })),
    setAnalyticsData: (analyticsData) => set({
        analyticsData: analyticsData ? {
            ...analyticsData,
            daily_counts: Array.isArray(analyticsData.daily_counts) ? analyticsData.daily_counts : [],
            magnitude_distribution: Array.isArray(analyticsData.magnitude_distribution) ? analyticsData.magnitude_distribution : [],
            hotspots: Array.isArray(analyticsData.hotspots) ? analyticsData.hotspots : []
        } : null
    }),
    setLoading: (loading) => set({ loading }),
}));
