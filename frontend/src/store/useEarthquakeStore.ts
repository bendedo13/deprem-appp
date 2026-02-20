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

interface EarthquakeState {
    earthquakes: Earthquake[];
    stats: any | null;
    loading: boolean;
    setEarthquakes: (quakes: Earthquake[]) => void;
    addEarthquake: (quake: Earthquake) => void;
    setStats: (stats: any) => void;
    setLoading: (loading: boolean) => void;
}

export const useEarthquakeStore = create<EarthquakeState>((set) => ({
    earthquakes: [],
    stats: null,
    loading: false,
    setEarthquakes: (earthquakes) => set({ earthquakes }),
    addEarthquake: (quake) => set((state) => ({
        earthquakes: [quake, ...state.earthquakes.slice(0, 99)]
    })),
    setStats: (stats) => set({ stats }),
    setLoading: (loading) => set({ loading }),
}));
