import React from 'react';

const KullanimKosullari: React.FC = () => {
  return (
    <div className="min-h-screen bg-dark text-gray-100 py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-4xl mx-auto space-y-12">
        
        <header className="border-b border-dark-border pb-8">
          <h1 className="text-4xl font-display font-bold text-white mb-2">Kullanım Koşulları</h1>
          <p className="text-gray-400">Son Güncelleme: Şubat 2026</p>
        </header>

        {/* Sorumluluk Reddi */}
        <div className="bg-red-900/20 border border-red-500/50 p-6 rounded-xl flex gap-4 items-start">
          <span className="text-3xl">⚠️</span>
          <div>
            <h3 className="text-lg font-bold text-red-500 mb-1">Sorumluluk Reddi</h3>
            <p className="text-red-200 text-sm leading-relaxed">
              DepremApp bir erken uyarı ve bilgilendirme sistemidir. Ancak, <strong>deprem tahmininde bulunmaz</strong> ve 
              resmi kurumların (AFAD, Kandilli) verilerini kullanır. Uygulamanın sağladığı verilerin kesinliği garanti edilmez 
              ve bu verilere dayanarak alınan hayati kararlardan DepremApp sorumlu tutulamaz.
            </p>
          </div>
        </div>

        <div className="space-y-8">
          {/* Bölümler */}
          <section className="group border-l-4 border-dark-border hover:border-primary pl-6 transition-colors duration-300">
            <h2 className="text-2xl font-display font-semibold text-white mb-4">1. Hizmetin Tanımı</h2>
            <p className="text-gray-300 leading-relaxed">
              DepremApp, kullanıcılara anlık deprem bildirimleri, risk analizi ve acil durum iletişim araçları sunan bir platformdur. 
              Hizmetlerimiz "olduğu gibi" sunulur ve kesintisiz hizmet garantisi verilmez.
            </p>
          </section>

          <section className="group border-l-4 border-dark-border hover:border-primary pl-6 transition-colors duration-300">
            <h2 className="text-2xl font-display font-semibold text-white mb-4">2. Kullanıcı Yükümlülükleri</h2>
            <ul className="list-disc list-inside text-gray-300 space-y-2">
              <li>Uygulamayı yasalara uygun şekilde kullanmak.</li>
              <li>Başkalarının haklarına saygı göstermek.</li>
              <li>"Ben İyiyim" özelliğini gereksiz yere kullanıp panik yaratmamak.</li>
              <li>Hesap güvenliğini sağlamak (şifre paylaşımı yasaktır).</li>
            </ul>
          </section>

          <section className="group border-l-4 border-dark-border hover:border-primary pl-6 transition-colors duration-300">
            <h2 className="text-2xl font-display font-semibold text-white mb-4">3. Premium Hizmetler ve Ödemeler</h2>
            <p className="text-gray-300 leading-relaxed mb-4">
              Bazı özellikler (SMS bildirimi, detaylı risk raporu) ücretli abonelik gerektirir.
              Ödemeler güvenli ödeme altyapısı <strong>Stripe</strong> aracılığıyla işlenir.
            </p>
            <div className="bg-dark-surface p-4 rounded-lg border border-dark-border">
              <h4 className="font-semibold text-white mb-2">İade Politikası</h4>
              <p className="text-sm text-gray-400">
                Dijital hizmet olduğu için, abonelik başlangıcından itibaren 14 gün içinde cayma hakkı saklıdır. 
                Ancak hizmet kullanımı başladıysa iade yapılmayabilir.
              </p>
            </div>
          </section>

          <section className="group border-l-4 border-dark-border hover:border-primary pl-6 transition-colors duration-300">
            <h2 className="text-2xl font-display font-semibold text-white mb-4">4. Fikri Mülkiyet</h2>
            <p className="text-gray-300 leading-relaxed">
              Uygulamanın tasarımı, logosu, kodları ve içeriği DepremApp mülkiyetindedir. İzinsiz kopyalanamaz, 
              çoğaltılamaz veya ticari amaçla kullanılamaz.
            </p>
          </section>

          <section className="group border-l-4 border-dark-border hover:border-primary pl-6 transition-colors duration-300">
            <h2 className="text-2xl font-display font-semibold text-white mb-4">5. Uygulanacak Hukuk</h2>
            <p className="text-gray-300 leading-relaxed">
              Bu sözleşmeden doğan ihtilaflarda <strong>Türkiye Cumhuriyeti</strong> yasaları geçerlidir ve 
              <strong>İstanbul Mahkemeleri</strong> yetkilidir.
            </p>
          </section>
        </div>

        <div className="pt-12 border-t border-dark-border text-center">
          <a href="/" className="text-primary hover:text-white transition-colors">
            ← Ana Sayfaya Dön
          </a>
        </div>

      </div>
    </div>
  );
};

export default KullanimKosullari;
