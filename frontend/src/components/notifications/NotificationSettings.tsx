import React, { useState, useEffect } from 'react';
import { Bell, Shield, MapPin, Save, RefreshCw } from 'lucide-react';
import { earthquakeService } from '../../services/api';
import { toast } from 'react-hot-toast';

interface Props {
    onClose?: () => void;
}

export default function NotificationSettings({ onClose }: Props) {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [prefs, setPrefs] = useState({
        min_magnitude: 3.0,
        radius_km: 500,
        is_enabled: true
    });

    useEffect(() => {
        const fetchPrefs = async () => {
            try {
                const data = await earthquakeService.getNotificationPrefs();
                setPrefs(data);
            } catch (error) {
                console.error('Failed to fetch prefs:', error);
                toast.error('Ayarlar yüklenemedi.');
            } finally {
                setLoading(false);
            }
        };
        fetchPrefs();
    }, []);

    const handleSave = async () => {
        setSaving(true);
        try {
            await earthquakeService.updateNotificationPrefs(prefs);
            toast.success('Bildirim tercihleri kaydedildi.');
            if (onClose) onClose();
        } catch (error) {
            console.error('Save failed:', error);
            toast.error('Kaydedilirken bir hata oluştu.');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center p-12">
                <RefreshCw className="animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="bg-dark-surface/80 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-2xl space-y-6">
            <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-primary/20 rounded-lg">
                    <Bell className="text-primary w-5 h-5" />
                </div>
                <h3 className="text-xl font-bold text-white tracking-tight">Bildirim Ayarları</h3>
            </div>

            <div className="space-y-4">
                {/* Enabled Toggle */}
                <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/5">
                    <div>
                        <div className="font-bold text-slate-200">Push Bildirimleri</div>
                        <div className="text-xs text-slate-500">Önemli depremlerde anlık uyarı al.</div>
                    </div>
                    <button
                        onClick={() => setPrefs({ ...prefs, is_enabled: !prefs.is_enabled })}
                        className={`w-12 h-6 rounded-full transition-colors relative ${prefs.is_enabled ? 'bg-primary' : 'bg-slate-700'}`}
                    >
                        <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${prefs.is_enabled ? 'translate-x-6' : ''}`} />
                    </button>
                </div>

                {/* Magnitude Slider */}
                <div className="p-4 bg-white/5 rounded-xl border border-white/5 space-y-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-sm font-bold text-slate-300">
                            <Shield className="w-4 h-4 text-primary" />
                            Minimum Şiddet (M)
                        </div>
                        <span className="text-primary font-black">M{prefs.min_magnitude.toFixed(1)}</span>
                    </div>
                    <input
                        type="range"
                        min="2.0"
                        max="8.0"
                        step="0.5"
                        value={prefs.min_magnitude}
                        onChange={(e) => setPrefs({ ...prefs, min_magnitude: parseFloat(e.target.value) })}
                        className="w-full accent-primary bg-dark h-1.5 rounded-lg appearance-none cursor-pointer"
                    />
                    <div className="flex justify-between text-[10px] text-slate-500 font-bold uppercase">
                        <span>2.0 (Hepsini Al)</span>
                        <span>8.0 (Sadece Çok Büyükler)</span>
                    </div>
                </div>

                {/* Radius Slider */}
                <div className="p-4 bg-white/5 rounded-xl border border-white/5 space-y-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-sm font-bold text-slate-300">
                            <MapPin className="w-4 h-4 text-blue-400" />
                            Bildirim Yarıçapı
                        </div>
                        <span className="text-blue-400 font-black">{prefs.radius_km} km</span>
                    </div>
                    <input
                        type="range"
                        min="50"
                        max="2000"
                        step="50"
                        value={prefs.radius_km}
                        onChange={(e) => setPrefs({ ...prefs, radius_km: parseInt(e.target.value) })}
                        className="w-full accent-blue-400 bg-dark h-1.5 rounded-lg appearance-none cursor-pointer"
                    />
                    <div className="flex justify-between text-[10px] text-slate-500 font-bold uppercase">
                        <span>50 km (Yakınındakiler)</span>
                        <span>2000 km (Tüm Ülke)</span>
                    </div>
                </div>
            </div>

            <div className="pt-4 flex gap-3">
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex-1 bg-primary hover:bg-primary-hover text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-primary/20 transition-all active:scale-95 disabled:opacity-50"
                >
                    {saving ? <RefreshCw className="animate-spin w-5 h-5" /> : <Save className="w-5 h-5" />}
                    Ayarları Kaydet
                </button>
                {onClose && (
                    <button
                        onClick={onClose}
                        className="px-6 border border-white/10 hover:bg-white/5 text-slate-400 font-bold rounded-xl transition-all"
                    >
                        Kapat
                    </button>
                )}
            </div>
        </div>
    );
}
