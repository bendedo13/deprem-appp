
import React, { useState } from 'react';
import { PhoneIcon, MessageIcon, WebIcon } from '../assets/icons';
import '../styles/pages/EmergencyContacts.css';

interface Contact {
  id: string;
  name: string;
  category: 'ambulance' | 'police' | 'fire' | 'municipality' | 'helpline';
  phone: string;
  whatsapp?: string;
  website?: string;
  description: string;
  available24h: boolean;
}

const EmergencyContacts: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [contacts, setContacts] = useState<Contact[]>([
    {
      id: '1',
      name: 'Ambulans Hizmetleri',
      category: 'ambulance',
      phone: '112',
      description: 'Tıbbi acil durumlarda ambulans çağrıştırma',
      available24h: true,
    },
    {
      id: '2',
      name: 'Polis İmdat',
      category: 'police',
      phone: '155',
      description: 'Güvenlik ve güvenlik sorunları için',
      available24h: true,
    },
    {
      id: '3',
      name: 'İtfaiye Acil Servisi',
      category: 'fire',
      phone: '110',
      description: 'Yangın ve kurtarma operasyonları',
      available24h: true,
    },
    {
      id: '4',
      name: 'AFAD Deprem İletişim Merkezi',
      category: 'helpline',
      phone: '122',
      whatsapp: '+90 539 XXX XXXX',
      website: 'https://www.afad.gov.tr',
      description: 'Deprem sonrası yardım ve bilgi',
      available24h: true,
    },
    {
      id: '5',
      name: 'Kızılay Acil Yardım',
      category: 'helpline',
      phone: '0850 777 77 77',
      website: 'https://www.kizilay.org.tr',
      description: 'İnsani yardım ve destekleme hizmetleri',
      available24h: true,
    },
    {
      id: '6',
      name: 'Belediye Acil Hizmetler',
      category: 'municipality',
      phone: '184',
      description: 'Yerel yönetim acil hizmetleri',
      available24h: true,
    },
  ]);

  const filteredContacts =
    selectedCategory === 'all'
      ? contacts
      : contacts.filter((c) => c.category === selectedCategory);

  const handleCall = (phone: string) => {
    window.location.href = `tel:${phone}`;
  };

  const handleWhatsApp = (phone: string) => {
    window.open(`https://wa.me/${phone}`, '_blank');
  };

  return (
    <div className="emergency-contacts-container">
      <header className="ec-header">
        <h1>🚨 Acil İletişim Numaraları</h1>
        <p>Deprem sonrası hızlı yardım için gerekli numaralar</p>
      </header>

      <div className="ec-filters">
        <button
          className={`filter-btn ${selectedCategory === 'all' ? 'active' : ''}`}
          onClick={() => setSelectedCategory('all')}
        >
          Tümü
        </button>
        <button
          className={`filter-btn ${selectedCategory === 'ambulance' ? 'active' : ''}`}
          onClick={() => setSelectedCategory('ambulance')}
        >
          Ambulans
        </button>
        <button
          className={`filter-btn ${selectedCategory === 'police' ? 'active' : ''}`}
          onClick={() => setSelectedCategory('police')}
        >
          Polis
        </button>
        <button
          className={`filter-btn ${selectedCategory === 'fire' ? 'active' : ''}`}
          onClick={() => setSelectedCategory('fire')}
        >
          İtfaiye
        </button>
        <button
          className={`filter-btn ${selectedCategory === 'helpline' ? 'active' : ''}`}
          onClick={() => setSelectedCategory('helpline')}
        >
          Yardım
        </button>
      </div>

      <div className="ec-contacts-list">
        {filteredContacts.map((contact) => (
          <div key={contact.id} className="contact-card">
            <div className="contact-header">
              <h3>{contact.name}</h3>
              {contact.available24h && (
                <span className="badge-24h">24/7</span>
              )}
            </div>
            <p className="contact-description">{contact.description}</p>

            <div className="contact-actions">
              <button
                className="action-btn call-btn"
                onClick={() => handleCall(contact.phone)}
              >
                <PhoneIcon />
                <span>{contact.phone}</span>
              </button>

              {contact.whatsapp && (
                <button
                  className="action-btn whatsapp-btn"
                  onClick={() => handleWhatsApp(contact.whatsapp!)}
                >
                  <MessageIcon />
                  <span>WhatsApp</span>
                </button>
              )}

              {contact.website && (
                <a
                  href={contact.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="action-btn web-btn"
                >
                  <WebIcon />
                  <span>Web</span>
                </a>
              )}
            </div>
          </div>
        ))}
      </div>

      {filteredContacts.length === 0 && (
        <div className="empty-state">
          <p>Bu kategoride iletişim numarası bulunamadı</p>
        </div>
      )}
    </div>
  );
};

export default EmergencyContacts;
