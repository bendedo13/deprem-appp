import { useState } from 'react';
import { Search, ShieldAlert, CheckCircle2, AlertTriangle } from 'lucide-react';
import { earthquakeService } from '../../services/api';

/**
 * A tool for users to query their location's earthquake risk score.
 */
export default function RiskTool() {
    const [query, setQuery] = useState('');
    const [result, setResult] = useState<any | null>(null);
    const [loading, setLoading] = useState(false);

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!query) return;

        setLoading(true);
        try {
            // For demo, we use Istanbul coords if searching Istanbul
            const isIstanbul = query.toLowerCase().includes('istanbul');
            const lat = isIstanbul ? 41.0082 : 39.9334;
            const lng = isIstanbul ? 28.9784 : 32.8597;

            const data = await earthquakeService.calculateRisk(lat, lng);
            setResult(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-dark-surface rounded-2xl border border-dark-border p-6 shadow-xl">
            <div className="flex items-center gap-3 mb-6">
                <ShieldAlert className="text-primary w-6 h-6" />
                <h2 className="text-xl font-bold">Risk Skoru Sorgula</h2>
            </div>

            <form onSubmit={handleSearch} className="flex gap-2 mb-8">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
                    <input
                        type="text"
                        className="w-full bg-dark bg-opacity-50 border border-dark-border rounded-xl py-3 pl-10 pr-4 text-sm focus:outline-none focus:border-primary transition-colors"
                        placeholder="İl, ilçe veya adres giriniz..."
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                    />
                </div>
                <button
                    type="submit"
                    className="bg-primary hover:bg-red-700 text-white font-bold py-3 px-6 rounded-xl transition-all disabled:opacity-50"
                    disabled={loading}
                >
                    {loading ? '...' : 'Sorgula'}
                </button>
            </form>

            {result && (
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                    <div className="flex items-center justify-between mb-4">
                        <span className="text-slate-400 font-medium">Risk Seviyesi</span>
                        <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold uppercase ${result.risk_level === 'high' ? 'bg-red-900/40 text-red-500' :
                                result.risk_level === 'medium' ? 'bg-orange-900/40 text-orange-500' :
                                    'bg-emerald-900/40 text-emerald-500'
                            }`}>
                            {result.risk_level === 'high' ? <AlertTriangle size={14} /> : <CheckCircle2 size={14} />}
                            {result.risk_level === 'high' ? 'Yüksek' :
                                result.risk_level === 'medium' ? 'Orta' : 'Düşük'}
                        </div>
                    </div>

                    <div className="text-4xl font-black text-center mb-6 text-primary">
                        {result.risk_score.toFixed(1)}
                        <span className="text-sm text-slate-500 ml-1 font-bold">/ 100</span>
                    </div>

                    <p className="text-sm text-slate-400 leading-relaxed text-center italic">
                        "{result.recommendation}"
                    </p>
                </div>
            )}
        </div>
    );
}
