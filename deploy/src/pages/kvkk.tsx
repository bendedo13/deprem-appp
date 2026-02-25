import { useRouter } from 'next/router';
import Head from 'next/head';

export default function KVKK() {
  const router = useRouter();

  return (
    <>
      <Head>
        <title>Kişisel Verileri Koruma - Deprem App</title>
        <meta name="description" content="Deprem App KVKK Aydınlatma Metni" />
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
          <h2 className="text-4xl font-bold text-gray-800 mb-8">KVKK Aydınlatma Metni</h2>

          <div className="bg-white rounded-lg shadow-lg p-8 space-y-8 text-gray-700">
            <section>
              <h3 className="text-2xl font-bold text-red-600 mb-4">Veri Sorumlusu Bilgileri</h3>
              <p className="mb-2"><strong>Şirket Adı:</strong> Deprem App Türkiye</p>
              <p className="mb-2"><strong>Unvanı:</strong> Deprem Erken Uyarı Hizmetleri A.Ş.</p>
              <p><strong>İletişim:</strong> info@depremapp.com | +90 (312) 555-0000</p>
            </section>

            <section>
              <h3 className="text-2xl font-bold text-red-600 mb-4">Ödül, İmtiyaz ve Hakkın Kullanılması</h3>
              <p className="mb-4">KVKK'nın 11. maddesi uyarınca, kişisel verilerinize ilişkin aşağıdaki hakları kullanabilirsiniz:</p>
              <ul className="space-y-3">
                <li>
                  <strong>Bilgi Talep Hakkı:</strong> Verilerinizin işlenip işlenmediğini öğrenme, işleniyorsa detaylarını talep etme
                </li>
                <li>
                  <strong>Düzeltme Hakkı:</strong> Hatalı veya eksik verilerinizi düzeltme
                </li>
                <li>
                  <strong>Silme Hakkı:</strong> Verilerinizin silinmesini talep etme
                </li>
                <li>
                  <strong>İşlemeyi Durdurma Hakkı:</strong> Verilerinizin işlenmesinin durdurulmasını talep etme
                </li>
                <li>
                  <strong>Veri Portabilite Hakkı:</strong> Verilerinizi yapılandırılmış, yaygın olarak kullanılan, makine tarafından okunabilir formatta alma
                </li>
              </ul>
            </section>

            <section>
              <h3 className="text-2xl font-bold text-red-600 mb-4">Verilerinizin İşlenme Amaçları</h3>
              <ul className="space-y-2 list-disc list-inside">
                <li>Deprem uyarı ve acil bildirim hizmetleri sunmak</li>
                <li>Kullanıcı hesabı yönetimi</li>
                <li>Hizmet kalitesini iyileştirmek</li>
                <li>Yasal yükümlülükleri yerine getirmek</li>
                <li>İstatistiksel ve istatistiksel analiz yapmak</li>
                <li>Güvenlik ve dolandırıcılık tespiti</li>
              </ul>
            </section>

            <section>
              <h3 className="text-2xl font-bold text-red-600 mb-4">Hakkınızı Kullanmak İçin</h3>
              <p className="mb-4">
                Yukarıdaki haklarınızdan herhangi birini kullanmak için aşağıdaki adrese yazılı başvuru yapabilirsiniz:
              </p>
              <div className="bg-gray-100 p-4 rounded">
                <p className="font-mono text-sm">
                  Deprem App Türkiye<br/>
                  Veri Koruma Sorumlusu<br/>
                  Ankara, Türkiye<br/>
                  E-posta: dpo@depremapp.com
                </p>
              </div>
            </section>

            <section>
              <h3 className="text-2xl font-bold text-red-600 mb-4">İtiraz Hakkı</h3>
              <p className="leading-relaxed">
                Kişisel verilerinizin işlenmesine ilişkin olarak meşru menfaatler bakımından itiraz etme hakkınız bulunmaktadır.
                İtiraz halinde verilerinizin işlenmesi durdurulur.
              </p>
            </section>

            <section className="bg-yellow-50 border-l-4 border-yellow-600 p-4">
              <h4 className="font-bold text-yellow-600 mb-2">📋 Başvuru Süreci</h4>
              <p className="text-sm">
                Başvurular 30 gün içinde değerlendirilir. Kimlik doğrulama için belgeler istenebilir.
              </p>
            </section>
          </div>
        </div>
      </div>
    </>
  );
}

---