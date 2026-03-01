/**
 * Zustand deprem store — deprem listesi ve filtreler.
 */
import { create } from 'zustand'
import type { Earthquake, EarthquakeListResponse } from '../types'

interface EarthquakeFilters {
  min_magnitude: number
  hours: number
  page: number
  page_size: number
}

interface EarthquakeState {
  earthquakes: Earthquake[]
  total: number
  filters: EarthquakeFilters
  isLoading: boolean
  error: string | null
  setEarthquakes: (data: EarthquakeListResponse) => void
  setFilters: (filters: Partial<EarthquakeFilters>) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  reset: () => void
}

const defaultFilters: EarthquakeFilters = {
  min_magnitude: 0,
  hours: 24,
  page: 1,
  page_size: 50,
}

export const useEarthquakeStore = create<EarthquakeState>((set) => ({
  earthquakes: [],
  total: 0,
  filters: defaultFilters,
  isLoading: false,
  error: null,

  setEarthquakes: (data) =>
    set({
      earthquakes: data.items,
      total: data.total,
    }),

  setFilters: (filters) =>
    set((state) => ({
      filters: { ...state.filters, ...filters },
    })),

  setLoading: (isLoading) => set({ isLoading }),

  setError: (error) => set({ error }),

  reset: () =>
    set({
      earthquakes: [],
      total: 0,
      filters: defaultFilters,
      isLoading: false,
      error: null,
    }),
}))