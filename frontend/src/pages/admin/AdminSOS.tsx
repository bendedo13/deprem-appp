import { useEffect, useState, useCallback } from 'react';
import { adminService } from '../../services/api';
import type { AdminSOSRecord } from '../../types';
import {
    AlertTriangle,
    Trash2,
    MapPin,
    Clock,
    User,
    Filter
} from 'lucide-react';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { toast } from 'react-hot-toast';

const ACILIYET_COLORS: Record<string, string> = {
    kritik: 'bg-red-500/15 text-red-400 border-red-500/30',
    yuksek: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
    orta: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
    dusuk: 'bg-green-500/15 text-green-400 border-green-500/30',
};

const STATUS_COLORS: Record<string, string> = {
    pending: 'bg-yellow-500/10 text-yellow-400',
    processed: 'bg-green-500/10 text-green-400',
    failed: 'bg-red-500/10 text-red-400',
};

export default function AdminSOS() {
    const [records, setRecords] = useState<AdminSOSRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [aciliyetFilter, setAciliyetFilter] = useState('');

    const fetchRecords = useCallback(async (filter: string) => {
        setLoading(true);
        try {
            const data = await adminService.getSosRecords(0, 100, filter || undefined);
            setRecords(data);
        } catch {
            toast.error('SOS kayıtları yüklenemedi');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchRecords(aciliyetFilter);
    }, [aciliyetFilter, fetchRecords]);

    const handleDelete = async (sosId: string) => {
        if (!window.confirm('Bu SOS kaydını silmek istediğinize emin misiniz?')) return;
        try {
            await adminService.deleteSosRecord(sosId);
            toast.success('SOS kaydı silindi');
            fetchRecords(aciliyetFilter);
        } catch {
            toast.error('Silme işlemi başarısız');
        }
    };

    const criticalCount = records.filter((r) => r.aciliyet === 'kritik').length;
    const highCount = records.filter((r) => r.aciliyet === 'yuksek').length;

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-black text-white italic tracking-tighter uppercase">SOS Kayıtları</h2>
                    <p className="text-slate-400 text-sm">Kullanıcılardan gelen acil yardım taleplerini yönetin.</p>
                </div>

                <div className="flex items-center gap-3">
                    <Filter size={18} className="text-slate-500" />
                    <select
                        value={aciliyetFilter}
                        onChange={(e) => setAciliyetFilter(e.target.value)}
                        className="bg-dark-surface border border-dark-border rounded-xl px-4 py-3 text-white font-bold outline-none focus:border-primary transition-all"
                    >
                        <option value="">Tüm Aciliyet</option>
                        <option value="kritik">Kritik</option>
                        <option value="yuksek">Yüksek</option>
                        <option value="orta">Orta</option>
                        <option value="dusuk">Düşük</option>
                    </select>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { label: 'Toplam', value: records.length, color: 'text-white' },
                    { label: 'Kritik', value: criticalCount, color: 'text-red-400' },
                    { label: 'Yüksek', value: highCount, color: 'text-orange-400' },
                    { label: 'Diğer', value: records.length - criticalCount - highCount, color: 'text-slate-400' },
                ].map((item) => (
                    <div key={item.label} className="bg-dark-surface border border-dark-border rounded-2xl p-4 text-center">
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{item.label}</p>
                        <p className={`text-2xl font-black italic ${item.color}`}>{item.value}</p>
                    </div>
                ))}
            </div>

            <div className="bg-dark-surface border border-dark-border rounded-2xl overflow-hidden">
                {loading ? (
                    <div className="flex items-center justify-center py-16">
                        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-dark/50 border-b border-dark-border">
                                <tr>
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Durum & Aciliyet</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Kullanıcı</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Konum</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Mesaj</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Tarih</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">İşlem</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-dark-border">
                                {records.map((rec) => (
                                    <tr key={rec.id} className="hover:bg-white/5 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col gap-2">
                                                <span className={`px-2 py-1 rounded-md text-[10px] font-black w-fit uppercase border ${ACILIYET_COLORS[rec.aciliyet] || 'bg-slate-500/10 text-slate-400 border-slate-500/20'}`}>
                                                    {rec.aciliyet}
                                                </span>
                                                <span className={`px-2 py-1 rounded-md text-[10px] font-bold w-fit uppercase ${STATUS_COLORS[rec.processing_status || ''] || 'bg-slate-500/10 text-slate-500'}`}>
                                                    {rec.processing_status || 'belirsiz'}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2 text-sm font-bold text-slate-300">
                                                <User size={14} className="text-primary" />
                                                #{rec.user_id}
                                            </div>
                                            <div className="text-xs text-slate-500 mt-1">{rec.kisi_sayisi} kişi</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm font-bold text-slate-300 max-w-[150px] truncate">{rec.lokasyon}</div>
                                            {rec.latitude && (
                                                <div className="flex items-center gap-1 text-xs text-slate-500 mt-1">
                                                    <MapPin size={12} />
                                                    {rec.latitude.toFixed(3)}, {rec.longitude?.toFixed(3)}
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-start gap-2">
                                                <AlertTriangle size={14} className="text-orange-500 mt-0.5 shrink-0" />
                                                <p className="text-xs text-slate-400 font-bold max-w-[200px] line-clamp-2">{rec.durum}</p>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            {rec.created_at && (
                                                <div className="space-y-1">
                                                    <div className="flex items-center gap-2 text-xs text-slate-300 font-bold">
                                                        <Clock size={14} className="text-blue-500" />
                                                        {format(new Date(rec.created_at), 'HH:mm', { locale: tr })}
                                                    </div>
                                                    <div className="text-[10px] text-slate-500 font-bold uppercase">
                                                        {format(new Date(rec.created_at), 'd MMM yyyy', { locale: tr })}
                                                    </div>
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => handleDelete(rec.id)}
                                                    className="p-2 rounded-lg text-slateate-400 hover:text-red-500 hover:bg-red-500/10 transition-colors"
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
                )}

                {records.length === 0 && !loading && (
                    <div className="p-12 text-center text-slate-500 font-bold uppercase tracking-widest text-sm">
                        SOS kaydı bulunamadı
                    </div>
                )}
            </div>
        </div>
    );
}
