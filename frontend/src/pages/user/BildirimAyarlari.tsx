import React, { useState, useEffect } from 'react';
import { userService } from '../../services/api';
import toast from 'react-hot-toast';

// Toggle Switch Component
const ToggleSwitch = ({ checked, onChange, disabled = false }: { checked: boolean, onChange: (val: boolean) => void, disabled?: boolean }) => (
  <button
    type="button"
    disabled={disabled}
    onClick={() => onChange(!checked)}
    className={`w-12 h-6 rounded-full p-1 transition-colors duration-300 focus:outline-none ${
      checked ? 'bg-primary' : 'bg-gray-700'
    } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
  >
    <div
      className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-300 ${
        checked ? 'translate-x-6' : 'translate-x-0'
      }`}
    />
  </button>
);

const BildirimAyarlari: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState({
    min_magnitude: 3.0,
    locations: [] as string[],
    push_enabled: true,
    sms_enabled: false,
    email_enabled: false,
    quiet_hours_enabled: false,
    quiet_start: '22:00',
    quiet_end: '07:00',
    weekly_summary: false,
    aftershock_alerts: false,
  });

  const [newLocation, setNewLocation] = useState('');
  const [showLocationInput, setShowLocationInput] = useState(false);

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    try {
      const data = await userService.getPreferences();
      setSettings(data);
    } catch (error) {
      console.error('Bildirim ayarları yüklenemedi', error);
      // toast.error('Ayarlar yüklenemedi.');
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      await userService.updatePreferences(settings);
      toast.success('Bildirim ayarları kaydedildi!');
    } catch (error) {
      toast.error('Kaydetme başarısız.');
    } finally {
      setLoading(false);
    }
  };

  const addLocation = () => {
    if (newLocation.trim() && !settings.locations.includes(newLocation.trim())) {
      setSettings({
        ...settings,
        locations: [...settings.locations, newLocation.trim()]
      });
      setNewLocation('');
      setShowLocationInput(false);
    }
  };

  const removeLocation = (loc: string) => {
    setSettings({
      ...settings,
      locations: settings.locations.filter(l => l !== loc)
    });
  };

  return (
    <div className="min-h-screen bg-dark text-gray-100 py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-3xl mx-auto space-y-8">
        
        <header className="border-b border-dark-border pb-6">
          <h1 className="text-3xl font-display font-bold text-white mb-2">Bildirim Ayarları</h1>
          <p className="text-gray-400">Hangi depremlerden nasıl haberdar olacağınızı seçin.</p>
        </header>

        {/* Minimum Büyüklük */}
        <div className="bg-dark-surface p-6 rounded-2xl border border-dark-border space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-bold text-white">Minimum Büyüklük</h3>
            <span className="text-4xl font-display font-bold text-primary">{settings.min_magnitude.toFixed(1)}</span>
          </div>
          
          <input
            type="range"
            min="2.0"
            max="7.0"
            step="0.1"
            value={settings.min_magnitude}
            onChange={(e) => setSettings({...settings, min_magnitude: parseFloat(e.target.value)})}
            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-primary"
          />
          
          <div className="flex justify-between text-xs text-gray-500 font-medium px-1">
            <span>2.0 (Hassas)</span>
            <span>4.0 (Orta)</span>
            <span>6.0+ (Acil)</span>
          </div>
          
          <p className="text-sm text-gray-400 bg-dark p-3 rounded-lg border border-dark-border">
            ℹ️ {settings.min_magnitude < 3.0 ? "Çok sık bildirim alabilirsiniz." : settings.min_magnitude > 5.0 ? "Sadece büyük depremleri bildirir." : "Önerilen ayar."}
          </p>
        </div>

        {/* Konumlar */}
        <div className="bg-dark-surface p-6 rounded-2xl border border-dark-border space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-bold text-white">Takip Edilen Konumlar</h3>
            <button 
              onClick={() => setShowLocationInput(!showLocationInput)}
              className="text-primary text-sm font-bold hover:text-orange-400 transition-colors"
            >
              + Konum Ekle
            </button>
          </div>

          {showLocationInput && (
            <div className="flex gap-2 animate-fadeIn">
              <input
                type="text"
                value={newLocation}
                onChange={(e) => setNewLocation(e.target.value)}
                placeholder="Şehir veya İlçe (örn: İstanbul)"
                className="flex-1 bg-dark border border-dark-border rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-primary outline-none"
                onKeyDown={(e) => e.key === 'Enter' && addLocation()}
              />
              <button 
                onClick={addLocation}
                className="bg-primary text-white px-4 py-2 rounded-lg font-bold hover:bg-orange-600 transition-colors"
              >
                Ekle
              </button>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            {settings.locations.length === 0 && <p className="text-gray-500 text-sm italic">Henüz konum eklenmedi. Tüm Türkiye için bildirim alırsınız.</p>}
            {settings.locations.map((loc) => (
              <span key={loc} className="flex items-center gap-2 bg-dark border border-dark-border px-3 py-1 rounded-full text-sm text-gray-300">
                {loc}
                <button onClick={() => removeLocation(loc)} className="text-gray-500 hover:text-red-500 transition-colors">✕</button>
              </span>
            ))}
          </div>
        </div>

        {/* Kanallar */}
        <div className="bg-dark-surface p-6 rounded-2xl border border-dark-border space-y-6">
          <h3 className="text-lg font-bold text-white mb-4">Bildirim Kanalları</h3>
          
          <div className="flex items-center justify-between py-2 border-b border-dark-border/50">
            <div className="flex items-center gap-3">
              <span className="text-2xl">📱</span>
              <div>
                <p className="font-medium text-white">Push Bildirimleri</p>
                <p className="text-xs text-gray-500">Mobil uygulama bildirimleri</p>
              </div>
            </div>
            <ToggleSwitch checked={settings.push_enabled} onChange={(v) => setSettings({...settings, push_enabled: v})} />
          </div>

          <div className="flex items-center justify-between py-2 border-b border-dark-border/50">
            <div className="flex items-center gap-3 opacity-70">
              <span className="text-2xl">💬</span>
              <div>
                <p className="font-medium text-white flex items-center gap-2">
                  SMS Bildirimleri 
                  <span className="bg-yellow-600/20 text-yellow-500 text-[10px] px-2 py-0.5 rounded border border-yellow-600/30">PREMIUM</span>
                </p>
                <p className="text-xs text-gray-500">Acil durumlarda SMS gönderir</p>
              </div>
            </div>
            <ToggleSwitch checked={settings.sms_enabled} onChange={(v) => setSettings({...settings, sms_enabled: v})} /> 
            {/* TODO: Check premium plan and disable if free */}
          </div>

          <div className="flex items-center justify-between py-2">
            <div className="flex items-center gap-3">
              <span className="text-2xl">📧</span>
              <div>
                <p className="font-medium text-white">E-posta Bildirimleri</p>
                <p className="text-xs text-gray-500">Özet ve raporlar için</p>
              </div>
            </div>
            <ToggleSwitch checked={settings.email_enabled} onChange={(v) => setSettings({...settings, email_enabled: v})} />
          </div>
        </div>

        {/* Ek Ayarlar */}
        <div className="bg-dark-surface p-6 rounded-2xl border border-dark-border space-y-6">
          <h3 className="text-lg font-bold text-white mb-4">Ek Ayarlar</h3>

          <div className="flex items-center justify-between py-2">
            <div>
              <p className="font-medium text-white">Artçı Depremler</p>
              <p className="text-xs text-gray-500">Ana deprem sonrası artçıları bildir</p>
            </div>
            <ToggleSwitch checked={settings.aftershock_alerts} onChange={(v) => setSettings({...settings, aftershock_alerts: v})} />
          </div>

          <div className="flex items-center justify-between py-2">
            <div>
              <p className="font-medium text-white">Haftalık Özet</p>
              <p className="text-xs text-gray-500">Her Pazartesi e-posta ile rapor al</p>
            </div>
            <ToggleSwitch checked={settings.weekly_summary} onChange={(v) => setSettings({...settings, weekly_summary: v})} />
          </div>

          <div className="pt-4 border-t border-dark-border">
             <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="font-medium text-white">Sessiz Saatler</p>
                  <p className="text-xs text-gray-500">Bu saatlerde sadece 5.0+ depremler bildirilir</p>
                </div>
                <ToggleSwitch checked={settings.quiet_hours_enabled} onChange={(v) => setSettings({...settings, quiet_hours_enabled: v})} />
             </div>
             
             {settings.quiet_hours_enabled && (
                <div className="flex items-center gap-4 bg-dark p-4 rounded-lg animate-fadeIn">
                    <div className="flex-1">
                        <label className="text-xs text-gray-500 block mb-1">Başlangıç</label>
                        <input 
                            type="time" 
                            value={settings.quiet_start} 
                            onChange={(e) => setSettings({...settings, quiet_start: e.target.value})}
                            className="bg-dark-surface border border-dark-border rounded px-2 py-1 text-white w-full"
                        />
                    </div>
                    <span className="text-gray-500 mt-4">-</span>
                    <div className="flex-1">
                        <label className="text-xs text-gray-500 block mb-1">Bitiş</label>
                        <input 
                            type="time" 
                            value={settings.quiet_end} 
                            onChange={(e) => setSettings({...settings, quiet_end: e.target.value})}
                            className="bg-dark-surface border border-dark-border rounded px-2 py-1 text-white w-full"
                        />
                    </div>
                </div>
             )}
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={loading}
          className="w-full py-4 bg-primary text-white font-bold rounded-xl hover:bg-orange-600 shadow-lg shadow-orange-500/20 transition-all transform hover:scale-[1.01] disabled:opacity-70 disabled:cursor-not-allowed"
        >
          {loading ? 'Kaydediliyor...' : 'Ayarları Kaydet'}
        </button>

      </div>
    </div>
  );
};

export default BildirimAyarlari;
