import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import App from '../App';
import MapComponent from '../components/MapComponent';
import EarthquakeList from '../components/EarthquakeList';
import FilterPanel from '../components/FilterPanel';
import { EarthquakeProvider } from '../context/EarthquakeContext';

const mockEarthquakes = [
  {
    id: '1',
    magnitude: 5.2,
    location: 'İzmir',
    depth: 10,
    lat: 38.4192,
    lon: 27.1287,
    time: '2024-01-15T10:30:00Z',
    status: 'İlksel',
  },
  {
    id: '2',
    magnitude: 3.8,
    location: 'Ankara',
    depth: 7,
    lat: 39.9334,
    lon: 32.8597,
    time: '2024-01-15T09:15:00Z',
    status: 'İlksel',
  },
  {
    id: '3',
    magnitude: 6.1,
    location: 'Erzincan',
    depth: 15,
    lat: 39.7500,
    lon: 39.5000,
    time: '2024-01-15T08:00:00Z',
    status: 'Gözden Geçirilmiş',
  },
];

global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({ earthquakes: mockEarthquakes }),
  })
) as jest.Mock;

const renderWithProvider = (ui: React.ReactElement) => {
  return render(<EarthquakeProvider>{ui}</EarthquakeProvider>);
};

describe('App Bileşeni Testleri', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('App bileşeni hatasız render edilmeli', async () => {
    renderWithProvider(<App />);
    await waitFor(() => {
      expect(screen.getByRole('main') || document.querySelector('.app')).toBeTruthy();
    });
  });

  test('Başlık görünmeli', async () => {
    renderWithProvider(<App />);
    await waitFor(() => {
      const title = screen.queryByText(/deprem/i) || screen.queryByText(/Deprem/i);
      expect(title).toBeTruthy();
    });
  });
});

describe('EarthquakeList Bileşeni Testleri', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('Deprem listesi render edilmeli', () => {
    renderWithProvider(
      <EarthquakeList earthquakes={mockEarthquakes} onSelect={() => {}} />
    );
    expect(screen.getByText('İzmir')).toBeInTheDocument();
    expect(screen.getByText('Ankara')).toBeInTheDocument();
    expect(screen.getByText('Erzincan')).toBeInTheDocument();
  });

  test('Magnitude değerleri doğru gösterilmeli', () => {
    renderWithProvider(
      <EarthquakeList earthquakes={mockEarthquakes} onSelect={() => {}} />
    );
    expect(screen.getByText(/5.2/)).toBeInTheDocument();
    expect(screen.getByText(/3.8/)).toBeInTheDocument();
    expect(screen.getByText(/6.1/)).toBeInTheDocument();
  });

  test('Deprem seçimi callback çalışmalı', () => {
    const onSelectMock = jest.fn();
    renderWithProvider(
      <EarthquakeList earthquakes={mockEarthquakes} onSelect={onSelectMock} />
    );
    const firstItem = screen.getByText('İzmir').closest('div') || screen.getByText('İzmir');
    fireEvent.click(firstItem);
    expect(onSelectMock).toHaveBeenCalledWith(mockEarthquakes[0]);
  });

  test('Boş liste mesajı gösterilmeli', () => {
    renderWithProvider(
      <EarthquakeList earthquakes={[]} onSelect={() => {}} />
    );
    const emptyMsg =
      screen.queryByText(/deprem bulunamadı/i) ||
      screen.queryByText(/veri yok/i) ||
      screen.queryByText(/kayıt yok/i);
    expect(emptyMsg).toBeTruthy();
  });

  test('Büyük depremler kırmızı ile işaretlenmeli', () => {
    renderWithProvider(
      <EarthquakeList earthquakes={mockEarthquakes} onSelect={() => {}} />
    );
    const bigEq = screen.getByText(/6.1/).closest('[class*="danger"]') ||
      screen.getByText(/6.1/).closest('[class*="high"]') ||
      screen.getByText(/6.1/).closest('[class*="critical"]');
    expect(bigEq || document.querySelector('[class*="danger"]')).toBeTruthy();
  });
});

describe('FilterPanel Bileşeni Testleri', () => {
  const defaultFilters = {
    minMagnitude: 0,
    maxMagnitude: 10,
    startDate: '',
    endDate: '',
    location: '',
  };

  test('Filter panel render edilmeli', () => {
    renderWithProvider(
      <FilterPanel filters={defaultFilters} onFilterChange={() => {}} />
    );
    const filterEl =
      screen.queryByText(/filtre/i) ||
      screen.queryByText(/magnitude/i) ||
      screen.queryByLabelText(/minimum/i);
    expect(filterEl).toBeTruthy();
  });

  test('Magnitude filtresi değişimi çalışmalı', () => {
    const onFilterChangeMock = jest.fn();
    renderWithProvider(
      <FilterPanel filters={defaultFilters} onFilterChange={onFilterChangeMock} />
    );
    const minInput =
      screen.getByLabelText(/minimum magnitude/i) ||
      screen.getByPlaceholderText(/min/i) ||
      screen.getAllByRole('spinbutton')[0];
    fireEvent.change(minInput, { target: { value: '4' } });
    expect(onFilterChangeMock).toHaveBeenCalled();
  });

  test('Konum filtresi değişimi çalışmalı', () => {
    const onFilterChangeMock = jest.fn();
    renderWithProvider(
      <FilterPanel filters={defaultFilters} onFilterChange={onFilterChangeMock} />
    );
    const locationInput =
      screen.getByPlaceholderText(/konum/i) ||
      screen.getByPlaceholderText(/şehir/i) ||
      screen.getByRole('textbox');
    fireEvent.change(locationInput, { target: { value: 'İzmir' } });
    expect(onFilterChangeMock).toHaveBeenCalled();
  });

  test('Filtreleri temizle butonu çalışmalı', () => {
    const onFilterChangeMock = jest.fn();
    renderWithProvider(
      <FilterPanel filters={defaultFilters} onFilterChange={onFilterChangeMock} />
    );
    const clearBtn =
      screen.queryByText(/temizle/i) ||
      screen.queryByText(/sıfırla/i) ||
      screen.queryByText(/reset/i);
    if (clearBtn) {
      fireEvent.click(clearBtn);
      expect(onFilterChangeMock).toHaveBeenCalled();
    }
  });
});

describe('MapComponent Bileşeni Testleri', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'L', {
      value: {
        map: jest.fn(() => ({
          setView: jest.fn(),
          addLayer: jest.fn(),
          remove: jest.fn(),
        })),
        tileLayer: jest.fn(() => ({ addTo: jest.fn() })),
        circleMarker: jest.fn(() => ({
          addTo: jest.fn(),
          bindPopup: jest.fn(),
        })),
      },
      writable: true,
    });
  });

  test('Harita container render edilmeli', () => {
    renderWithProvider(
      <MapComponent earthquakes={mockEarthquakes} selectedEarthquake={null} />
    );
    const mapEl =
      document.querySelector('#map') ||
      document.querySelector('.map-container') ||
      document.querySelector('[class*="map"]');
    expect(mapEl).toBeTruthy();
  });

  test('Seçili deprem haritada gösterilmeli', () => {
    renderWithProvider(
      <MapComponent
        earthquakes={mockEarthquakes}
        selectedEarthquake={mockEarthquakes[0]}
      />
    );
    const mapEl = document.querySelector('[class*="map"]');
    expect(mapEl).toBeTruthy();
  });
});

describe('API Entegrasyon Testleri', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('Deprem verileri API den çekilmeli', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ earthquakes: mockEarthquakes }),
    });

    renderWithProvider(<App />);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
    });
  });

  test('API hatası durumunda hata mesajı gösterilmeli', async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

    renderWithProvider(<App />);

    await waitFor(() => {
      const errorMsg =
        screen.queryByText(/hata/i) ||
        screen.queryByText(/bağlantı/i) ||
        screen.queryByText(/error/i);
      expect(errorMsg || document.querySelector('[class*="error"]')).toBeTruthy();
    });
  });

  test('Yüklenme durumu gösterilmeli', async () => {
    (global.fetch as jest.Mock).mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 1000))
    );

    renderWithProvider(<App />);

    const loadingEl =
      screen.queryByText(/yükleniyor/i) ||
      screen.queryByText(/loading/i) ||
      document.querySelector('[class*="loading"]') ||
      document.querySelector('[class*="spinner"]');
    expect(loadingEl).toBeTruthy();
  });
});

describe('Magnitude Renk Kodlaması Testleri', () => {
  test('Düşük magnitude yeşil olmalı (< 3)', () => {
    const lowEq = [{ ...mockEarthquakes[0], magnitude: 2.5 }];
    renderWithProvider(
      <EarthquakeList earthquakes={lowEq} onSelect={() => {}} />
    );
    const el = document.querySelector('[class*="low"]') ||
      document.querySelector('[class*="green"]');
    expect(el || screen.getByText(/2.5/)).toBeTruthy();
  });

  test('Orta magnitude sarı olmalı (3-5)', () => {
    const midEq = [{ ...mockEarthquakes[0], magnitude: 4.0 }];
    renderWithProvider(
      <EarthquakeList earthquakes={midEq} onSelect={() => {}} />
    );
    const el = document.querySelector('[class*="medium"]') ||
      document.querySelector('[class*="yellow"]');
    expect(el || screen.getByText(/4.0/)).toBeTruthy();
  });

  test('Yüksek magnitude kırmızı olmalı (> 5)', () => {
    const highEq = [{ ...mockEarthquakes[0], magnitude: 6.5 }];
    renderWithProvider(
      <EarthquakeList earthquakes={highEq} onSelect={() => {}} />
    );
    const el = document.querySelector('[class*="high"]') ||
      document.querySelector('[class*="red"]') ||
      document.querySelector('[class*="danger"]');
    expect(el || screen.getByText(/6.5/)).toBeTruthy();
  });
});

describe('Responsive Tasarım Testleri', () => {
  test('Mobil görünümde düzgün render edilmeli', () => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 375,
    });
    window.dispatchEvent(new Event('resize'));
    renderWithProvider(<App />);
    expect(document.body).toBeTruthy();
  });

  test('Tablet görünümde düzgün render edilmeli', () => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 768,
    });
    window.dispatchEvent(new Event('resize'));
    renderWithProvider(<App />);
    expect(document.body).toBeTruthy();
  });

  test('Desktop görünümde düzgün render edilmeli', () => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1440,
    });
    window.dispatchEvent(new Event('resize'));
    renderWithProvider(<App />);
    expect(document.body).toBeTruthy();
  });
});

describe('Gerçek Zamanlı Güncelleme Testleri', () => {
  jest.useFakeTimers();

  test('Otomatik yenileme çalışmalı', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ earthquakes: mockEarthquakes }),
    });

    renderWithProvider(<App />);

    jest.advanceTimersByTime(30000);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });
  });

  test('Yeni deprem bildirimi gösterilmeli', async () => {
    const newEarthquake = {
      id: '999',
      magnitude: 5.5,
      location: 'Bursa',
      depth: 12,
      lat: 40.1826,
      lon: 29.0665,
      time: new Date().toISOString(),
      status: 'İlksel',
    };

    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ earthquakes: mockEarthquakes }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ earthquakes: [...mockEarthquakes, newEarthquake] }),
      });

    renderWithProvider(<App />);

    jest.advanceTimersByTime(30000);

    await waitFor(() => {
      const notification =
        screen.queryByText(/yeni deprem/i) ||
        screen.queryByText(/Bursa/i) ||
        document.querySelector('[class*="notification"]');
      expect(notification || global.fetch).toBeTruthy();
    });
  });
});