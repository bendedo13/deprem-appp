import React, { useEffect, useState } from 'react';
import { userService } from '../services/api';
import { toast } from 'react-hot-toast';
import {
    User,
    Bell,
    Users,
    Save,
    Plus,
    Trash2,
    Shield,
    Phone,
    Mail,
    Smartphone
} from 'lucide-react';

/**
 * Settings page for user profile, notification preferences, and emergency contacts.
 */
export default function Settings() {
    const [loading, setLoading] = useState(false);
    const [contacts, setContacts] = useState<any[]>([]);
    const [prefs, setPrefs] = useState<any>(null);
    const [newContact, setNewContact] = useState({ name: '', phone: '', email: '', channel: 'sms' });

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            const [contactsData, prefsData] = await Promise.all([
                userService.getContacts(),
                userService.getPreferences()
            ]);
            setContacts(contactsData);
            setPrefs(prefsData);
        } catch (error) {
            toast.error('Ayarlar yüklenemedi.');
        }
    };

    const handleUpdatePrefs = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const updated = await userService.updatePreferences(prefs);
            setPrefs(updated);
            toast.success('Bildirim tercihleri güncellendi.');
        } catch (error) {
            toast.error('Güncelleme başarısız.');
        } finally {
            setLoading(false);
        }
    };

    const handleAddContact = async (e: React.FormEvent) => {
        e.preventDefault();
        if (contacts.length >= 5) {
            toast.error('En fazla 5 acil kişi eklenebilir.');
            return;
        }
        try {
            const added = await userService.addContact(newContact);
            setContacts([...contacts, added]);
            setNewContact({ name: '', phone: '', email: '', channel: 'sms' });
            toast.success('Kişi eklendi.');
        } catch (error: any) {
            toast.error(error.response?.data?.detail || 'Kişi eklenemedi.');
        }
    };

    const handleDeleteContact = async (id: number) => {
        if (!window.confirm('Bu kişiyi silmek istediğinize emin misiniz?')) return;
        try {
            await userService.deleteContact(id);
            setContacts(contacts.filter(c => c.id !== id));
            toast.success('Kişi silindi.');
        } catch (error) {
            toast.error('Silme işlemi başarısız.');
        }
    };

    return (
        <div className="max-w-4xl mx-auto p-4 sm:p-8">
            <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 bg-primary/20 rounded-2xl flex items-center justify-center text-primary">
                    <Shield className="w-6 h-6" />
                </div>
                <div>
                    <h1 className="text-3xl font-black text-slate-100 italic uppercase">Hesap Ayarları</h1>
                    <p className="text-sm text-slate-500">Güvenlik, bildirim ve acil durum tercihlerini yönetin</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Navigation - Sidebar style on desktop */}
                <div className="md:col-span-1 space-y-2">
                    <button className="w-full flex items-center gap-3 p-4 rounded-xl bg-dark-surface border border-primary/30 text-primary font-bold transition-all shadow-lg shadow-primary/5">
                        <User className="w-5 h-5" />
                        Profil & Bildirimler
                    </button>
                    <button className="w-full flex items-center gap-3 p-4 rounded-xl hover:bg-dark-surface text-slate-400 hover:text-slate-100 transition-all group">
                        <Users className="w-5 h-5 group-hover:text-primary" />
                        Acil Durum Rehberi
                    </button>
                    <button className="w-full flex items-center gap-3 p-4 rounded-xl hover:bg-dark-surface text-slate-400 hover:text-slate-100 transition-all group">
                        <Smartphone className="w-5 h-5 group-hover:text-primary" />
                        Cihaz Yönetimi
                    </button>
                </div>

                {/* Content Area */}
                <div className="md:col-span-2 space-y-8">

                    {/* Notification Preferences */}
                    <section className="bg-dark-surface border border-dark-border rounded-2xl overflow-hidden shadow-xl">
                        <div className="p-6 border-b border-dark-border flex items-center gap-3">
                            <Bell className="w-5 h-5 text-primary" />
                            <h2 className="font-bold text-slate-100">Bildirim Tercihleri</h2>
                        </div>
                        <div className="p-6 space-y-6">
                            {prefs && (
                                <form onSubmit={handleUpdatePrefs} className="space-y-6">
                                    <div className="flex items-center justify-between p-4 bg-dark rounded-xl border border-dark-border">
                                        <div>
                                            <div className="font-bold text-slate-200">Push Bildirimleri</div>
                                            <div className="text-xs text-slate-500">Deprem uyarılarını anlık olarak al</div>
                                        </div>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input
                                                type="checkbox"
                                                className="sr-only peer"
                                                checked={prefs.is_enabled}
                                                onChange={(e) => setPrefs({ ...prefs, is_enabled: e.target.checked })}
                                            />
                                            <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                                        </label>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-slate-500 uppercase">Min. Büyüklük</label>
                                            <select
                                                value={prefs.min_magnitude}
                                                onChange={(e) => setPrefs({ ...prefs, min_magnitude: parseFloat(e.target.value) })}
                                                className="w-full bg-dark border border-dark-border rounded-xl px-4 py-3 text-slate-200 outline-none focus:border-primary transition-colors"
                                            >
                                                {[1, 2, 3, 4, 5, 6].map(v => (
                                                    <option key={v} value={v}>{v}.0 ve üzeri</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-slate-500 uppercase">Yarıçap (km)</label>
                                            <select
                                                value={prefs.radius_km}
                                                onChange={(e) => setPrefs({ ...prefs, radius_km: parseInt(e.target.value) })}
                                                className="w-full bg-dark border border-dark-border rounded-xl px-4 py-3 text-slate-200 outline-none focus:border-primary transition-colors"
                                            >
                                                {[50, 100, 200, 500, 1000].map(v => (
                                                    <option key={v} value={v}>{v} km çevrem</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="w-full py-3 bg-primary hover:bg-primary-dark text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-primary/20"
                                    >
                                        <Save className="w-4 h-4" />
                                        AYARLARI KAYDET
                                    </button>
                                </form>
                            )}
                        </div>
                    </section>

                    {/* Emergency Contacts */}
                    <section className="bg-dark-surface border border-dark-border rounded-2xl overflow-hidden shadow-xl">
                        <div className="p-6 border-b border-dark-border flex items-center gap-3">
                            <Users className="w-5 h-5 text-primary" />
                            <h2 className="font-bold text-slate-100">Acil Durum Rehberim</h2>
                        </div>
                        <div className="p-6 space-y-6">
                            <div className="space-y-3">
                                {contacts.map((c) => (
                                    <div key={c.id} className="flex items-center justify-between p-4 bg-dark rounded-xl border border-dark-border group">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center font-bold text-slate-400 capitalize">
                                                {c.name[0]}
                                            </div>
                                            <div>
                                                <div className="font-bold text-slate-200">{c.name}</div>
                                                <div className="text-xs text-slate-500 flex items-center gap-2">
                                                    <Phone className="w-3 h-3" /> {c.phone}
                                                    <span className="w-1 h-1 rounded-full bg-slate-700"></span>
                                                    <Mail className="w-3 h-3" /> {c.email}
                                                </div>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => handleDeleteContact(c.id)}
                                            className="p-2 text-slate-600 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                        >
                                            <Trash2 className="w-5 h-5" />
                                        </button>
                                    </div>
                                ))}

                                {contacts.length === 0 && (
                                    <div className="text-center py-8 text-slate-500 text-sm">
                                        Henüz acil iletişim kişisi eklemediniz.
                                    </div>
                                )}
                            </div>

                            {/* Add Contact Form */}
                            {contacts.length < 5 && (
                                <form onSubmit={handleAddContact} className="pt-4 border-t border-dark-border space-y-4">
                                    <div className="text-xs font-black text-slate-500 uppercase">YENİ KİŞİ EKLE</div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <input
                                            placeholder="İsim Soyisim"
                                            value={newContact.name}
                                            onChange={(e) => setNewContact({ ...newContact, name: e.target.value })}
                                            className="bg-dark border border-dark-border rounded-xl px-4 py-2 text-sm text-slate-200 outline-none focus:border-primary"
                                            required
                                        />
                                        <input
                                            placeholder="Telefon"
                                            value={newContact.phone}
                                            onChange={(e) => setNewContact({ ...newContact, phone: e.target.value })}
                                            className="bg-dark border border-dark-border rounded-xl px-4 py-2 text-sm text-slate-200 outline-none focus:border-primary"
                                            required
                                        />
                                        <input
                                            type="email"
                                            placeholder="E-posta"
                                            value={newContact.email}
                                            onChange={(e) => setNewContact({ ...newContact, email: e.target.value })}
                                            className="bg-dark border border-dark-border rounded-xl px-4 py-2 text-sm text-slate-200 outline-none focus:border-primary"
                                            required
                                        />
                                        <select
                                            value={newContact.channel}
                                            onChange={(e) => setNewContact({ ...newContact, channel: e.target.value })}
                                            className="bg-dark border border-dark-border rounded-xl px-4 py-2 text-sm text-slate-200 outline-none focus:border-primary"
                                        >
                                            <option value="sms">SMS ile Bildir</option>
                                            <option value="email">E-posta ile Bildir</option>
                                            <option value="both">Her İkisi</option>
                                        </select>
                                    </div>
                                    <button
                                        type="submit"
                                        className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl flex items-center justify-center gap-2 transition-all"
                                    >
                                        <Plus className="w-4 h-4" />
                                        KİŞİ EKLE
                                    </button>
                                </form>
                            )}
                        </div>
                    </section>

                </div>
            </div>
        </div>
    );
}
