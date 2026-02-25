import { useRouter } from 'next/router';
import Head from 'next/head';

export default function Terms() {
  const router = useRouter();

  return (
    <>
      <Head>
        <title>Kullanım Şartları - Deprem App</title>
        <meta name="description" content="Deprem App Türkiye kullanım şartları" />
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
          <h2 className="text-4xl font-bold text-gray-800 mb-8">Kullanım Şartları</h2>

          <div className="bg-white rounded-lg shadow-lg p-8 space-y-8 text-gray-700">
            <section>
              <h3 className="text-2xl font-bold text-red-600 mb-4">1. Kabul ve Bağlayıcılık</h3>
              <p className="leading-relaxed">
                Bu uygulamayı kullanarak, tüm kullanım şartlarını kabul etmiş sayılırsınız. 
                Bu şartları kabul etmiyorsanız, lütfen uygulamayı kullanmayınız.
              </p>
            </section>

            <section>
              <h3 className="text-2xl font-bold text-red-600 mb-4">2. Hizmetin Açıklaması</h3>
              <p className="leading-relaxed">
                Deprem App, deprem erken uyarı, canlı harita, enkaz SOS ve acil bildirim hizmetleri sağlayan 
                bir mobil uygulamadır. Hizmet Türkiye'de deprem faaliyetini izlemek amacıyla tasarlanmıştır.
              </p>
            </section>

            <section>
              <h3 className="text-2xl font-bold text-red-600 mb-4">3. Kullanıcı Sorumluluğu</h3>
              <ul className="space-y-3 list-disc list-inside">
                <li>Hesabınız bilgilerini gizli tutmaktan sorumlusunuz</li>
                <li>Hesabınız üzerindeki tüm aktiviteden sorumlusunuz</li>
                <li>Başkası tarafından kullanıldığını fark ederseniz derhal bildirmelisiniz</li>
                <li>Yalnızca yasal amaçlar için uygulamayı kullanmalısınız</li>
              </ul>
            </section>

            <section>
              <h3 className="text-2xl font-bold text-red-600 mb-4">4. Hizmetin Sınırlamaları</h3>
              <div className="bg-red-50 p-4 rounded">
                <p className="font-bold text-red-600 mb-2">⚠️ ÖNEMLİ UYARI</p>
                <p className="text-sm mb-3">
                  Bu uygulama bilgilendirme ve ek güvenlik amaçlıdır. Resmi AFAD sistemi yerine geçmez.
                </p>
                <ul className="space-y-2 text-sm list-disc list-inside">
                  <li>Hizmet kesintilere uğrayabilir</li>
                  <li>Uyarılar gecikmeli olabilir</li>
                  <li>Veri doğruluğu garantilenmez</li>
                  <li>Acil durumlarda 112'yi arayınız</li>
                </ul>
              </div>
            </section>

            <section>
              <h3 className="text-2xl font-bold text-red-600 mb-4">5. Yasaklı İçerik ve Davranış</h3>
              <p className="mb-3">Aşağıdakileri yapamazsınız:</p>
              <ul className="space-y-2 list-disc list-inside">
                <li>Şiddetli, aşağılayıcı veya nefret dolu içerik yayınlamak</li>
                <li>Yanlış deprem bilgisi paylaşmak veya panik yaratmak</li>
                <li>Başkasının verilerini izinsiz toplamak</li>
                <li>Uygulamaya saldırı veya zarar vermek</li>
                <li>Başkasının hesabını izinsiz kullanmak</li>
                <li>Spamda bulunmak veya çok sayıda SOS bildirimi göndermek</li>
              </ul>
            </section>

            <section>
              <h3 className="text-2xl font-bold text-red-600 mb-4">6. Fikri Mülkiyet Hakları</h3>
              <p className="leading-relaxed">
                Uygulamada yer alan tüm içerik, yazılım ve tasarımlar Deprem App'in veya lisans verenlerinin 
                mülkiyeti altındadır. İzinsiz kopyalama veya kullanma yasaklanmıştır.
              </p>
            </section>

            <section>
              <h3 className="text-2xl font-bold text-red-600 mb-4">7. Sorumluluk Reddi</h3>
              <p className="mb-4">
                Uygulama "olduğu gibi" sağlanır. Deprem App aşağıdakilerden sorumlu değildir:
              </p>
              <ul className="space-y-2 list-disc list-inside">
                <li>Gecikmeli veya eksik uyarılardan kaynaklanan zararlar</li>
                <li>Yanlış konum bilgisinden kaynaklanan zararlar</li>
                <li>Hizmet kesintileri veya teknik sorunlar</li>
                <li>Üçüncü taraf hizmetlerinin arızası</li>
              </ul>
            </section>

            <section>
              <h3 className="text-2xl font-bold text-red-600 mb-4">8. Telif Hakkı ve Geri Bildirim</h3>
              <p className="leading-relaxed">
                Geri bildirim, öneriler veya içerik gönderirseniz, Deprem App bunları serbestçe kullanabilir, 
                değiştirebilir ve yayınlayabilir.
              </p>
            </section>

            <section>
              <h3 className="text-2xl font-bold text-red-600 mb-4">9. Hizmetin Sonlandırılması</h3>
              <p className="leading-relaxed">
                Deprem App, bu şartları ihlal eden hesapları derhal kapatabilir ve hizmete erişimi yasaklayabilir.
              </p>
            </section>

            <section>
              <h3 className="text-2xl font-bold text-red-600 mb-4">10. Değişiklikler</h3>
              <p className="leading-relaxed">
                Deprem App, bu şartları herhangi bir zamanda değiştirebilir. Değişiklikler bildirim yapıldığında geçerli olur.
              </p>
            </section>

            <section>
              <h3 className="text-2xl font-bold text-red-600 mb-4">11. Uygulanacak Hukuk</h3>
              <p className="leading-relaxed">
                Bu şartlar Türkiye Cumhuriyet Hukuku'na tabi olacak ve Ankara mahkemeleri yetkili olacaktır.
              </p>
            </section>

            <section className="bg-blue-50 border-l-4 border-blue-600 p-4 text-sm">
              <p>Son Güncellenme: 2024</p>
              <p className="mt-2">Sorularınız için: legal@depremapp.com</p>
            </section>
          </div>
        </div>
      </div>
    </>
  );
}

---