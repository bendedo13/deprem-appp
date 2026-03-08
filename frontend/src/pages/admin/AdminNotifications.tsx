import { useEffect, useState, type FormEvent } from 'react';
import {
    Send,
    Smartphone,
    AlertCircle,
    CheckCircle2,
    Loader2,
    Image,
    User,
    History,
    Bell,
    ChevronDown,
    ChevronUp
} from 'lucide-react';
import { adminService } from '../../services/api';
import { toast } from 'react-hot-toast';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';

export default function AdminNotifications() {
    const [form, setForm] = useState({
        title: '',
        body: '',
        only_active: true,
        image_url: '',
        target_user_id: '' as string,
    });
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<any>(null);

    // History
    const [history, setHistory] = useState<any[]>([]);
    const [historyLoading, setHistoryLoading] = useState(true);
    const [showHistory, setShowHistory] = useState(true);

    useEffect(() => {
        fetchHistory();
    }, []);

    const fetchHistory = async () => {
        setHistoryLoading(true);
        try {
            const data = await adminService.getNotifications(0, 30);
            setHistory(data);
        } catch {
            // silent
        } finally {
            setHistoryLoading(false);
        }
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!form.title || !form.body) {
            toast.error('Başlık ve mesaj zorunludur');
            return;
        }

        const targetDesc = form.target_user_id
            ? `#${form.target_user_id} kullanıcısına`
            : 'tüm kullanıcılara';
        if (!window.confirm(`Bu mesajı ${targetDesc} göndermek istediğinize emin misiniz?`)) return;

        setLoading(true);
        setResult(null);
        try {
            const payload: any = {
                title: form.title,
                body: form.body,
                only_active: form.only_active,
            };
            if (form.image_url) payload.image_url = form.image_url;
            if (form.target_user_id) payload.target_user_id = parseInt(form.target_user_id);

            const data = await adminService.broadcast(payload);
            setResult(data);
            toast.success('Bildirim başarıyla gönderildi');
            setForm({ title: '', body: '', only_active: true, image_url: '', target_user_id: '' });
            fetchHistory();
        } catch {
            toast.error('Gönderim başarısız');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div>
                <h2 className="text-3xl font-black text-white italic tracking-tighter uppercase">Bildirim Merkezi</h2>
                <p className="text-slate-400 text-sm">Zengin içerikli bildirimler gönderin, geçmişi takip edin.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Form Side */}
                <div className="bg-dark-surface border border-dark-border rounded-2xl p-6 h-fit">
                    <h4 className="text-sm font-black text-white uppercase italic tracking-widest mb-6 flex items-center gap-2">
                        <Send size={16} className="text-primary" />
                        Yeni Bildirim
                    </h4>
                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Bildirim Başlığı</label>
                            <input
                                type="text"
                                value={form.title}
                                onChange={(e) => setForm({ ...form, title: e.target.value })}
                                placeholder="Örn: Uygulama Güncellemesi"
                                className="w-full bg-dark border border-dark-border rounded-xl px-4 py-3 text-white focus:border-primary outline-none font-bold transition-all"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">İçerik Mesajı</label>
                            <textarea
                                rows={3}
                                value={form.body}
                                onChange={(e) => setForm({ ...form, body: e.target.value })}
                                placeholder="Kullanıcıların ekranında görünecek mesaj..."
                                className="w-full bg-dark border border-dark-border rounded-xl px-4 py-3 text-white focus:border-primary outline-none font-bold transition-all resize-none"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 flex items-center gap-1.5">
                                <Image size={12} />
                                Görsel URL (Opsiyonel)
                            </label>
                            <input
                                type="url"
                                value={form.image_url}
                                onChange={(e) => setForm({ ...form, image_url: e.target.value })}
                                placeholder="https://example.com/image.jpg"
                                className="w-full bg-dark border border-dark-border rounded-xl px-4 py-3 text-white focus:border-primary outline-none font-bold transition-all text-sm"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 flex items-center gap-1.5">
                                <User size={12} />
                                Hedef Kullanıcı ID (Boşsa herkese)
                            </label>
                            <input
                                type="number"
                                value={form.target_user_id}
                                onChange={(e) => setForm({ ...form, target_user_id: e.target.value })}
                                placeholder="Örn: 42"
                                className="w-full bg-dark border border-dark-border rounded-xl px-4 py-3 text-white focus:border-primary outline-none font-bold transition-all text-sm"
                            />
                        </div>

                        <div className="flex items-center gap-3">
                            <input
                                type="checkbox"
                                id="only_active"
                                checked={form.only_active}
                                onChange={(e) => setForm({ ...form, only_active: e.target.checked })}
                                className="w-5 h-5 accent-primary bg-dark border-dark-border rounded cursor-pointer"
                            />
                            <label htmlFor="only_active" className="text-sm font-bold text-slate-300 cursor-pointer select-none">Sadece Aktif Kullanıcılar</label>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-primary hover:bg-red-600 disabled:opacity-50 text-white font-black py-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-primary/20 italic uppercase tracking-tighter"
                        >
                            {loading ? <Loader2 className="animate-spin" size={20} /> : <Send size={20} />}
                            {loading ? 'GÖNDERİLİYOR...' : 'BİLDİRİM GÖNDER'}
                        </button>
                    </form>

                    {result && (
                        <div className="mt-6 bg-green-500/10 border border-green-500/20 rounded-2xl p-5 flex flex-col items-center text-center space-y-2 animate-in zoom-in-95 duration-300">
                            <CheckCircle2 size={32} className="text-green-500" />
                            <h5 className="font-black text-white uppercase tracking-tighter italic">Başarıyla Gönderildi</h5>
                            <p className="text-xs text-slate-400 font-bold">Hedef: {result.total_targets} cihaz</p>
                            <p className="text-xs text-green-500 font-black">Başarılı: {result.sent}</p>
                        </div>
                    )}
                </div>

                {/* Preview Side */}
                <div className="space-y-6">
                    <div className="bg-dark-surface border border-dark-border rounded-2xl p-6">
                        <h4 className="text-sm font-black text-white uppercase italic tracking-widest mb-4 flex items-center gap-2">
                            <Smartphone size={16} className="text-primary" />
                            Cihaz Önizleme
                        </h4>
                        <div className="bg-zinc-900 rounded-3xl border-4 border-zinc-800 p-2 max-w-[280px] mx-auto shadow-2xl">
                            <div className="bg-zinc-800 w-20 h-5 mx-auto rounded-full mb-4" />
                            <div className="bg-white/10 rounded-xl p-3 min-h-[40px] mb-2 border border-white/5">
                                <p className="text-[10px] font-black text-white leading-tight">{form.title || 'Bildirim Başlığı'}</p>
                                <p className="text-[9px] text-slate-400 mt-1 line-clamp-2 leading-tight">{form.body || 'Bildirim mesajı buraya gelecek...'}</p>
                                {form.image_url && (
                                    <div className="mt-2 bg-white/5 rounded-lg h-24 flex items-center justify-center overflow-hidden">
                                        <img
                                            src={form.image_url}
                                            alt="preview"
                                            className="w-full h-full object-cover rounded-lg"
                                            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                        />
                                    </div>
                                )}
                            </div>
                            <div className="h-32" />
                        </div>
                        {form.target_user_id && (
                            <div className="mt-4 bg-blue-500/5 border border-blue-500/10 rounded-xl p-3 flex items-center gap-2">
                                <User size={14} className="text-blue-500" />
                                <span className="text-xs text-blue-400 font-bold">Hedef: Kullanıcı #{form.target_user_id}</span>
                            </div>
                        )}
                    </div>

                    <div className="bg-blue-500/5 border border-blue-500/10 rounded-2xl p-5">
                        <div className="flex gap-3">
                            <AlertCircle size={20} className="text-blue-500 shrink-0" />
                            <div className="space-y-1">
                                <p className="text-xs font-black text-white uppercase tracking-widest">Bilgi</p>
                                <p className="text-xs text-slate-400 font-bold leading-relaxed">
                                    Bildirimler FCM üzerinden gönderilir. Görsel URL desteklenir (Android &amp; iOS). Tek kullanıcıya da gönderim yapabilirsiniz.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Notification History */}
            <div className="bg-dark-surface border border-dark-border rounded-2xl overflow-hidden">
                <button
                    onClick={() => setShowHistory(!showHistory)}
                    className="w-full px-6 py-4 flex items-center justify-between hover:bg-white/5 transition-colors"
                >
                    <h4 className="text-sm font-black text-white uppercase italic tracking-widest flex items-center gap-2">
                        <History size={16} className="text-slate-400" />
                        Bildirim Geçmişi ({history.length})
                    </h4>
                    {showHistory ? <ChevronUp size={18} className="text-slate-400" /> : <ChevronDown size={18} className="text-slate-400" />}
                </button>

                {showHistory && (
                    <div className="border-t border-dark-border">
                        {historyLoading ? (
                            <div className="p-8 flex justify-center">
                                <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
                            </div>
                        ) : history.length === 0 ? (
                            <div className="p-12 text-center text-slate-500 font-bold uppercase tracking-widest text-sm">
                                Henüz bildirim gönderilmemiş
                            </div>
                        ) : (
                            <div className="divide-y divide-dark-border max-h-[500px] overflow-y-auto">
                                {history.map((notif: any) => (
                                    <div key={notif.id} className="px-6 py-4 hover:bg-white/5 transition-colors">
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <Bell size={14} className="text-primary shrink-0" />
                                                    <h5 className="font-black text-white text-sm truncate">{notif.title}</h5>
                                                    <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase whitespace-nowrap ${
                                                        notif.target_type === 'broadcast'
                                                            ? 'bg-blue-500/10 text-blue-500'
                                                            : 'bg-amber-500/10 text-amber-500'
                                                    }`}>
                                                        {notif.target_type === 'broadcast' ? 'BROADCAST' : 'TEK'}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-slate-400 font-bold line-clamp-1">{notif.body}</p>
                                                {notif.image_url && (
                                                    <p className="text-[10px] text-slate-600 mt-1 truncate">📷 {notif.image_url}</p>
                                                )}
                                            </div>
                                            <div className="text-right shrink-0">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs text-green-500 font-black">{notif.sent_count || 0}✓</span>
                                                    {notif.failed_count > 0 && (
                                                        <span className="text-xs text-red-400 font-black">{notif.failed_count}✗</span>
                                                    )}
                                                </div>
                                                <p className="text-[10px] text-slate-500 mt-1 whitespace-nowrap">
                                                    {notif.created_at ? format(new Date(notif.created_at), 'd MMM HH:mm', { locale: tr }) : '—'}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
