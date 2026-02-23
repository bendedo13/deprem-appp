import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../store/useAuthStore';
import { userService } from '../../services/api';
import toast from 'react-hot-toast';

const EMOJIS = ["👤", "🧑", "👩", "🧔", "👨‍💻", "🦸", "🌍", "🏔️", "🔴"];

const ProfilYonetimi: React.FC = () => {
  const { user, setUser } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'subscription'>('profile');
  const [loading, setLoading] = useState(false);

  // Profile Form State
  const [profileForm, setProfileForm] = useState({
    name: '',
    email: '',
    phone: '',
    avatar: '👤',
  });

  // Password Form State
  const [passwordForm, setPasswordForm] = useState({
    current_password: '',
    new_password: '',
    confirm_password: '',
  });

  useEffect(() => {
    if (user) {
      setProfileForm({
        name: (user as any).name || '',
        email: user.email || '',
        phone: (user as any).phone || '',
        avatar: (user as any).avatar || '👤',
      });
    }
  }, [user]);

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const updatedUser = await userService.updateProfile({
        name: profileForm.name,
        email: profileForm.email,
        phone: profileForm.phone,
        avatar: profileForm.avatar,
      });
      setUser(updatedUser);
      toast.success('Profil başarıyla güncellendi!');
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Güncelleme başarısız.');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordForm.new_password !== passwordForm.confirm_password) {
      toast.error('Yeni şifreler eşleşmiyor.');
      return;
    }
    setLoading(true);
    try {
      await userService.changePassword({
        current_password: passwordForm.current_password,
        new_password: passwordForm.new_password,
      });
      toast.success('Şifre değiştirildi.');
      setPasswordForm({ current_password: '', new_password: '', confirm_password: '' });
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Şifre değiştirilemedi.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (window.confirm('Hesabınızı silmek istediğinize emin misiniz? Bu işlem geri alınamaz!')) {
        try {
            await userService.deleteAccount();
            toast.success('Hesabınız silindi.');
            window.location.href = '/login'; // Logout logic usually
        } catch (error) {
            toast.error('Hesap silinemedi.');
        }
    }
  };

  return (
    <div className="min-h-screen bg-dark text-gray-100 py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Profil Kartı */}
        <div className="bg-dark-surface p-6 rounded-2xl border border-dark-border flex flex-col md:flex-row items-center gap-6">
          <div className="text-6xl bg-dark p-4 rounded-full border-2 border-primary">
            {profileForm.avatar}
          </div>
          <div className="flex-1 text-center md:text-left space-y-2">
            <h1 className="text-3xl font-display font-bold text-white">
              {profileForm.name || 'İsimsiz Kullanıcı'}
            </h1>
            <p className="text-gray-400">{profileForm.email}</p>
            <div className="flex flex-wrap gap-2 justify-center md:justify-start">
              <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${(user as any)?.plan === 'premium' ? 'bg-gradient-to-r from-yellow-600 to-yellow-400 text-black' : 'bg-gray-700 text-gray-300'}`}>
                {(user as any)?.plan === 'premium' ? 'PREMIUM ÜYE' : 'ÜCRETSİZ PLAN'}
              </span>
              <span className="px-3 py-1 rounded-full bg-dark border border-dark-border text-xs text-gray-400">
                Katılım: {new Date((user as any)?.created_at || Date.now()).toLocaleDateString('tr-TR')}
              </span>
            </div>
          </div>
          {(user as any)?.plan !== 'premium' && (
            <button className="px-6 py-3 bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400 text-white font-bold rounded-xl shadow-lg shadow-orange-500/20 transition-all transform hover:scale-105">
              Premium'a Geç 👑
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="flex border-b border-dark-border">
          <button
            onClick={() => setActiveTab('profile')}
            className={`px-6 py-3 font-medium transition-colors border-b-2 ${activeTab === 'profile' ? 'border-primary text-primary' : 'border-transparent text-gray-400 hover:text-white'}`}
          >
            Profil Bilgileri
          </button>
          <button
            onClick={() => setActiveTab('security')}
            className={`px-6 py-3 font-medium transition-colors border-b-2 ${activeTab === 'security' ? 'border-primary text-primary' : 'border-transparent text-gray-400 hover:text-white'}`}
          >
            Güvenlik
          </button>
          <button
            onClick={() => setActiveTab('subscription')}
            className={`px-6 py-3 font-medium transition-colors border-b-2 ${activeTab === 'subscription' ? 'border-primary text-primary' : 'border-transparent text-gray-400 hover:text-white'}`}
          >
            Abonelik
          </button>
        </div>

        {/* Tab Content */}
        <div className="bg-dark-surface p-8 rounded-2xl border border-dark-border">
          
          {/* PROFILE TAB */}
          {activeTab === 'profile' && (
            <form onSubmit={handleProfileUpdate} className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-300">Ad Soyad</label>
                  <input
                    type="text"
                    value={profileForm.name}
                    onChange={(e) => setProfileForm({...profileForm, name: e.target.value})}
                    className="w-full bg-dark border border-dark-border rounded-lg px-4 py-3 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all text-white"
                    placeholder="Adınız Soyadınız"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-300">E-posta Adresi</label>
                  <input
                    type="email"
                    value={profileForm.email}
                    onChange={(e) => setProfileForm({...profileForm, email: e.target.value})}
                    className="w-full bg-dark border border-dark-border rounded-lg px-4 py-3 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all text-white"
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-medium text-gray-300">Telefon Numarası <span className="text-gray-500 text-xs">(Ben İyiyim özelliği için gerekli)</span></label>
                  <input
                    type="tel"
                    value={profileForm.phone}
                    onChange={(e) => setProfileForm({...profileForm, phone: e.target.value})}
                    className="w-full bg-dark border border-dark-border rounded-lg px-4 py-3 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all text-white"
                    placeholder="+90 5XX XXX XX XX"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">Avatar Seçin</label>
                <div className="flex flex-wrap gap-3">
                  {EMOJIS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => setProfileForm({...profileForm, avatar: emoji})}
                      className={`text-2xl w-12 h-12 rounded-lg flex items-center justify-center border-2 transition-all ${profileForm.avatar === emoji ? 'border-primary bg-primary/20 scale-110' : 'border-dark-border bg-dark hover:bg-dark-border'}`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full md:w-auto px-8 py-3 bg-primary text-white font-bold rounded-xl hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-orange-500/20"
                >
                  {loading ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet'}
                </button>
              </div>
            </form>
          )}

          {/* SECURITY TAB */}
          {activeTab === 'security' && (
            <div className="space-y-8">
              <form onSubmit={handlePasswordChange} className="space-y-6 max-w-md">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-300">Mevcut Şifre</label>
                  <input
                    type="password"
                    value={passwordForm.current_password}
                    onChange={(e) => setPasswordForm({...passwordForm, current_password: e.target.value})}
                    className="w-full bg-dark border border-dark-border rounded-lg px-4 py-3 focus:ring-2 focus:ring-primary outline-none text-white"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-300">Yeni Şifre</label>
                  <input
                    type="password"
                    value={passwordForm.new_password}
                    onChange={(e) => setPasswordForm({...passwordForm, new_password: e.target.value})}
                    className="w-full bg-dark border border-dark-border rounded-lg px-4 py-3 focus:ring-2 focus:ring-primary outline-none text-white"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-300">Yeni Şifre (Tekrar)</label>
                  <input
                    type="password"
                    value={passwordForm.confirm_password}
                    onChange={(e) => setPasswordForm({...passwordForm, confirm_password: e.target.value})}
                    className="w-full bg-dark border border-dark-border rounded-lg px-4 py-3 focus:ring-2 focus:ring-primary outline-none text-white"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-3 bg-gray-700 text-white font-medium rounded-xl hover:bg-gray-600 transition-colors"
                >
                  Şifreyi Güncelle
                </button>
              </form>

              <div className="border-t border-dark-border pt-8">
                <div className="border border-red-500/30 bg-red-900/10 rounded-xl p-6">
                  <h3 className="text-red-500 font-bold text-lg mb-2">Tehlikeli Bölge</h3>
                  <p className="text-gray-400 text-sm mb-4">Hesabınızı sildiğinizde tüm verileriniz kalıcı olarak silinir ve geri getirilemez.</p>
                  <button
                    onClick={handleDeleteAccount}
                    className="px-6 py-2 border border-red-500 text-red-500 rounded-lg hover:bg-red-500 hover:text-white transition-all font-medium"
                  >
                    Hesabımı Sil
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* SUBSCRIPTION TAB */}
          {activeTab === 'subscription' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold text-white">Mevcut Plan: <span className="text-primary uppercase">{(user as any)?.plan || 'Free'}</span></h3>
              </div>
              
              <div className="grid md:grid-cols-2 gap-4">
                 <div className="space-y-3">
                    <h4 className="font-medium text-gray-400">Ücretsiz Özellikler</h4>
                    <ul className="space-y-2">
                        <li className="flex items-center text-green-400 text-sm">✓ <span className="text-gray-300 ml-2">Anlık Deprem Bildirimleri</span></li>
                        <li className="flex items-center text-green-400 text-sm">✓ <span className="text-gray-300 ml-2">Canlı Harita</span></li>
                        <li className="flex items-center text-green-400 text-sm">✓ <span className="text-gray-300 ml-2">Ben İyiyim Özelliği</span></li>
                    </ul>
                 </div>
                 <div className="space-y-3">
                    <h4 className="font-medium text-gray-400">Premium Özellikler</h4>
                    <ul className="space-y-2">
                        <li className={`flex items-center text-sm ${(user as any)?.plan === 'premium' ? 'text-green-400' : 'text-gray-600'}`}>
                            {(user as any)?.plan === 'premium' ? '✓' : '✗'} <span className={`ml-2 ${(user as any)?.plan === 'premium' ? 'text-gray-300' : 'text-gray-600'}`}>SMS Bildirimleri</span>
                        </li>
                        <li className={`flex items-center text-sm ${(user as any)?.plan === 'premium' ? 'text-green-400' : 'text-gray-600'}`}>
                            {(user as any)?.plan === 'premium' ? '✓' : '✗'} <span className={`ml-2 ${(user as any)?.plan === 'premium' ? 'text-gray-300' : 'text-gray-600'}`}>Detaylı Risk Raporu</span>
                        </li>
                        <li className={`flex items-center text-sm ${(user as any)?.plan === 'premium' ? 'text-green-400' : 'text-gray-600'}`}>
                            {(user as any)?.plan === 'premium' ? '✓' : '✗'} <span className={`ml-2 ${(user as any)?.plan === 'premium' ? 'text-gray-300' : 'text-gray-600'}`}>Reklamsız Deneyim</span>
                        </li>
                    </ul>
                 </div>
              </div>

              {(user as any)?.plan !== 'premium' && (
                  <div className="mt-8 p-6 bg-gradient-to-r from-dark to-dark-surface rounded-xl border border-primary/30 text-center">
                      <h3 className="text-2xl font-display font-bold text-white mb-2">Premium'a Yükselt</h3>
                      <p className="text-gray-400 mb-6">Sadece ₺49/ay ile tüm özelliklere erişin ve ailenizi güvende tutun.</p>
                      <button className="px-8 py-3 bg-primary text-white font-bold rounded-xl hover:bg-orange-600 shadow-lg shadow-orange-500/30 transition-all transform hover:-translate-y-1">
                          Hemen Yükselt
                      </button>
                  </div>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default ProfilYonetimi;
