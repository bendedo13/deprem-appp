import { useState, type FormEvent } from 'react';
import {
    Send,
    Smartphone,
    AlertCircle,
    CheckCircle2,
    Loader2
} from 'lucide-react';
import { adminService } from '../../services/api';
import { toast } from 'react-hot-toast';

export default function AdminBroadcast() {
    const [form, setForm] = useState({
        title: '',
        body: '',
        only_active: true
    });
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<any>(null);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!form.title || !form.body) {
            toast.error('Başlık ve mesaj zorunludur');
            return;
        }

        if (!window.confirm('Bu mesajı kayıtlı tüm kullanıcılara göndermek istediğinize emin misiniz?')) return;

        setLoading(true);
        setResult(null);
        try {
            const data = await adminService.broadcast(form);
            setResult(data);
            toast.success('Bildirim kuyruğa alındı');
            setForm({ title: '', body: '', only_active: true });
        } catch (error) {
            toast.error('Broadcast başarısız');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-3xl space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div>
                <h2 className="text-3xl font-black text-white italic tracking-tighter uppercase">Push Broadcast</h2>
                <p className="text-slate-400 text-sm">Cihazı kayıtlı olan kullanıcılara anlık bildirim gönderin.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Form Side */}
                <div className="bg-dark-surface border border-dark-border rounded-2xl p-6 h-fit">
                    <form onSubmit={handleSubmit} className="space-y-6">
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
                                rows={4}
                                value={form.body}
                                onChange={(e) => setForm({ ...form, body: e.target.value })}
                                placeholder="Kullanıcıların ekranında görünecek mesaj..."
                                className="w-full bg-dark border border-dark-border rounded-xl px-4 py-3 text-white focus:border-primary outline-none font-bold transition-all resize-none"
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
                            {loading ? 'GÖNDERİLİYOR...' : 'BROADCAST GÖNDER'}
                        </button>
                    </form>
                </div>

                {/* Preview / Instructions */}
                <div className="space-y-6">
                    <div className="bg-dark-surface border border-dark-border rounded-2xl p-6">
                        <h4 className="text-sm font-black text-white uppercase italic tracking-widest mb-4 flex items-center gap-2">
                            <Smartphone size={16} className="text-primary" />
                            Cihaz Önizleme
                        </h4>
                        <div className="bg-zinc-900 rounded-3xl border-4 border-zinc-800 p-2 max-w-[240px] mx-auto shadow-2xl">
                            <div className="bg-zinc-800 w-20 h-5 mx-auto rounded-full mb-4" />
                            <div className="bg-white/10 rounded-xl p-3 min-h-[40px] mb-2 border border-white/5">
                                <p className="text-[10px] font-black text-white leading-tight">{form.title || 'Bildirim Başlığı'}</p>
                                <p className="text-[9px] text-slate-400 mt-1 line-clamp-2 leading-tight">{form.body || 'Bildirim mesajı buraya gelecek...'}</p>
                            </div>
                            <div className="h-40" />
                        </div>
                    </div>

                    {result && (
                        <div className="bg-green-500/10 border border-green-500/20 rounded-2xl p-6 flex flex-col items-center text-center space-y-2 animate-in zoom-in-95 duration-300">
                            <CheckCircle2 size={32} className="text-green-500" />
                            <h5 className="font-black text-white uppercase tracking-tighter italic">Başarıyla Gönderildi</h5>
                            <p className="text-xs text-slate-400 font-bold">Hedeflenen Cihaz: {result.total_targets}</p>
                            <p className="text-xs text-green-500 font-black">Başarılı Kuyruk: {result.sent}</p>
                        </div>
                    )}

                    <div className="bg-blue-500/5 border border-blue-500/10 rounded-2xl p-6">
                        <div className="flex gap-3">
                            <AlertCircle size={20} className="text-blue-500 shrink-0" />
                            <div className="space-y-1">
                                <p className="text-xs font-black text-white uppercase tracking-widest">Bilgi</p>
                                <p className="text-xs text-slate-400 font-bold leading-relaxed">
                                    Bildirimler Firebase Cloud Messaging (FCM) üzerinden gönderilir. Gönderilen mesajlar tüm kayıtlı cihazlara (web ve mobil) anında ulaşır.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
