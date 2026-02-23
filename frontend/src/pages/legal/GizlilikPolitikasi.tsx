import React, { useEffect, useState } from 'react';

const sections = [
  { id: 'giris', title: 'Giriş' },
  { id: 'toplanan-veriler', title: 'Toplanan Veriler' },
  { id: 'kullanim-amaci', title: 'Kullanım Amacı' },
  { id: 'ucuncu-taraf', title: 'Üçüncü Taraf Hizmetler' },
  { id: 'veri-guvenligi', title: 'Veri Güvenliği' },
  { id: 'kullanici-haklari', title: 'Kullanıcı Hakları (KVKK)' },
  { id: 'cerezler', title: 'Çerezler' },
  { id: 'cocuklar', title: 'Çocukların Gizliliği' },
  { id: 'iletisim', title: 'İletişim' },
];

const GizlilikPolitikasi: React.FC = () => {
  const [activeSection, setActiveSection] = useState('giris');

  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY + 100;

      for (const section of sections) {
        const element = document.getElementById(section.id);
        if (element && element.offsetTop <= scrollPosition && (element.offsetTop + element.offsetHeight) > scrollPosition) {
          setActiveSection(section.id);
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      window.scrollTo({
        top: element.offsetTop - 80,
        behavior: 'smooth',
      });
    }
  };

  return (
    <div className="min-h-screen bg-dark text-gray-100 py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col lg:flex-row gap-12">
          {/* Sidebar */}
          <aside className="lg:w-1/4">
            <div className="sticky top-24 space-y-2">
              <h2 className="text-xl font-display font-bold text-primary mb-4">İçindekiler</h2>
              <nav className="space-y-1">
                {sections.map((section) => (
                  <button
                    key={section.id}
                    onClick={() => scrollToSection(section.id)}
                    className={`block w-full text-left px-4 py-2 rounded-lg text-sm transition-colors ${
                      activeSection === section.id
                        ? 'bg-primary/20 text-primary border-l-4 border-primary'
                        : 'text-gray-400 hover:text-white hover:bg-dark-surface'
                    }`}
                  >
                    {section.title}
                  </button>
                ))}
              </nav>
            </div>
          </aside>

          {/* Content */}
          <main className="lg:w-3/4 space-y-12">
            <header className="border-b border-dark-border pb-8">
              <div className="flex items-center gap-4 mb-4">
                <h1 className="text-4xl font-display font-bold text-white">Gizlilik Politikası</h1>
                <span className="px-3 py-1 bg-green-900/50 border border-green-500/30 text-green-400 text-xs rounded-full font-mono">
                  KVKK UYUMLU
                </span>
              </div>
              <p className="text-gray-400">Son Güncelleme: Şubat 2026</p>
            </header>

            <section id="giris" className="scroll-mt-24">
              <h2 className="text-2xl font-display font-semibold text-white mb-4">1. Giriş</h2>
              <p className="text-gray-300 leading-relaxed">
                DepremApp olarak gizliliğinize önem veriyoruz. Bu politika, kişisel verilerinizin nasıl toplandığını,
                kullanıldığını ve korunduğunu açıklar. Hizmetlerimizi kullanarak bu politikayı kabul etmiş sayılırsınız.
              </p>
            </section>

            <section id="toplanan-veriler" className="scroll-mt-24">
              <h2 className="text-2xl font-display font-semibold text-white mb-4">2. Toplanan Veriler</h2>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-dark-surface p-6 rounded-xl border border-dark-border">
                  <h3 className="text-lg font-semibold text-primary mb-2">Otomatik Toplananlar</h3>
                  <ul className="list-disc list-inside text-gray-400 space-y-1">
                    <li>Cihaz Bilgileri (Model, OS)</li>
                    <li>IP Adresi</li>
                    <li>Konum Verisi (İzin verilirse)</li>
                    <li>Uygulama Kullanım İstatistikleri</li>
                  </ul>
                </div>
                <div className="bg-dark-surface p-6 rounded-xl border border-dark-border">
                  <h3 className="text-lg font-semibold text-primary mb-2">Sizin Sağladıklarınız</h3>
                  <ul className="list-disc list-inside text-gray-400 space-y-1">
                    <li>Ad Soyad</li>
                    <li>E-posta Adresi</li>
                    <li>Telefon Numarası</li>
                    <li>Acil Durum Kişileri</li>
                  </ul>
                </div>
              </div>
            </section>

            <section id="kullanim-amaci" className="scroll-mt-24">
              <h2 className="text-2xl font-display font-semibold text-white mb-4">3. Kullanım Amacı</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { icon: '🔔', text: 'Deprem Bildirimleri' },
                  { icon: '🗺️', text: 'Konum Bazlı Uyarı' },
                  { icon: '📊', text: 'Risk Analizi' },
                  { icon: '🔒', text: 'Hesap Güvenliği' },
                ].map((item, idx) => (
                  <div key={idx} className="bg-dark-surface p-4 rounded-lg text-center border border-dark-border hover:border-primary/50 transition-colors">
                    <div className="text-3xl mb-2">{item.icon}</div>
                    <div className="text-sm text-gray-300">{item.text}</div>
                  </div>
                ))}
              </div>
            </section>

            <section id="ucuncu-taraf" className="scroll-mt-24">
              <h2 className="text-2xl font-display font-semibold text-white mb-4">4. Üçüncü Taraf Hizmetler</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-dark-border text-gray-400 text-sm">
                      <th className="py-3 px-4">Hizmet</th>
                      <th className="py-3 px-4">Amaç</th>
                      <th className="py-3 px-4">Veri Türü</th>
                    </tr>
                  </thead>
                  <tbody className="text-gray-300 text-sm">
                    <tr className="border-b border-dark-border/50">
                      <td className="py-3 px-4 font-medium">Google AdSense / AdMob</td>
                      <td className="py-3 px-4">Reklam Gösterimi</td>
                      <td className="py-3 px-4">Çerezler, Kullanım Verisi</td>
                    </tr>
                    <tr className="border-b border-dark-border/50">
                      <td className="py-3 px-4 font-medium">Firebase FCM</td>
                      <td className="py-3 px-4">Push Bildirimleri</td>
                      <td className="py-3 px-4">Cihaz Token'ı</td>
                    </tr>
                    <tr className="border-b border-dark-border/50">
                      <td className="py-3 px-4 font-medium">Anthropic Claude</td>
                      <td className="py-3 px-4">Yapay Zeka Analizi</td>
                      <td className="py-3 px-4">Anonim Deprem Verisi</td>
                    </tr>
                    <tr className="border-b border-dark-border/50">
                      <td className="py-3 px-4 font-medium">Sentry</td>
                      <td className="py-3 px-4">Hata Takibi</td>
                      <td className="py-3 px-4">Hata Logları</td>
                    </tr>
                    <tr>
                      <td className="py-3 px-4 font-medium">Google Analytics</td>
                      <td className="py-3 px-4">Analitik</td>
                      <td className="py-3 px-4">Kullanım İstatistikleri</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            <section id="veri-guvenligi" className="scroll-mt-24">
              <h2 className="text-2xl font-display font-semibold text-white mb-4">5. Veri Güvenliği</h2>
              <p className="text-gray-300">
                Verileriniz endüstri standardı şifreleme (SSL/TLS) ile korunmaktadır. Hassas bilgiler (şifreler)
                hashlenerek saklanır. Veritabanlarımız güvenlik duvarları arkasında korunmaktadır.
              </p>
            </section>

            <section id="kullanici-haklari" className="scroll-mt-24">
              <h2 className="text-2xl font-display font-semibold text-white mb-4">6. Kullanıcı Hakları (KVKK Madde 11)</h2>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[
                  'Bilgi Talep Etme',
                  'Düzeltme İsteme',
                  'Silme / Yok Etme',
                  'İtiraz Etme',
                  'Aktarma Talep Etme',
                  'Zarar Tazmini',
                ].map((right, idx) => (
                  <div key={idx} className="p-4 bg-dark-surface border border-dark-border rounded-lg text-center hover:bg-dark-border transition-colors">
                    <span className="text-primary font-bold block mb-1">Madde 11.{idx + 1}</span>
                    <span className="text-gray-300 text-sm">{right}</span>
                  </div>
                ))}
              </div>
            </section>

            <section id="iletisim" className="scroll-mt-24">
              <h2 className="text-2xl font-display font-semibold text-white mb-4">9. İletişim</h2>
              <p className="text-gray-300 mb-4">
                Gizlilik politikamızla ilgili sorularınız için:
              </p>
              <a href="mailto:kvkk@depremapp.com" className="inline-flex items-center gap-2 text-primary hover:text-orange-400 font-medium">
                📧 kvkk@depremapp.com
              </a>
            </section>
          </main>
        </div>

        <footer className="mt-24 border-t border-dark-border pt-8 text-center text-gray-500 text-sm">
          <div className="flex justify-center gap-6 mb-4">
            <a href="/kullanim-kosullari" className="hover:text-primary transition-colors">Kullanım Koşulları</a>
            <a href="/cerez-politikasi" className="hover:text-primary transition-colors">Çerez Politikası</a>
          </div>
          <p>&copy; 2026 DepremApp. Tüm hakları saklıdır.</p>
        </footer>
      </div>
    </div>
  );
};

export default GizlilikPolitikasi;
