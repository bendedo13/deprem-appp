import EarthquakeMap from '../components/map/EarthquakeMap';
import EarthquakeList from '../components/earthquake/EarthquakeList';
import { Radio } from 'lucide-react';

export default function MapPage() {
    return (
        <div className="h-[calc(100vh-64px)] flex flex-col lg:flex-row overflow-hidden">
            {/* Sidebar - List */}
            <div className="w-full lg:w-96 bg-dark-surface border-r border-dark-border flex flex-col h-1/2 lg:h-full">
                <div className="p-4 border-b border-dark-border flex items-center justify-between">
                    <h2 className="font-bold flex items-center gap-2">
                        <Radio className="text-primary animate-pulse w-4 h-4" />
                        Son Depremler
                    </h2>
                    <span className="text-[10px] bg-dark px-2 py-1 rounded-full text-slate-400 font-bold uppercase tracking-widest">Canlı Yayın</span>
                </div>
                <div className="flex-1 overflow-hidden p-2">
                    <EarthquakeList />
                </div>
            </div>

            {/* Main Area - Full Screen Map */}
            <div className="flex-1 relative h-1/2 lg:h-full">
                <EarthquakeMap />

                {/* Overlay Info */}
                <div className="absolute top-4 right-4 z-[1000] space-y-2 pointer-events-none">
                    <div className="bg-dark/80 backdrop-blur-md border border-white/5 p-3 rounded-xl shadow-2xl">
                        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Harita Modu</div>
                        <div className="text-xs font-bold text-white">Sismik Aktivite Isı Haritası</div>
                    </div>
                </div>
            </div>
        </div>
    );
}
