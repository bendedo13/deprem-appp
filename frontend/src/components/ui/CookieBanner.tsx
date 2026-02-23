import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const CookieBanner: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [showCustomize, setShowCustomize] = useState(false);
  const [preferences, setPreferences] = useState({
    essential: true, // Zorunlu
    analytics: true,
    ads: true,
  });

  useEffect(() => {
    const consent = localStorage.getItem('depremapp_cookie_consent');
    if (!consent) {
      setIsVisible(true);
    }
  }, []);

  const handleAcceptAll = () => {
    localStorage.setItem('depremapp_cookie_consent', JSON.stringify({ essential: true, analytics: true, ads: true }));
    setIsVisible(false);
  };

  const handleRejectAll = () => {
    localStorage.setItem('depremapp_cookie_consent', JSON.stringify({ essential: true, analytics: false, ads: false }));
    setIsVisible(false);
  };

  const handleSavePreferences = () => {
    localStorage.setItem('depremapp_cookie_consent', JSON.stringify(preferences));
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-dark-surface border-t border-dark-border shadow-2xl z-50 p-6 font-sans">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex-1 space-y-2">
          <h3 className="text-lg font-bold text-white font-display">🍪 Çerez Tercihleri</h3>
          <p className="text-gray-300 text-sm leading-relaxed">
            Size daha iyi bir deneyim sunmak için çerezleri kullanıyoruz. Bazıları zorunludur, diğerleri ise
            analiz ve reklam amaçlıdır. Detaylı bilgi için <Link to="/cerez-politikasi" className="text-primary hover:underline">Çerez Politikası</Link>'nı inceleyin.
          </p>
          
          {showCustomize && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4 bg-dark/50 p-4 rounded-lg">
              <label className="flex items-center space-x-2 cursor-not-allowed opacity-70">
                <input type="checkbox" checked disabled className="form-checkbox text-primary rounded bg-dark border-dark-border" />
                <span className="text-white text-sm">Zorunlu (Site İşlevselliği)</span>
              </label>
              <label className="flex items-center space-x-2 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={preferences.analytics} 
                  onChange={(e) => setPreferences({...preferences, analytics: e.target.checked})}
                  className="form-checkbox text-primary rounded bg-dark border-dark-border focus:ring-primary" 
                />
                <span className="text-white text-sm">Analitik (Google Analytics)</span>
              </label>
              <label className="flex items-center space-x-2 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={preferences.ads} 
                  onChange={(e) => setPreferences({...preferences, ads: e.target.checked})}
                  className="form-checkbox text-primary rounded bg-dark border-dark-border focus:ring-primary" 
                />
                <span className="text-white text-sm">Reklam (AdSense)</span>
              </label>
            </div>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          {!showCustomize ? (
            <>
              <button 
                onClick={handleRejectAll}
                className="px-4 py-2 rounded-lg border border-dark-border text-gray-300 hover:bg-dark-border hover:text-white transition-colors text-sm font-medium"
              >
                Reddet
              </button>
              <button 
                onClick={() => setShowCustomize(true)}
                className="px-4 py-2 rounded-lg border border-primary text-primary hover:bg-primary/10 transition-colors text-sm font-medium"
              >
                Özelleştir
              </button>
              <button 
                onClick={handleAcceptAll}
                className="px-6 py-2 rounded-lg bg-primary text-white hover:bg-orange-600 shadow-lg shadow-orange-500/20 transition-all text-sm font-bold"
              >
                Tümünü Kabul Et
              </button>
            </>
          ) : (
            <button 
              onClick={handleSavePreferences}
              className="px-6 py-2 rounded-lg bg-primary text-white hover:bg-orange-600 shadow-lg shadow-orange-500/20 transition-all text-sm font-bold w-full"
            >
              Tercihleri Kaydet
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default CookieBanner;
