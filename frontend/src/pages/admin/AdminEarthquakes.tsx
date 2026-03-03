import { useEffect, useState, type FormEvent } from 'react';
import { adminService } from '../../services/api';
import type { AdminEarthquake } from '../../types';
import {
    Activity,
    Plus,
    Trash2,
    Map,
    Clock,
    X,
    Loader2
} from 'lucide-react';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { toast } from 'react-hot-toast';

const emptyForm = {
    magnitude: '',
    depth: '10',
    latitude: '',
    longitude: '',
    location: '',
    source: 'manual',
};

export default function AdminEarthquakes() {
    const [quakes, setQuakes] = useState<AdminEarthquake[]>([]);
    const [loading, setLoading] = useState(true);
    const [minMag, setMinMag] = useState(0);
    const [page] = useState(0);
    const [showModal, setShowModal] = useState(false);
    const [form, setForm] = useState(emptyForm);
    const [submitting, setSubmitting] = useState(false);

    const fetchQuakes = async () => {
        setLoading(true);
        try {
            const data = await adminService.getEarthquakes(page * 100, 100, minMag);
            setQuakes(data);
        } catch {
            toast.error('Depremler yüklenemedi');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchQuakes();
    }, [minMag, page]);

    const handleDelete = async (quakeId: string) => {
        if (!window.confirm('Bu deprem kaydını kalıcı olarak silmek istediğinize emin misiniz?')) return;
        try {
            await adminService.deleteEarthquake(quakeId);
            toast.success('Deprem kaydı silindi');
            fetchQuakes();
        } catch {
            toast.error('Silme işlemi başarısız');
        }
    };

    const handleCreate = async (e: FormEvent) => {
        e.preventDefault();
        if (!form.magnitude || !form.latitude || !form.longitude || !form.location) {
            toast.error('Tüm zorunlu alanları doldurun');
            return;
        }
        setSubmitting(true);
        try {
            await adminService.createEarthquake({
                magnitude: parseFloat(form.magnitude),
                depth: parseFloat(form.depth) || 10,
                latitude: parseFloat(form.latitude),
                longitude: parseFloat(form.longitude),
                location: form.location,
                source: form.source || 'manual',
            });
            toast.success('Deprem kaydı eklendi');
            setForm(emptyForm);
            setShowModal(false);
            fetchQuakes();
        } catch {
            toast.error('Deprem eklenemedi');
        } finally {
            setSubmitting(false);
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

                    <button
                        onClick={() => setShowModal(true)}
                        className="bg-primary hover:bg-orange-600 text-white px-6 py-3 rounded-xl font-black italic uppercase tracking-tighter flex items-center gap-2 transition-all"
                    >
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
                                                <div className="text-xs text-slate-500 font-bold uppercase tracking-widest">#{quake.id}</div>
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

            {/* Manuel Deprem Ekleme Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-dark-surface border border-dark-border rounded-2xl w-full max-w-md">
                        <div className="flex items-center justify-between p-6 border-b border-dark-border">
                            <h3 className="text-lg font-black text-white uppercase italic tracking-tighter">Manuel Deprem Ekle</h3>
                            <button onClick={() => setShowModal(false)} className="p-1 text-slate-400 hover:text-white">
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleCreate} className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Şiddet *</label>
                                    <input
                                        type="number" step="0.1" min="0.1" max="10"
                                        value={form.magnitude}
                                        onChange={(e) => setForm({ ...form, magnitude: e.target.value })}
                                        placeholder="4.5"
                                        className="w-full bg-dark border border-dark-border rounded-xl px-4 py-3 text-white focus:border-primary outline-none font-bold"
                                        required
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Derinlik (km)</label>
                                    <input
                                        type="number" step="0.1" min="0"
                                        value={form.depth}
                                        onChange={(e) => setForm({ ...form, depth: e.target.value })}
                                        placeholder="10"
                                        className="w-full bg-dark border border-dark-border rounded-xl px-4 py-3 text-white focus:border-primary outline-none font-bold"
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Enlem *</label>
                                    <input
                                        type="number" step="0.0001"
                                        value={form.latitude}
                                        onChange={(e) => setForm({ ...form, latitude: e.target.value })}
                                        placeholder="39.9334"
                                        className="w-full bg-dark border border-dark-border rounded-xl px-4 py-3 text-white focus:border-primary outline-none font-bold"
                                        required
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Boylam *</label>
                                    <input
                                        type="number" step="0.0001"
                                        value={form.longitude}
                                        onChange={(e) => setForm({ ...form, longitude: e.target.value })}
                                        placeholder="32.8597"
                                        className="w-full bg-dark border border-dark-border rounded-xl px-4 py-3 text-white focus:border-primary outline-none font-bold"
                                        required
                                    />
                                </div>
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Konum Adı *</label>
                                <input
                                    type="text"
                                    value={form.location}
                                    onChange={(e) => setForm({ ...form, location: e.target.value })}
                                    placeholder="Ankara, Türkiye"
                                    className="w-full bg-dark border border-dark-border rounded-xl px-4 py-3 text-white focus:border-primary outline-none font-bold"
                                    required
                                />
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="flex-1 border border-dark-border text-slate-400 font-bold py-3 rounded-xl hover:bg-white/5 transition-all"
                                >
                                    İptal
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="flex-1 bg-primary hover:bg-orange-600 disabled:opacity-50 text-white font-black py-3 rounded-xl flex items-center justify-center gap-2 transition-all"
                                >
                                    {submitting ? <Loader2 className="animate-spin" size={18} /> : <Plus size={18} />}
                                    Ekle
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
