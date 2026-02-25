import { useRouter } from 'next/router';
import Head from 'next/head';

export default function Privacy() {
  const router = useRouter();

  return (
    <>
      <Head>
        <title>Gizlilik Politikası - Deprem App</title>
        <meta name="description" content="Deprem App Türkiye gizlilik politikası" />
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
          <h2 className="text-4xl font-bold text-gray-800 mb-8">Gizlilik Politikası</h2>

          <div className="bg-white rounded-lg shadow-lg p-8 space-y-8 text-gray-700">
            <section>
              <h3 className="text-2xl font-bold text-red-600 mb-4">1. Giriş</h3>
              <p className="leading-relaxed">
                Deprem App ("Biz", "Bizim" veya "Şirket") kişisel verilerinizin gizliliğini önemsemektedir.
                Bu Gizlilik Politikası, uygulamayı kullanırken verilerinizin nasıl toplandığını, 
                kullanıldığını ve korunduğunu açıklamaktadır.
              </p>
            </section>

            <section>
              <h3 className="text-2xl font-bold text-red-600 mb-4">2. Toplanan Bilgiler</h3>
              <p className="mb-4">Aşağıdaki bilgileri toplayabiliriz:</p>
              <ul className="space-y-2 list-disc list-inside">
                <li>Ad, e-posta adresi, telefon numarası</li>
                <li>Konum verileri (deprem uyarıları için)</li>
                <li>Kullanım verileri ve uygulama davranışı</li>
                <li>Cihaz bilgileri (model, işletim sistemi)</li>
                <li>IP adresi ve log verileri</li>
              </ul>
            </section>

            <section>
              <h3 className="text-2xl font-bold text-red-600 mb-4">3. Verilerin Kullanımı</h3>
              <p className="mb-4">Verileriniz aşağıdaki amaçlar için kullanılır:</p>
              <ul className="space-y-2 list-disc list-inside">
                <li>Deprem uyarıları ve acil bildirimleri göndermek</li>
                <li>Hizmetleri geliştirmek ve iyileştirmek</li>
                <li>Kullanıcı deneyimini kişiselleştirmek</li>
                <li>Teknik sorunları çözmek</li>
                <li>Yasal yükümlülükleri yerine getirmek</li>
              </ul>
            </section>

            <section>
              <h3 className="text-2xl font-bold text-red-600 mb-4">4. Veri Güvenliği</h3>
              <p className="leading-relaxed mb-4">
                Verilerinizin korunması için endüstri standardı güvenlik ölçüleri uygularız:
              </p>
              <ul className="space-y-2 list-disc list-inside">
                <li>SSL/TLS şifrelemesi</li>
                <li>Güvenli veritabanı yönetimi</li>
                <li>Erişim kontrolleri</li>
                <li>Düzenli güvenlik denetimleri</li>
              </ul>
            </section>

            <section>
              <h3 className="text-2xl font-bold text-red-600 mb-4">5. Çerezler</h3>
              <p className="leading-relaxed">
                Uygulamayı iyileştirmek için çerezler kullanabiliriz. Çerezleri ayarlarınızdan devre dışı bırakabilirsiniz.
              </p>
            </section>

            <section>
              <h3 className="text-2xl font-bold text-red-600 mb-4">6. Üçüncü Taraf Paylaşımı</h3>
              <p className="leading-relaxed">
                Verileriniz hiçbir zaman izniniz olmadan üçüncü tarafa satılmaz. Sadece hizmet sağlayıcılarla 
                (harita servisleri, analitik) sınırlı şekilde paylaşılır.
              </p>
            </section>

            <section>
              <h3 className="text-2xl font-bold text-red-600 mb-4">7. Kullanıcı Hakları</h3>
              <p className="mb-4">Aşağıdaki haklara sahipsiniz:</p>
              <ul className="space-y-2 list-disc list-inside">
                <li>Verilerinize erişim talep etme</li>
                <li>Hatalı verileri düzeltme</li>
                <li>Verilerin silinmesini talep etme</li>
                <li>Verilerinizi indirme</li>
              </ul>
            </section>

            <section>
              <h3 className="text-2xl font-bold text-red-600 mb-4">8. İletişim</h3>
              <p className="leading-relaxed">
                Gizlilik hakkında sorularınız için: privacy@depremapp.com
              </p>
            </section>

            <section className="bg-blue-50 border-l-4 border-blue-600 p-4 text-sm">
              <p>Son Güncellenme: 2024</p>
            </section>
          </div>
        </div>
      </div>
    </>
  );
}

---