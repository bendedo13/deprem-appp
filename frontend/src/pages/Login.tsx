import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { ShieldCheck, Mail, Lock, Loader2 } from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const { login, loading } = useAuthStore();
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await login({ email, password });
            toast.success('Giriş başarılı');
            navigate('/');
        } catch (error) {
            toast.error('E-posta veya şifre hatalı');
        }
    };

    return (
        <div className="min-h-[80vh] flex items-center justify-center p-4">
            <div className="bg-dark-surface border border-dark-border w-full max-w-md p-8 rounded-3xl shadow-2xl space-y-8">
                <div className="text-center space-y-2">
                    <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mx-auto shadow-lg shadow-primary/20">
                        <ShieldCheck className="text-white" size={32} />
                    </div>
                    <h2 className="text-2xl font-black text-white italic tracking-tighter uppercase">Hoş Geldiniz</h2>
                    <p className="text-slate-400 text-sm">QuakeSense hesabınıza giriş yapın</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">E-Posta</label>
                        <div className="relative">
                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                            <input
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full bg-dark border border-dark-border rounded-xl pl-12 pr-4 py-3 text-white focus:border-primary outline-none font-bold transition-all"
                                placeholder="ornek@email.com"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Şifre</label>
                        <div className="relative">
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                            <input
                                type="password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full bg-dark border border-dark-border rounded-xl pl-12 pr-4 py-3 text-white focus:border-primary outline-none font-bold transition-all"
                                placeholder="••••••••"
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-primary hover:bg-red-600 disabled:opacity-50 text-white font-black py-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-primary/20 italic uppercase tracking-tighter"
                    >
                        {loading ? <Loader2 className="animate-spin" size={20} /> : 'GİRİŞ YAP'}
                    </button>
                </form>

                <p className="text-center text-xs text-slate-500 font-bold">
                    Hesabınız yok mu? <span className="text-primary hover:underline cursor-pointer">Kayıt Ol</span>
                </p>
            </div>
        </div>
    );
}
