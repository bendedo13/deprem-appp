
import React, { useState } from 'react';
import '../styles/pages/SafetyGuide.css';

interface GuideSection {
  id: string;
  title: string;
  icon: string;
  content: string;
  tips: string[];
}

const SafetyGuide: React.FC = () => {
  const [expandedId, setExpandedId] = useState<string>('1');

  const guideSections: GuideSection[] = [
    {
      id: '1',
      title: 'Deprem Anında Yapılması Gerekenler',
      icon: '🏃',
      content:
        'Deprem başladığında ilk 5 saniye kritiktir. Hemen güvenli yere geçmeniz gerekmektedir.',
      tips: [
        'Eğer evde iseniz: Sağlam bir masa altına girin veya duvarın yanına oturun',
        'Eğer dışardasınız: Açık alanda kalın, yapılardan uzak durun',
        'Asansörde iseniz: Gemi yazısı yaparak tüm düğmelere basın',
        'Otobüs/araçta iseniz: Şoföre depremin olduğunu söyleyin ve durana kadar oturun',
        'Denizde iseniz: Sahila doğru yüzün, tsunamiye dikkat edin',
      ],
    },
    {
      id: '2',
      title: 'Deprem Öncesi Hazırlıklar',
      icon: '🧳',
      content:
        'Deprem öncesi yapılan hazırlıklar hayat kurtarabilir. Bir acil durum çantası hazırlayın.',
      tips: [
        'Evde en az 2 haftalık gıda ve su stoğu bulundurun',
        'Acil tıbbi malzemeleri bir çantaya toplayın',
        'Önemli belgeleri plastik poşetlere koyarak sakla',
        'Tüm aile üyelerinin iletişim bilgilerini yazılı halde bulundurun',
        'Evi depreme dayanıklı hale getirmeyi planla',
      ],
    },
    {
      id: '3',
      title: 'Deprem Sonrası Yapılması Gerekenler',
      icon: '🚑',
      content:
        'Depremden sonraki ilk 24 saat çok önemlidir. Doğru adımlar atın.',
      tips: [
        'Yaralanmış kişilere ilk yardım yapın',
        'Artçıklardan korunmak için güvenli yerde kalın',
        'Ev ve binaların hasar durumunu kontrol edin',
        'Elektrik, gaz ve su tesisatını kontrol edin',
        'Resmi uyarıları takip edin ve yolu açık tutun',
      ],
    },
    {
      id: '4',
      title: 'Ev ve İş Yerinde Güvenlik',
      icon: '🏠',
      content:
        'Depremlere dayanıklı bir ortam oluşturmak için bazı önlemler alın.',
      tips: [
        'Ağır mobilyaları ve elektrikli aletleri sabitleyiniz',
        'Camları kırılmaz film ile kaplayın',
        'Gaz borusu kaçak önleme sistemini yükletin',
        'Asılı lambaları ve dekorleri güvenli şekilde bağlayın',
        'Kütüphanelerin ön kısmını koruma mekanizması ile kaplayın',
      ],
    },
    {
      id: '5',
      title: 'Psikolojik Destek ve Coping',
      icon: '🧠',
      content:
        'Deprem travması psikolojik etki yaratabilir. Kendine ve çevrendekine destek ol.',
      tips: [
        'Travma sonrası stress bozukluğunun belirtilerini tanıyın',
        'Profesyonel psikolojik yardım almaktan çekinmeyin',
        'Çevrenle iletişimde kalın ve sosyal destek arayın',
        'Derin nefes teknikleri ve meditasyon yapın',
        'Rutini yavaş yavaş normal hale getirin',
      ],
    },
  ];

  return (
    <div className="safety-guide-container">
      <header className="sg-header">
        <h1>🛡️ Deprem Güvenlik Rehberi</h1>
        <p>Depremlerden korunma ve güvenlik için adım adım rehberiniz</p>
      </header>

      <div className="sg-sections">
        {guideSections.map((section) => (
          <div
            key={section.id}
            className={`guide-section ${expandedId === section.id ? 'expanded' : ''}`}
          >
            <button
              className="section-header"
              onClick={() =>
                setExpandedId(expandedId === section.id ? '' : section.id)
              }
            >
              <span className="section-icon">{section.icon}</span>
              <h2>{section.title}</h2>
              <span className="expand-icon">
                {expandedId === section.id ? '−' : '+'}
              </span>
            </button>

            {expandedId === section.id && (
              <div className="section-content">
                <p className="section-text">{section.content}</p>
                <div className="tips-list">
                  <h4>📋 Önemli Noktalar:</h4>
                  <ul>
                    {section.tips.map((tip, index) => (
                      <li key={index}>{tip}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <footer className="sg-footer">
        <p>
          💡 <strong>Hatırla:</strong> Deprem anında hızlı karar vermek hayat
          kurtarır. Önceden bilgi sahibi olmak fark yaratır.
        </p>
      </footer>
    </div>
  );
};

export default SafetyGuide;
