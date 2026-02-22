import { useState } from 'react';
import { Search, ShieldAlert, CheckCircle2, AlertTriangle, Building2, Map as MapIcon, Download, Loader2 } from 'lucide-react';
import { earthquakeService } from '../../services/api';
import { toast } from 'react-hot-toast';

/**
 * Advanced risk analysis tool with building details.
 */
export default function RiskTool() {
    const [query, setQuery] = useState('');
    const [buildingYear, setBuildingYear] = useState(2000);
    const [soilClass, setSoilClass] = useState('UNKNOWN');
    const [result, setResult] = useState<any | null>(null);
    const [loading, setLoading] = useState(false);
    const [downloading, setDownloading] = useState(false);

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            // Demo coords logic
            const isIstanbul = query.toLowerCase().includes('istanbul');
            const lat = isIstanbul ? 41.0082 : 39.9334;
            const lng = isIstanbul ? 28.9784 : 32.8597;

            const data = await earthquakeService.calculateRisk({
                latitude: lat,
                longitude: lng,
                building_year: buildingYear,
                soil_class: soilClass
            });
            setResult({ ...data, lat, lng });
        } catch (error) {
            console.error(error);
            toast.error('Risk hesaplanırken hata oluştu.');
        } finally {
            setLoading(false);
        }
    };

    const handleDownload = async () => {
        if (!result) return;
        setDownloading(true);
        try {
            const blob = await earthquakeService.downloadRiskReport({
                latitude: result.lat,
                longitude: result.lng,
                building_year: result.building_year,
                soil_class: result.soil_class
            });

            const url = window.URL.createObjectURL(new Blob([blob]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `QuakeSense_Risk_Report_${new Date().toISOString().split('T')[0]}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            toast.success('Rapor başarıyla indirildi.');
        } catch (error) {
            console.error(error);
            toast.error('Rapor indirilirken hata oluştu.');
        } finally {
            setDownloading(false);
        }
    };

    return (
        <div className="bg-dark-surface rounded-2xl border border-dark-border p-6 shadow-xl h-full">
            <div className="flex items-center gap-3 mb-6">
                <ShieldAlert className="text-primary w-6 h-6" />
                <h2 className="text-xl font-bold italic uppercase tracking-tighter">Sismik Risk Analizi</h2>
            </div>

            <form onSubmit={handleSearch} className="space-y-4 mb-8">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
                    <input
                        type="text"
                        className="w-full bg-dark bg-opacity-50 border border-dark-border rounded-xl py-3 pl-10 pr-4 text-sm focus:outline-none focus:border-primary transition-colors"
                        placeholder="Şehir / İlçe giriniz..."
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                    />
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <div className="relative">
                        <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
                        <select
                            className="w-full bg-dark bg-opacity-50 border border-dark-border rounded-xl py-3 pl-10 pr-4 text-xs appearance-none focus:outline-none focus:border-primary"
                            value={buildingYear}
                            onChange={(e) => setBuildingYear(parseInt(e.target.value))}
                        >
                            <option value={2020}>2007 Sonrası</option>
                            <option value={2003}>2000 - 2007</option>
                            <option value={1990}>1975 - 1999</option>
                            <option value={1970}>1975 Öncesi</option>
                        </select>
                    </div>
                    <div className="relative">
                        <MapIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
                        <select
                            className="w-full bg-dark bg-opacity-50 border border-dark-border rounded-xl py-3 pl-10 pr-4 text-xs appearance-none focus:outline-none focus:border-primary"
                            value={soilClass}
                            onChange={(e) => setSoilClass(e.target.value)}
                        >
                            <option value="UNKNOWN">Zemin (Bilinmiyor)</option>
                            <option value="Z1">Z1 (Kaya/Sert)</option>
                            <option value="Z2">Z2 (Orta Sert)</option>
                            <option value="Z3">Z3 (Gevşek)</option>
                            <option value="Z4">Z4 (Yumuşak/Kil)</option>
                        </select>
                    </div>
                </div>

                <button
                    type="submit"
                    className="w-full bg-primary hover:bg-primary-dark text-white font-black py-4 rounded-xl transition-all disabled:opacity-50 shadow-lg shadow-primary/20 italic"
                    disabled={loading}
                >
                    {loading ? 'HESAPLANIYOR...' : 'SKORU HESAPLA'}
                </button>
            </form>

            {result && (
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-500 bg-dark/40 border border-dark-border rounded-xl p-6">
                    <div className="flex items-center justify-between mb-4">
                        <span className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Risk Seviyesi</span>
                        <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-black uppercase ${result.level === 'Çok Yüksek' ? 'bg-red-900 text-white' :
                            result.level === 'Yüksek' ? 'bg-red-900/40 text-red-500' :
                                result.level === 'Orta' ? 'bg-orange-900/40 text-orange-500' :
                                    'bg-emerald-900/40 text-emerald-500'
                            }`}>
                            {result.level === 'Çok Yüksek' || result.level === 'Yüksek' ? <AlertTriangle size={12} /> : <CheckCircle2 size={12} />}
                            {result.level}
                        </div>
                    </div>

                    <div className="text-6xl font-black text-center mb-2 text-primary tracking-tighter">
                        {result.score.toFixed(1)}
                        <span className="text-base text-slate-500 ml-1">/ 10</span>
                    </div>

                    <div className="text-center mb-6">
                        <div className="text-[10px] text-slate-500 font-bold uppercase mb-1">En Yakın Fay</div>
                        <div className="text-xs text-slate-200 font-bold">{result.nearest_fault} ({result.fault_distance_km} km)</div>
                    </div>

                    <div className="space-y-2 mb-6">
                        {result.recommendations.map((rec: string, i: number) => (
                            <div key={i} className="text-[11px] text-slate-400 leading-tight bg-dark/50 p-2 rounded-lg border border-dark-border">
                                {rec}
                            </div>
                        ))}
                    </div>

                    <button
                        onClick={handleDownload}
                        disabled={downloading}
                        className="w-full flex items-center justify-center gap-2 py-3 bg-dark/80 hover:bg-dark border border-dark-border rounded-xl text-xs font-black text-slate-300 transition-all hover:text-white"
                    >
                        {downloading ? <Loader2 className="animate-spin w-4 h-4" /> : <Download size={14} />}
                        {downloading ? 'HAZIRLANIYOR...' : 'PDF RAPORU İNDİR'}
                    </button>
                </div>
            )}
        </div>
    );
}
