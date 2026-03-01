/**
 * Deprem kartı bileşeni.
 * Tek bir depremi özet olarak gösterir.
 */
import React from 'react'
import type { Earthquake } from '../types'
import { getMagnitudeColor, getMagnitudeBgColor, getMagnitudeLabel, timeAgo, formatCoordinates } from '../lib/utils'

interface EarthquakeCardProps {
  earthquake: Earthquake
  onClick?: (earthquake: Earthquake) => void
}

const EarthquakeCard: React.FC<EarthquakeCardProps> = ({ earthquake, onClick }) => {
  const { magnitude, location, occurred_at, depth, latitude, longitude, source } = earthquake

  return (
    <div
      data-testid="earthquake-card"
      className={`rounded-lg p-4 border cursor-pointer hover:shadow-md transition-shadow ${getMagnitudeBgColor(magnitude)}`}
      onClick={() => onClick?.(earthquake)}
      role="button"
      aria-label={`${location} depremi, büyüklük ${magnitude}`}
    >
      {/* Büyüklük rozeti */}
      <div className="flex items-center justify-between mb-2">
        <span
          data-testid="magnitude-badge"
          className={`text-2xl font-bold ${getMagnitudeColor(magnitude)}`}
        >
          M{magnitude.toFixed(1)}
        </span>
        <span
          data-testid="magnitude-label"
          className="text-sm text-gray-500 bg-white rounded-full px-2 py-1"
        >
          {getMagnitudeLabel(magnitude)}
        </span>
      </div>

      {/* Konum */}
      <p data-testid="earthquake-location" className="font-medium text-gray-800 mb-1">
        {location}
      </p>

      {/* Detaylar */}
      <div className="text-sm text-gray-600 space-y-1">
        <p data-testid="earthquake-time">{timeAgo(occurred_at)}</p>
        <p data-testid="earthquake-depth">Derinlik: {depth} km</p>
        <p data-testid="earthquake-coords">{formatCoordinates(latitude, longitude)}</p>
        <p data-testid="earthquake-source" className="uppercase text-xs text-gray-400">
          Kaynak: {source}
        </p>
      </div>
    </div>
  )
}

export default EarthquakeCard