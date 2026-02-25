
import React, { useState, useEffect } from 'react';
import '../styles/pages/ShelterMap.css';

interface Shelter {
  id: string;
  name: string;
  address: string;
  capacity: number;
  currentOccupancy: number;
  type: 'school' | 'gym' | 'community_center' | 'university' | 'government';
  latitude: number;
  longitude: number;
  facilities: string[];
  phone: string;
  distance?: number;
  available: boolean;
}

const ShelterMap: React.FC = () => {
  const [shelters, setShelters] = useState<Shelter[]>([
    {
      id: '1',
      name: 'Atatürk İlkokulu Barınma Merkezi',
      address: 'Merkez Mahallesi, Ankara',
      capacity: 500,
      currentOccupancy: 320,
      type: 'school',
      latitude: 39.9334,
      longitude: 32.8597,
      facilities: ['Yemek', 'Tıbbi Hizmet', 'Oyun Alanı', 'Tuvaletler'],
      phone: '0312 XXX XXXX',
      available: true,
    },
    {
      id: '2',
      name: 'Spor Kompleksi Acil Barınma',
      address: 'Çankaya, Ankara',
      capacity: 800,
      currentOccupancy: 450,
      type: 'gym',
      latitude: 39.9282,
      longitude: 32.8576,
      facilities: ['Yemek', 'Duş', 'Uyku Alanları', 'Çamaşır Hizmetleri'],
      phone: '0312 XXX XXXX',
      available: true,
    },
    {
      id: '3',
      name: 'Yeşiltepe Toplum Merkezi',
      address: 'Yeşiltepe, Ankara',
      capacity: 300,
      currentOccupancy: 298,
      type: 'community_center',
      latitude: 39.9456,
      longitude: 32.8234,
      facilities: ['Yemek', 'Oyun Alanı'],
      phone: '0312 XXX XXXX',
      available: false,
    },
    {
      id: '4',
      name: 'Gazi Üniversitesi Barınma Tesisi',
      address: 'Gazi, Ankara',
      capacity: 1200,
      currentOccupancy: 650,
      type: 'university',
      latitude: 39.9123,
      longitude: 32.8534,
      facilities: ['Yemek', 'Tıbbi Hizmet', 'Uyku Alanları', 'İnternet'],
      phone: '0312 XXX XXXX',
      available: true,
    },
  ]);

  const [selectedShelter, setSelectedShelter] = useState<Shelter | null>(null);
  const [userLocation, setUserLocation] = useState({ lat: 39.9334, lng: 32.8597 });
  const [filters, setFilters] = useState({
    available: true,
    search: '',
  });

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((position) => {
        setUserLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      });
    }

    calculateDistances();
  }, []);

  const calculateDistances = () => {
    const updatedShelters = shelters.map((shelter) => {
      const distance = calculateDistance(
        userLocation.lat,
        userLocation.lng,
        shelter.latitude,
        shelter.longitude
      );
      return { ...shelter, distance };
    });
    setShelters(updatedShelters.sort((a, b) => (a.distance || 0) - (b.distance || 0)));
  };

  const calculateDistance = (
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number => {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const getOccupancyPercentage = (shelter: Shelter): number => {
    return (shelter.currentOccupancy / shelter.capacity) * 100;
  };

  const getCapacityColor = (percentage: number): string => {
    if (percentage < 50) return '#00C851';
    if (percentage < 80) return '#ffbb33';
    if (percentage < 100) return '#ff4444';
    return '#cc0000';
  };

  const filteredShelters = shelters.filter((shelter) => {
    const matchesAvailability = !filters.available || shelter.available;
    const matchesSearch =
      shelter.name.toLowerCase().includes(filters.search.toLowerCase()) ||
      shelter.address.toLowerCase().includes(filters.search.toLowerCase());
    return matchesAvailability && matchesSearch;
  });

  return (
    <div className="shelter-map-container">
      <header className="sm-header">
        <h1>🏠 Barınma Merkezleri</h1>
        <p>Deprem sonrası güvenli barınma yerlerini bulun</p>
      </header>

      <div className="sm-controls">
        <input
          type="text"
          placeholder="Merkez adı veya konum ara..."
          value={filters.search}
          onChange={(e) => setFilters({ ...filters, search: e.target.value })}
          className="search-input"
        />
        <label className="filter-checkbox">
          <input
            type="checkbox"
            checked={filters.available}
            onChange={(e) =>
              setFilters({ ...filters, available: e.target.