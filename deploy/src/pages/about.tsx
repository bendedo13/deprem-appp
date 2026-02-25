import { useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';

export default function About() {
  const router = useRouter();

  return (
    <>
      <Head>
        <title>Hakkında - Deprem App</title>
        <meta name="description" content="Deprem App Türkiye hakkında bilgi" />
      </Head>
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
        <nav className="bg-white shadow-md">
          <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
            <h1 className="text-2xl font-bold text-red-600">Deprem App</h1>
            <button
              onClick={() => router.push('/')}
              className="px-4 py-2 text-gray-700 hover:text-red-600 transition"
            >
              Ana Sayfa
            </button>
          </div>
        </nav>

        <div className="max-w-4xl mx-auto px-4 py-12">
          <h2 className="text-4xl font-bold text-gray-800 mb-8">Hakkında</h2>

          <div className="bg-white rounded-lg shadow-lg p-8 space-y-8">
            <section>
              <h3 className="text-2xl font-bold text-red-600 mb-4">Misyonumuz</h3>
              <p className="text-gray-700 leading-relaxed">
                Deprem App Türkiye, hayat kurtaran erken uyarı platformudur. 
                Deprem felaketi anında hızlı bilgi ve koordinasyon sağlayarak 
                can kayıplarını minimize etmeyi amaçlayan bir mobil uygulamadır.
              </p>
            </section>

            <section>
              <h3 className="text-2xl font-bold text-red-600 mb-4">Önemli Özellikler</h3>
              <ul className="space-y-3 text-gray-700">
                <li className="flex items-start">
                  <span className="text-red-600 font-bold mr-3">•</span>
                  <span><strong>Erken Uyarı:</strong> Deprem anında anında bildirim alın</span>
                </li>
                <li className="flex items-start">
                  <span className="text-red-600 font-bold mr-3">•</span>
                  <span><strong>Enkaz SOS:</strong> Enkazda mahsur kalan kişilerin konumunu bildirme</span>
                </li>
                <li className="flex items-start">
                  <span className="text-red-600 font-bold mr-3">•</span>
                  <span><strong>Acil Durum Bildirim:</strong> Güvenilir kişilere otomatik bildirim</span>
                </li>
                <li className="flex items-start">
                  <span className="text-red-600 font-bold mr-3">•</span>
                  <span><strong>Canlı Harita:</strong> Deprem epicenterini gerçek zamanlı takip edin</span>
                </li>
                <li className="flex items-start">
                  <span className="text-red-600 font-bold mr-3">•</span>
                  <span><strong>İstatistikler:</strong> AFAD ve USGS verilerine dayalı rapor</span>
                </li>
              </ul>
            </section>

            <section>
              <h3 className="text-2xl font-bold text-red-600 mb-4">Veri Kaynakları</h3>
              <p className="text-gray-700 mb-4">
                Deprem verilerimiz güvenilir kaynaklardan alınmaktadır:
              </p>
              <ul className="space-y-2 text-gray-700">
                <li>• <strong>AFAD</strong> - Türkiye Cumhuriyet Afet ve Acil Durum Yönetimi Başkanlığı</li>
                <li>• <strong>USGS</strong> - Amerika Jeolojik Araştırmalar Enstitüsü</li>
                <li>• <strong>IPGP</strong> - Paris Institut de Physique du Globe</li>
              </ul>
            </section>

            <section>
              <h3 className="text-2xl font-bold text-red-600 mb-4">İletişim</h3>
              <p className="text-gray-700">
                <strong>E-posta:</strong> info@depremapp.com<br/>
                <strong>Telefon:</strong> +90 (312) 555-0000
              </p>
            </section>

            <section className="bg-red-50 border-l-4 border-red-600 p-4">
              <h4 className="font-bold text-red-600 mb-2">⚠️ Önemli Not</h4>
              <p className="text-gray-700 text-sm">
                Bu uygulama resmi AFAD sistemi ile değildir. Ek güvenlik ölçüsü olarak kullanılmalıdır.
                Tüm deprem verileri bilgilendirme amaçlıdır. Acil durumlarda 112 arayınız.
              </p>
            </section>
          </div>
        </div>
      </div>
    </>
  );
}

---