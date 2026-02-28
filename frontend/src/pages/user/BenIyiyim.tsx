import React, { useState, useEffect, useRef } from 'react';
import { userService } from '../../services/api';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';

type State = 'idle' | 'countdown' | 'sending' | 'sent';

const BenIyiyim: React.FC = () => {
  const [status, setStatus] = useState<State>('idle');
  const [countdown, setCountdown] = useState(3);
  const [contacts, setContacts] = useState<any[]>([]);
  const [includeLocation, setIncludeLocation] = useState(true);
  const [customMessage, setCustomMessage] = useState('');
  const [sendingProgress, setSendingProgress] = useState(0);

  // Refs for intervals
  const countdownRef = useRef<NodeJS.Timeout | null>(null);
  const sendingRef = useRef<NodeJS.Timeout | null>(null);

  const loadContacts = async () => {
    try {
      const data = await userService.getContacts();
      setContacts(data);
    } catch (error) {
      console.error('Kişiler yüklenemedi', error);
    }
  };

  useEffect(() => {
    loadContacts();
    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
      if (sendingRef.current) clearInterval(sendingRef.current);
    };
  }, []);

  const startProcess = () => {
    if (contacts.length === 0) {
      toast.error('Lütfen önce acil durum kişisi ekleyin!');
      return;
    }
    setStatus('countdown');
    setCountdown(3);
    
    countdownRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(countdownRef.current!);
          startSending();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const startSending = async () => {
    setStatus('sending');
    setSendingProgress(0);
    
    // Simulate sending one by one
    let current = 0;
    const total = contacts.length;
    
    sendingRef.current = setInterval(() => {
      current += 1;
      setSendingProgress(current);
      
      if (current >= total) {
        clearInterval(sendingRef.current!);
        completeSending();
      }
    }, 600);
  };

  const completeSending = async () => {
    try {
      await userService.reportSafe({
        include_location: includeLocation,
        custom_message: customMessage,
      });
      setStatus('sent');
      toast.success('Mesajlarınız başarıyla iletildi!');
    } catch (error) {
      toast.error('Gönderim sırasında hata oluştu.');
      setStatus('idle');
    }
  };

  const cancelProcess = () => {
    if (countdownRef.current) clearInterval(countdownRef.current);
    if (sendingRef.current) clearInterval(sendingRef.current);
    setStatus('idle');
    setCountdown(3);
    setSendingProgress(0);
  };

  return (
    <div className="min-h-screen bg-dark text-gray-100 flex flex-col font-sans">
      {/* Header */}
      <header className="p-4 border-b border-dark-border flex justify-between items-center bg-dark/80 backdrop-blur-md sticky top-0 z-10">
        <Link to="/" className="text-gray-400 hover:text-white">← Geri</Link>
        <h1 className="text-xl font-display font-bold text-white">Güvendeyim</h1>
        <div className="w-8" /> {/* Spacer */}
      </header>

      <main className="flex-1 flex flex-col items-center justify-center p-6 relative overflow-hidden">
        
        {/* Son Deprem Bilgisi */}
        {status === 'idle' && (
          <div className="absolute top-6 left-6 right-6 bg-red-900/20 border border-red-500/50 rounded-xl p-4 flex items-center justify-between animate-slideDown">
            <div className="flex items-center gap-3">
              <span className="text-2xl animate-pulse">🔴</span>
              <div>
                <h3 className="font-bold text-red-500">Son Deprem: M4.2</h3>
                <p className="text-xs text-red-300">İstanbul Açıkları - 2 dk önce</p>
              </div>
            </div>
            <Link to="/map" className="text-xs text-red-400 underline">Haritada Gör</Link>
          </div>
        )}

        {/* IDLE STATE */}
        {status === 'idle' && (
          <div className="flex flex-col items-center gap-8 w-full max-w-md animate-fadeIn">
            <button
              onClick={startProcess}
              className="group relative w-48 h-48 rounded-full bg-green-600 flex items-center justify-center shadow-[0_0_40px_rgba(22,163,74,0.3)] transition-all hover:scale-105 hover:bg-green-500 active:scale-95"
            >
              {/* Pulse Rings */}
              <div className="absolute inset-0 rounded-full border-4 border-green-500/30 animate-[ping_1.5s_cubic-bezier(0,0,0.2,1)_infinite]" />
              <div className="absolute inset-[-12px] rounded-full border-4 border-green-500/20 animate-[ping_2s_cubic-bezier(0,0,0.2,1)_infinite_0.5s]" />
              
              <div className="text-center z-10">
                <span className="text-4xl block mb-1">✅</span>
                <span className="text-2xl font-display font-bold text-white tracking-wide group-hover:tracking-wider transition-all">İYİYİM</span>
              </div>
            </button>
            
            <p className="text-gray-400 text-center max-w-xs">
              Butona bastığınızda acil durum kişilerinize konumunuzla birlikte SMS ve bildirim gönderilir.
            </p>

            <div className="w-full space-y-4 bg-dark-surface p-6 rounded-2xl border border-dark-border">
              <div className="flex items-center justify-between">
                <span className="text-white font-medium">📍 Konumumu Ekle</span>
                <button 
                  onClick={() => setIncludeLocation(!includeLocation)}
                  className={`w-12 h-6 rounded-full p-1 transition-colors ${includeLocation ? 'bg-green-500' : 'bg-gray-700'}`}
                >
                  <div className={`w-4 h-4 bg-white rounded-full shadow-md transform transition-transform ${includeLocation ? 'translate-x-6' : 'translate-x-0'}`} />
                </button>
              </div>

              <div className="border-t border-dark-border pt-4">
                <label className="text-sm text-gray-400 block mb-2">Özel Mesaj (Opsiyonel)</label>
                <textarea
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  placeholder="Örn: Evdeyim, güvendeyim."
                  className="w-full bg-dark border border-dark-border rounded-lg p-3 text-white text-sm focus:ring-1 focus:ring-green-500 outline-none resize-none h-20"
                />
              </div>

              <div className="border-t border-dark-border pt-4">
                <p className="text-xs text-gray-500 mb-2">Alıcılar ({contacts.length}):</p>
                <div className="flex -space-x-2 overflow-hidden">
                  {contacts.map((c, i) => (
                    <div key={c.id} className="w-8 h-8 rounded-full bg-dark-surface border border-dark-border flex items-center justify-center text-xs text-gray-400" title={c.name}>
                      {c.name.charAt(0)}
                    </div>
                  ))}
                  {contacts.length === 0 && <span className="text-xs text-red-400">Kişi yok!</span>}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* COUNTDOWN STATE */}
        {status === 'countdown' && (
          <div className="flex flex-col items-center gap-12 animate-fadeIn">
            <div className="relative">
              <svg className="w-64 h-64 transform -rotate-90">
                <circle
                  cx="128"
                  cy="128"
                  r="120"
                  stroke="currentColor"
                  strokeWidth="8"
                  fill="transparent"
                  className="text-gray-800"
                />
                <circle
                  cx="128"
                  cy="128"
                  r="120"
                  stroke="currentColor"
                  strokeWidth="8"
                  fill="transparent"
                  strokeDasharray={2 * Math.PI * 120}
                  strokeDashoffset={2 * Math.PI * 120 * (1 - countdown / 3)}
                  className="text-green-500 transition-all duration-1000 ease-linear"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-8xl font-display font-bold text-white animate-pulse">{countdown}</span>
              </div>
            </div>

            <button
              onClick={cancelProcess}
              className="px-12 py-4 bg-gray-700 text-white font-bold rounded-xl hover:bg-gray-600 transition-colors text-lg"
            >
              İptal Et
            </button>
          </div>
        )}

        {/* SENDING STATE */}
        {status === 'sending' && (
          <div className="w-full max-w-md space-y-6 animate-fadeIn">
            <h2 className="text-2xl font-display font-bold text-center text-white mb-8">Gönderiliyor...</h2>
            
            <div className="space-y-3">
              {contacts.map((contact, index) => (
                <div 
                  key={contact.id}
                  className={`flex items-center justify-between p-4 rounded-xl border transition-all duration-500 ${
                    index < sendingProgress 
                      ? 'bg-green-900/20 border-green-500/50 translate-x-0 opacity-100' 
                      : index === sendingProgress
                        ? 'bg-dark-surface border-primary/50 scale-105 shadow-lg shadow-primary/10'
                        : 'bg-dark-surface border-dark-border opacity-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-dark flex items-center justify-center text-lg">
                      {contact.name.charAt(0)}
                    </div>
                    <span className="font-medium text-white">{contact.name}</span>
                  </div>
                  
                  <div>
                    {index < sendingProgress ? (
                      <span className="text-green-400 font-bold flex items-center gap-1">
                        ✓ <span className="text-xs">İletildi</span>
                      </span>
                    ) : index === sendingProgress ? (
                      <span className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin block" />
                    ) : (
                      <span className="text-gray-600 text-xs">Bekliyor...</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SENT STATE */}
        {status === 'sent' && (
          <div className="flex flex-col items-center gap-8 animate-fadeIn text-center">
            <div className="w-32 h-32 bg-green-500 rounded-full flex items-center justify-center shadow-[0_0_50px_rgba(34,197,94,0.5)] animate-bounce">
              <span className="text-6xl text-white">✓</span>
            </div>
            
            <div className="space-y-2">
              <h2 className="text-3xl font-display font-bold text-white">Gönderildi!</h2>
              <p className="text-gray-400">
                Tüm acil durum kişilerinize mesajınız ve konumunuz başarıyla iletildi.
              </p>
            </div>

            <div className="flex flex-col w-full max-w-xs gap-3 mt-8">
              <button
                onClick={() => { setStatus('idle'); setCountdown(3); }}
                className="w-full py-3 bg-dark-surface border border-dark-border text-white font-bold rounded-xl hover:bg-dark-border transition-colors"
              >
                Tekrar Gönder
              </button>
              <Link
                to="/"
                className="w-full py-3 bg-primary text-white font-bold rounded-xl hover:bg-orange-600 text-center shadow-lg shadow-orange-500/20 transition-colors"
              >
                Dashboard'a Dön
              </Link>
            </div>
          </div>
        )}

      </main>
    </div>
  );
};

export default BenIyiyim;
