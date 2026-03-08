import { useState, type FormEvent } from 'react';
import {
    Settings,
    Lock,
    Eye,
    EyeOff,
    CheckCircle2,
    Loader2,
    Shield,
    Server,
    Database
} from 'lucide-react';
import { adminService } from '../../services/api';
import { toast } from 'react-hot-toast';

export default function AdminSettings() {
    // Password Change
    const [passwords, setPasswords] = useState({
        current_password: '',
        new_password: '',
        confirm_password: '',
    });
    const [showPasswords, setShowPasswords] = useState(false);
    const [passwordLoading, setPasswordLoading] = useState(false);

    const handlePasswordChange = async (e: FormEvent) => {
        e.preventDefault();

        if (passwords.new_password.length < 8) {
            toast.error('Yeni şifre en az 8 karakter olmalı');
            return;
        }
        if (passwords.new_password !== passwords.confirm_password) {
            toast.error('Yeni şifreler eşleşmiyor');
            return;
        }

        setPasswordLoading(true);
        try {
            await adminService.changePassword({
                current_password: passwords.current_password,
                new_password: passwords.new_password,
            });
            toast.success('Şifre başarıyla değiştirildi');
            setPasswords({ current_password: '', new_password: '', confirm_password: '' });
        } catch (err: any) {
            const detail = err?.response?.data?.detail || 'Şifre değiştirilemedi';
            toast.error(detail);
        } finally {
            setPasswordLoading(false);
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div>
                <h2 className="text-3xl font-black text-white italic tracking-tighter uppercase">Admin Ayarları</h2>
                <p className="text-slate-400 text-sm">Güvenlik ayarları ve sistem yapılandırması.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Password Change */}
                <div className="bg-dark-surface border border-dark-border rounded-2xl p-6">
                    <h4 className="text-sm font-black text-white uppercase italic tracking-widest mb-6 flex items-center gap-2">
                        <Lock size={16} className="text-amber-500" />
                        Şifre Değiştir
                    </h4>

                    <form onSubmit={handlePasswordChange} className="space-y-5">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Mevcut Şifre</label>
                            <div className="relative">
                                <input
                                    type={showPasswords ? 'text' : 'password'}
                                    value={passwords.current_password}
                                    onChange={(e) => setPasswords({ ...passwords, current_password: e.target.value })}
                                    className="w-full bg-dark border border-dark-border rounded-xl px-4 py-3 pr-12 text-white focus:border-primary outline-none font-bold transition-all"
                                    placeholder="••••••••"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPasswords(!showPasswords)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors"
                                >
                                    {showPasswords ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Yeni Şifre</label>
                            <input
                                type={showPasswords ? 'text' : 'password'}
                                value={passwords.new_password}
                                onChange={(e) => setPasswords({ ...passwords, new_password: e.target.value })}
                                className="w-full bg-dark border border-dark-border rounded-xl px-4 py-3 text-white focus:border-primary outline-none font-bold transition-all"
                                placeholder="En az 8 karakter"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Yeni Şifre (Tekrar)</label>
                            <input
                                type={showPasswords ? 'text' : 'password'}
                                value={passwords.confirm_password}
                                onChange={(e) => setPasswords({ ...passwords, confirm_password: e.target.value })}
                                className="w-full bg-dark border border-dark-border rounded-xl px-4 py-3 text-white focus:border-primary outline-none font-bold transition-all"
                                placeholder="Aynı şifreyi tekrarlayın"
                            />
                            {passwords.new_password && passwords.confirm_password && passwords.new_password !== passwords.confirm_password && (
                                <p className="text-xs text-red-400 font-bold ml-1">Şifreler eşleşmiyor</p>
                            )}
                        </div>

                        <button
                            type="submit"
                            disabled={passwordLoading || !passwords.current_password || !passwords.new_password}
                            className="w-full bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-black py-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-amber-500/20 italic uppercase tracking-tighter"
                        >
                            {passwordLoading ? <Loader2 className="animate-spin" size={20} /> : <Lock size={20} />}
                            {passwordLoading ? 'DEĞİŞTİRİLİYOR...' : 'ŞİFREYİ DEĞİŞTİR'}
                        </button>
                    </form>
                </div>

                {/* System Info */}
                <div className="space-y-6">
                    <div className="bg-dark-surface border border-dark-border rounded-2xl p-6">
                        <h4 className="text-sm font-black text-white uppercase italic tracking-widest mb-6 flex items-center gap-2">
                            <Server size={16} className="text-blue-500" />
                            Sistem Bilgileri
                        </h4>
                        <div className="space-y-4">
                            {[
                                { label: 'Platform', value: 'QuakeSense SaaS', icon: <Shield size={14} className="text-primary" /> },
                                { label: 'API Versiyon', value: 'v1.0.0', icon: <Server size={14} className="text-blue-500" /> },
                                { label: 'Veritabanı', value: 'PostgreSQL + TimescaleDB', icon: <Database size={14} className="text-amber-500" /> },
                            ].map((item, i) => (
                                <div key={i} className="flex items-center justify-between py-3 border-b border-dark-border last:border-0">
                                    <div className="flex items-center gap-3">
                                        {item.icon}
                                        <span className="text-sm font-bold text-slate-400">{item.label}</span>
                                    </div>
                                    <span className="text-sm font-black text-white">{item.value}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="bg-amber-500/5 border border-amber-500/10 rounded-2xl p-5">
                        <div className="flex gap-3">
                            <Shield size={20} className="text-amber-500 shrink-0" />
                            <div className="space-y-1">
                                <p className="text-xs font-black text-white uppercase tracking-widest">Güvenlik</p>
                                <p className="text-xs text-slate-400 font-bold leading-relaxed">
                                    Şifrenizi düzenli olarak değiştirmeniz, güçlü bir şifre kullanmanız ve iki faktörlü kimlik doğrulamayı aktifleştirmeniz önerilir.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
