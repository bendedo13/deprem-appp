import { useState } from 'react';
import { Heart, Loader2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { userService } from '../../services/api';
import { useAuthStore } from '../../store/useAuthStore';

/**
 * "Ben İyiyim" (I am Safe) button.
 * Triggers emergency notifications to user's contacts.
 */
export default function SafeButton() {
    const { user, token } = useAuthStore();
    const [loading, setLoading] = useState(false);

    if (!user || !token) return null;

    const handleSafe = async () => {
        if (!window.confirm('Acil durum rehberinizdeki kişilere "Güvendeyim" bildirimi gönderilsin mi?')) {
            return;
        }

        setLoading(true);
        try {
            const response = await userService.reportSafe();
            toast.success(`${response.notified_contacts} kişiye ulaşıldı. Geçmiş olsun.`);
        } catch (error) {
            console.error('Safe report failed:', error);
            toast.error('Bildirim gönderilemedi. Lütfen internetinizi kontrol edin.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-dark-surface border border-emerald-500/20 rounded-2xl p-6 flex flex-col items-center text-center relative overflow-hidden group">
            <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mb-4 transition-transform group-hover:scale-110">
                <Heart className="w-8 h-8 text-emerald-400 fill-emerald-400/20" />
            </div>

            <h3 className="text-lg font-bold text-slate-100 mb-1">Hızlı Bildirim</h3>
            <p className="text-xs text-slate-400 mb-6 max-w-[200px]">
                Deprem anında tek tıkla sevdiklerinize güvende olduğunuzu haber verin.
            </p>

            <button
                onClick={handleSafe}
                disabled={loading}
                className={`w-full py-3 px-6 rounded-xl font-bold flex items-center justify-center gap-2 transition-all 
                    ${loading
                        ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                        : 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/20 active:scale-95'}`}
            >
                {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                    <>
                        <Heart className="w-5 h-5" />
                        BEN İYİYİM
                    </>
                )}
            </button>

            {/* Decorative background element */}
            <div className="absolute -top-10 -right-10 w-24 h-24 bg-emerald-500 rounded-full blur-[60px] opacity-10 group-hover:opacity-20 transition-opacity" />
        </div>
    );
}
