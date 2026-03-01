/**
 * Deprem store testleri.
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { useEarthquakeStore } from '../earthquakeStore'
import { mockEarthquakes } from '../../test/mocks/handlers'

describe('useEarthquakeStore', () => {
  beforeEach(() => {
    useEarthquakeStore.getState().reset()
  })

  it('başlangıç durumu doğru', () => {
    const state = useEarthquakeStore.getState()
    expect(state.earthquakes).toHaveLength(0)
    expect(state.total).toBe(0)
    expect(state.isLoading).toBe(false)
    expect(state.error).toBeNull()
    expect(state.filters.min_magnitude).toBe(0)
    expect(state.filters.hours).toBe(24)
  })

  it('setEarthquakes — depremleri kaydeder', () => {
    useEarthquakeStore.getState().setEarthquakes(mockEarthquakes)

    const state = useEarthquakeStore.getState()
    expect(state.earthquakes).toHaveLength(3)
    expect(state.total).toBe(3)
    expect(state.earthquakes[0].id).toBe('afad-2024001')
  })

  it('setFilters — filtreleri günceller', () => {
    useEarthquakeStore.getState().setFilters({ min_magnitude: 3.0, hours: 48 })

    const state = useEarthquakeStore.getState()
    expect(state.filters.min_magnitude).toBe(3.0)
    expect(state.filters.hours).toBe(48)
    // Diğer filtreler korunmalı
    expect(state.filters.page).toBe(1)
  })

  it('setLoading — yükleme durumunu günceller', () => {
    useEarthquakeStore.getState().setLoading(true)
    expect(useEarthquakeStore.getState().isLoading).toBe(true)

    useEarthquakeStore.getState().setLoading(false)
    expect(useEarthquakeStore.getState().isLoading).toBe(false)
  })

  it('setError — hata mesajını kaydeder', () => {
    useEarthquakeStore.getState().setError('Bağlantı hatası')
    expect(useEarthquakeStore.getState().error).toBe('Bağlantı hatası')

    useEarthquakeStore.getState().setError(null)
    expect(useEarthquakeStore.getState().error).toBeNull()
  })

  it('reset — store\'u sıfırlar', () => {
    useEarthquakeStore.getState().setEarthquakes(mockEarthquakes)
    useEarthquakeStore.getState().setFilters({ min_magnitude: 4.0 })
    useEarthquakeStore.getState().setError('Hata')
    useEarthquakeStore.getState().reset()

    const state = useEarthquakeStore.getState()
    expect(state.earthquakes).toHaveLength(0)
    expect(state.filters.min_magnitude).toBe(0)
    expect(state.error).toBeNull()
  })
})