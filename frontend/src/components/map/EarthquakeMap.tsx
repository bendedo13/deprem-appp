import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { useEarthquakeStore } from '../../store/useEarthquakeStore';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';


export default function EarthquakeMap() {
    const { earthquakes } = useEarthquakeStore();

    const getMagnitudeColor = (mag: number) => {
        if (mag >= 6) return '#e00700';
        if (mag >= 5) return '#f59e0b';
        if (mag >= 4) return '#3b82f6';
        return '#10b981';
    };

    return (
        <div className="h-full w-full rounded-2xl overflow-hidden border border-dark-border shadow-2xl">
            <MapContainer
                center={[39.0, 35.0]}
                zoom={6}
                style={{ height: '100%', width: '100%' }}
                zoomControl={false}
            >
                <TileLayer
                    url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                />

                {Array.isArray(earthquakes) && earthquakes.map((quake: any) => {
                    if (typeof quake.latitude !== 'number' || typeof quake.longitude !== 'number') return null;

                    let occurredAt: Date;
                    try {
                        occurredAt = new Date(quake.occurred_at);
                        if (isNaN(occurredAt.getTime())) throw new Error('Invalid date');
                    } catch (e) {
                        return null;
                    }

                    return (
                        <CircleMarker
                            key={quake.id}
                            center={[quake.latitude, quake.longitude]}
                            radius={(quake.magnitude || 1) * 3}
                            fillColor={getMagnitudeColor(quake.magnitude || 0)}
                            color="#fff"
                            weight={1}
                            fillOpacity={0.6}
                        >
                            <Popup>
                                <div className="p-1">
                                    <div className="font-bold text-lg mb-1">{quake.location}</div>
                                    <div className="flex gap-4 mb-2">
                                        <div className="flex flex-col">
                                            <span className="text-xs text-slate-400">Büyüklük</span>
                                            <span className="font-bold text-primary">{quake.magnitude}</span>
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-xs text-slate-400">Derinlik</span>
                                            <span className="font-bold">{quake.depth} km</span>
                                        </div>
                                    </div>
                                    <div className="text-xs text-slate-400">
                                        {format(occurredAt, 'd MMMM yyyy, HH:mm', { locale: tr })}
                                    </div>
                                    <div className="mt-2 text-[10px] uppercase font-bold text-slate-500">
                                        Kaynak: {quake.source}
                                    </div>
                                </div>
                            </Popup>
                        </CircleMarker>
                    );
                })}
            </MapContainer>
        </div>
    );
}
