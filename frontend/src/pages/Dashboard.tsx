import { useEffect } from 'react';
import EarthquakeMap from '../components/map/EarthquakeMap';
import EarthquakeList from '../components/earthquake/EarthquakeList';
import RiskTool from '../components/ui/RiskTool';
import AnalyticsCharts from '../components/earthquake/AnalyticsCharts';
import AdSlot from '../components/ads/AdSlot';
import { earthquakeService } from '../services/api';
import { useEarthquakeStore } from '../store/useEarthquakeStore';
import { Activity, Radio, ShieldAlert, Zap, BarChart3 } from 'lucide-react';

/**
 * Main dashboard view showing the live map, earthquake list, and risk tool.
 */
export default function Dashboard() {
    const { setEarthquakes, setLoading, analyticsData, setAnalyticsData } = useEarthquakeStore();

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const [quakes, analytics] = await Promise.all([
                    earthquakeService.getEarthquakes(50),
                    earthquakeService.getStats(7)
                ]);
                setEarthquakes(quakes);
                setAnalyticsData(analytics);
            } catch (error) {
                console.error('Data fetch failed:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    return (
        <main className="p-4 sm:p-6 max-w-[1600px] mx-auto">
            <AdSlot spot="top" />

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8">
                {/* Left Column - List & Stats */}
                <div className="lg:col-span-3 flex flex-col gap-6">
                    <div className="h-[500px] flex flex-col bg-dark-surface rounded-2xl border border-dark-border p-4 shadow-xl">
                        <div className="flex items-center justify-between mb-4 px-2">
                            <h2 className="font-bold flex items-center gap-2">
                                <Radio className="text-primary animate-pulse w-4 h-4" />
                                Son Depremler
                            </h2>
                            <span className="text-[10px] bg-dark px-2 py-1 rounded-full text-slate-400 font-bold">CANLI</span>
                        </div>
                        <EarthquakeList />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <StatCard icon={<Activity className="text-blue-500" />} label="Son 24s" value={analyticsData?.last_24h_count || 0} />
                        <StatCard icon={<Zap className="text-primary" />} label="Max Şiddet" value={analyticsData?.last_24h_max_mag?.toFixed(1) || '0.0'} />
                    </div>
                </div>

                {/* Center Column - Map */}
                <div className="lg:col-span-6 h-[500px] lg:h-auto">
                    <EarthquakeMap />
                </div>

                {/* Right Column - Risk & More */}
                <div className="lg:col-span-3 flex flex-col gap-6">
                    <RiskTool />

                    <div className="bg-gradient-to-br from-primary/20 to-dark-surface rounded-2xl border border-primary/30 p-6 flex flex-col justify-center items-center text-center relative overflow-hidden group">
                        <ShieldAlert className="w-12 h-12 text-primary mb-4" />
                        <h3 className="text-lg font-bold mb-2">Deprem Ağına Katılın</h3>
                        <p className="text-xs text-slate-400 mb-6 px-4">Telefonunuzu bir sensöre dönüştürerek hayat kurtaran saniyeler kazandırın.</p>
                        <button className="bg-primary text-white font-bold py-3 px-8 rounded-full shadow-lg shadow-primary/20 hover:scale-105 transition-transform z-10">
                            Hemen İndir
                        </button>
                        <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-primary rounded-full blur-[80px] opacity-20 group-hover:opacity-40 transition-opacity" />
                    </div>

                    <AdSlot spot="sidebar" />
                </div>
            </div>

            {/* Analytics Section */}
            <div className="mt-8">
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                        <BarChart3 className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-black text-slate-100 italic uppercase">Sismik Analiz Paneli</h2>
                        <p className="text-sm text-slate-400">Gerçek zamanlı verilerle Türkiye geneli istatistiksel raporlama</p>
                    </div>
                </div>

                {analyticsData && (
                    <AnalyticsCharts
                        dailyCounts={analyticsData.daily_counts}
                        distribution={analyticsData.magnitude_distribution}
                        hotspots={analyticsData.hotspots}
                    />
                )}
            </div>
        </main>
    );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode, label: string, value: string | number }) {
    return (
        <div className="bg-dark-surface border border-dark-border p-4 rounded-xl flex items-center gap-3">
            <div className="p-2 bg-dark rounded-lg">{icon}</div>
            <div>
                <div className="text-[10px] text-slate-500 font-bold uppercase">{label}</div>
                <div className="text-lg font-black text-white">{value}</div>
            </div>
        </div>
    );
}
