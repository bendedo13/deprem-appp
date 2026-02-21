import { useEffect, useState } from 'react';
import { adminService } from '../../services/api';
import {
    Activity,
    Plus,
    Trash2,
    Search,
    MapPin,
    Map,
    Clock,
    Zap,
    ExternalLink
} from 'lucide-react';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { toast } from 'react-hot-toast';

export default function AdminEarthquakes() {
    const [quakes, setQuakes] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [minMag, setMinMag] = useState(0);
    const [page, setPage] = useState(0);

    const fetchQuakes = async () => {
        setLoading(true);
        try {
            const data = await adminService.getEarthquakes(page * 100, 100, minMag);
            setQuakes(data);
        } catch (error) {
            toast.error('Depremler yüklenemedi');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchQuakes();
    }, [minMag, page]);

    const handleDelete = async (quakeId: number) => {
        if (!window.confirm('Bu deprem kaydını kalıcı olarak silmek istediğinize emin misiniz?')) return;
        try {
            await adminService.deleteEarthquake(quakeId);
            toast.success('Deprem kaydı silindi');
            fetchQuakes();
        } catch (error) {
            toast.error('Silme işlemi başarısız');
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-black text-white italic tracking-tighter uppercase">Deprem Kayıtları</h2>
                    <p className="text-slate-400 text-sm">Sistemdeki sismik verileri yönetin ve manuel müdahale edin.</p>
                </div>

                <div className="flex gap-4">
                    <select
                        value={minMag}
                        onChange={(e) => setMinMag(Number(e.target.value))}
                        className="bg-dark-surface border border-dark-border rounded-xl px-4 py-3 text-white font-bold outline-none focus:border-primary transition-all"
                    >
                        <option value={0}>Tüm Şiddetler</option>
                        <option value={3}>3.0+</option>
                        <option value={4}>4.0+</option>
                        <option value={5}>5.0+</option>
                    </select>

                    <button className="bg-primary hover:bg-red-600 text-white px-6 py-3 rounded-xl font-black italic uppercase tracking-tighter flex items-center gap-2 transition-all">
                        <Plus size={20} />
                        Manuel Ekle
                    </button>
                </div>
            </div>

            <div className="bg-dark-surface border border-dark-border rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-dark/50 border-b border-dark-border">
                            <tr>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Şiddet & Yer</th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Koordinat / Derinlik</th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Kaynak</th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Zaman</th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">İşlemler</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-dark-border">
                            {quakes.map((quake) => (
                                <tr key={quake.id} className="hover:bg-white/5 transition-colors group">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-4">
                                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-black text-white italic shadow-lg
                                                ${quake.magnitude >= 5 ? 'bg-red-600 shadow-red-600/20' : quake.magnitude >= 4 ? 'bg-orange-600 shadow-orange-600/20' : 'bg-slate-700 shadow-slate-700/20'}
                                            `}>
                                                {quake.magnitude.toFixed(1)}
                                            </div>
                                            <div>
                                                <div className="font-bold text-white uppercase italic tracking-tighter">{quake.location}</div>
                                                <div className="text-xs text-slate-500 font-bold uppercase tracking-widest">#{quake.external_id || quake.id}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-300 uppercase">
                                                <Map size={14} className="text-primary" />
                                                {quake.latitude.toFixed(3)}, {quake.longitude.toFixed(3)}
                                            </div>
                                            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 uppercase">
                                                <Activity size={14} />
                                                {quake.depth?.toFixed(1) || '0.0'} KM
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="px-3 py-1 bg-dark rounded-full text-[10px] font-black text-slate-400 uppercase border border-dark-border tracking-widest">
                                            {quake.source}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2 text-xs text-slate-300 font-bold">
                                                <Clock size={14} className="text-blue-500" />
                                                {format(new Date(quake.occurred_at), 'HH:mm', { locale: tr })}
                                            </div>
                                            <div className="text-[10px] text-slate-500 font-bold uppercase">
                                                {format(new Date(quake.occurred_at), 'd MMMM yyyy', { locale: tr })}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={() => handleDelete(quake.id)}
                                                className="p-2 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-500/10 transition-colors"
                                                title="Sil"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {quakes.length === 0 && !loading && (
                    <div className="p-12 text-center text-slate-500 font-bold uppercase tracking-widest text-sm">
                        Deprem kaydı yok
                    </div>
                )}
            </div>
        </div>
    );
}
