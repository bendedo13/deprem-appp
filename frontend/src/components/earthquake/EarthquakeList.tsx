import { useEarthquakeStore } from '../store/useEarthquakeStore';
import { formatDistanceToNow } from 'date-fns';
import { tr } from 'date-fns/locale';

/**
 * Render a list of recent earthquakes with status badges.
 */
export default function EarthquakeList() {
    const { earthquakes, loading } = useEarthquakeStore();

    if (loading && earthquakes.length === 0) {
        return (
            <div className="flex flex-col gap-4 animate-pulse">
                {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="h-20 bg-dark-surface rounded-xl border border-dark-border" />
                ))}
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-3 h-full overflow-y-auto pr-2 custom-scrollbar">
            {earthquakes.map((quake) => (
                <div
                    key={quake.id}
                    className="group flex items-center p-3 bg-dark-surface rounded-xl border border-dark-border hover:border-primary transition-all cursor-pointer"
                >
                    <div className={`w-12 h-12 rounded-lg flex flex-col items-center justify-center font-bold text-white shadow-lg ${quake.magnitude >= 6 ? 'bg-primary' :
                            quake.magnitude >= 5 ? 'bg-orange-500' :
                                quake.magnitude >= 4 ? 'bg-blue-600' : 'bg-emerald-600'
                        }`}>
                        <span className="text-lg leading-tight">{quake.magnitude.toFixed(1)}</span>
                        <span className="text-[8px] uppercase">{quake.source}</span>
                    </div>

                    <div className="ml-4 flex-1">
                        <h3 className="text-sm font-bold text-slate-100 group-hover:text-primary transition-colors truncate">
                            {quake.location}
                        </h3>
                        <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] text-slate-400 font-medium">
                                Derinlik: {quake.depth} km
                            </span>
                            <span className="text-slate-600">•</span>
                            <span className="text-[10px] text-slate-400 font-medium">
                                {formatDistanceToNow(new Date(quake.occurred_at), { addSuffix: true, locale: tr })}
                            </span>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}
