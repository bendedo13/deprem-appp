import React from 'react';

const CerezPolitikasi: React.FC = () => {
  return (
    <div className="min-h-screen bg-dark text-gray-100 py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-4xl mx-auto space-y-12">
        
        <header className="border-b border-dark-border pb-8">
          <h1 className="text-4xl font-display font-bold text-white mb-2">Çerez Politikası</h1>
          <p className="text-gray-400">Son Güncelleme: Şubat 2026</p>
        </header>

        <section className="space-y-4">
          <h2 className="text-2xl font-display font-semibold text-white">Çerez Nedir?</h2>
          <p className="text-gray-300 leading-relaxed">
            Çerezler (cookies), web sitemizi ziyaret ettiğinizde tarayıcınız tarafından cihazınıza kaydedilen küçük metin dosyalarıdır. 
            Bu dosyalar, site tercihlerinizin hatırlanması, oturumunuzun açık kalması ve size özel içerik sunulması için kullanılır.
          </p>
        </section>

        <section className="space-y-6">
          <h2 className="text-2xl font-display font-semibold text-white">Kullandığımız Çerezler</h2>
          <div className="overflow-x-auto rounded-lg border border-dark-border">
            <table className="w-full text-left border-collapse">
              <thead className="bg-dark-surface text-gray-400 text-sm uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4 border-b border-dark-border">Çerez Adı</th>
                  <th className="py-3 px-4 border-b border-dark-border">Tür</th>
                  <th className="py-3 px-4 border-b border-dark-border">Amaç</th>
                  <th className="py-3 px-4 border-b border-dark-border">Süre</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-border text-gray-300 text-sm">
                <tr className="hover:bg-dark-surface/50 transition-colors">
                  <td className="py-3 px-4 font-mono text-primary">depremapp_session</td>
                  <td className="py-3 px-4"><span className="px-2 py-1 rounded bg-blue-900/30 text-blue-400 text-xs">Zorunlu</span></td>
                  <td className="py-3 px-4">Oturum yönetimi ve kullanıcı girişi</td>
                  <td className="py-3 px-4">Oturum süresince</td>
                </tr>
                <tr className="hover:bg-dark-surface/50 transition-colors">
                  <td className="py-3 px-4 font-mono text-primary">depremapp_cookie_consent</td>
                  <td className="py-3 px-4"><span className="px-2 py-1 rounded bg-blue-900/30 text-blue-400 text-xs">Zorunlu</span></td>
                  <td className="py-3 px-4">Çerez tercihlerinizi hatırlar</td>
                  <td className="py-3 px-4">1 Yıl</td>
                </tr>
                <tr className="hover:bg-dark-surface/50 transition-colors">
                  <td className="py-3 px-4 font-mono text-primary">depremapp_theme</td>
                  <td className="py-3 px-4"><span className="px-2 py-1 rounded bg-purple-900/30 text-purple-400 text-xs">İşlevsel</span></td>
                  <td className="py-3 px-4">Karanlık/Aydınlık mod tercihi</td>
                  <td className="py-3 px-4">1 Yıl</td>
                </tr>
                <tr className="hover:bg-dark-surface/50 transition-colors">
                  <td className="py-3 px-4 font-mono text-primary">depremapp_lang</td>
                  <td className="py-3 px-4"><span className="px-2 py-1 rounded bg-purple-900/30 text-purple-400 text-xs">İşlevsel</span></td>
                  <td className="py-3 px-4">Dil tercihi (TR/EN)</td>
                  <td className="py-3 px-4">1 Yıl</td>
                </tr>
                <tr className="hover:bg-dark-surface/50 transition-colors">
                  <td className="py-3 px-4 font-mono text-primary">_ga, _gid</td>
                  <td className="py-3 px-4"><span className="px-2 py-1 rounded bg-yellow-900/30 text-yellow-400 text-xs">Analitik</span></td>
                  <td className="py-3 px-4">Google Analytics ziyaretçi takibi</td>
                  <td className="py-3 px-4">2 Yıl / 24 Saat</td>
                </tr>
                <tr className="hover:bg-dark-surface/50 transition-colors">
                  <td className="py-3 px-4 font-mono text-primary">__gads</td>
                  <td className="py-3 px-4"><span className="px-2 py-1 rounded bg-green-900/30 text-green-400 text-xs">Reklam</span></td>
                  <td className="py-3 px-4">Google AdSense reklam gösterimi</td>
                  <td className="py-3 px-4">13 Ay</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section className="bg-dark-surface p-8 rounded-xl border border-dark-border">
          <h2 className="text-2xl font-display font-semibold text-white mb-6">Çerezleri Nasıl Yönetebilirim?</h2>
          <p className="text-gray-300 mb-4">
            Tarayıcınızın ayarlarını değiştirerek çerezleri dilediğiniz zaman silebilir veya engelleyebilirsiniz. 
            Aşağıdaki bağlantılardan tarayıcınıza uygun rehbere ulaşabilirsiniz:
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <a href="https://support.google.com/chrome/answer/95647" target="_blank" rel="noopener noreferrer" className="flex items-center justify-center p-4 bg-dark rounded-lg border border-dark-border hover:border-primary hover:text-primary transition-all">
              Chrome
            </a>
            <a href="https://support.mozilla.org/en-US/kb/enhanced-tracking-protection-firefox-desktop" target="_blank" rel="noopener noreferrer" className="flex items-center justify-center p-4 bg-dark rounded-lg border border-dark-border hover:border-primary hover:text-primary transition-all">
              Firefox
            </a>
            <a href="https://support.apple.com/guide/safari/manage-cookies-and-website-data-sfri11471/mac" target="_blank" rel="noopener noreferrer" className="flex items-center justify-center p-4 bg-dark rounded-lg border border-dark-border hover:border-primary hover:text-primary transition-all">
              Safari
            </a>
            <a href="https://support.microsoft.com/en-us/microsoft-edge/delete-cookies-in-microsoft-edge-63947406-40ac-c3b8-57b9-2a946a29ae09" target="_blank" rel="noopener noreferrer" className="flex items-center justify-center p-4 bg-dark rounded-lg border border-dark-border hover:border-primary hover:text-primary transition-all">
              Edge
            </a>
          </div>
        </section>

        <div className="pt-8 border-t border-dark-border text-center">
            <p className="text-gray-400 text-sm">
                Sorularınız için <a href="mailto:kvkk@depremapp.com" className="text-primary hover:underline">kvkk@depremapp.com</a> ile iletişime geçebilirsiniz.
            </p>
        </div>
      </div>
    </div>
  );
};

export default CerezPolitikasi;
