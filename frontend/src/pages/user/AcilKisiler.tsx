import React, { useState, useEffect } from 'react';
import { userService } from '../../services/api';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';

const RELATION_TYPES = ['Aile', 'Eş', 'Anne', 'Baba', 'Kardeş', 'Arkadaş', 'İş Arkadaşı', 'Diğer'];

const AcilKisiler: React.FC = () => {
  const [contacts, setContacts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);

  // Form State
  const [newContact, setNewContact] = useState({
    name: '',
    phone: '',
    email: '',
    relation: 'Aile',
    methods: ['push'], // default
    priority: 1
  });

  useEffect(() => {
    loadContacts();
  }, []);

  const loadContacts = async () => {
    try {
      const data = await userService.getContacts();
      setContacts(data);
    } catch (error) {
      console.error('Kişiler yüklenemedi', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (contacts.length >= 5) {
      toast.error('En fazla 5 acil durum kişisi ekleyebilirsiniz.');
      return;
    }
    
    try {
      await userService.addContact(newContact);
      toast.success('Kişi eklendi!');
      setShowAddForm(false);
      setNewContact({ name: '', phone: '', email: '', relation: 'Aile', methods: ['push'], priority: 1 });
      loadContacts();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Ekleme başarısız.');
    }
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Bu kişiyi silmek istediğinize emin misiniz?')) {
      try {
        await userService.deleteContact(id);
        toast.success('Kişi silindi.');
        loadContacts();
      } catch (error) {
        toast.error('Silme başarısız.');
      }
    }
  };

  const handleTest = async (contact: any) => {
    toast.promise(
      new Promise((resolve) => setTimeout(resolve, 2000)),
      {
        loading: `${contact.name} kişisine test bildirimi gönderiliyor...`,
        success: 'Test bildirimi iletildi!',
        error: 'Başarısız.',
      }
    );
  };

  const toggleMethod = (method: string) => {
    const methods = newContact.methods.includes(method)
      ? newContact.methods.filter(m => m !== method)
      : [...newContact.methods, method];
    setNewContact({ ...newContact, methods });
  };

  return (
    <div className="min-h-screen bg-dark text-gray-100 py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-4xl mx-auto space-y-8">
        
        <header className="flex justify-between items-center border-b border-dark-border pb-6">
          <div>
            <h1 className="text-3xl font-display font-bold text-white mb-2">Acil Durum Kişileri</h1>
            <p className="text-gray-400">Deprem anında ulaşılacak güvendiğiniz kişiler.</p>
          </div>
          <Link to="/ben-iyiyim" className="text-primary hover:underline text-sm font-medium">
            "Ben İyiyim" özelliği nasıl çalışır?
          </Link>
        </header>

        {/* Info Box */}
        <div className="bg-primary/10 border border-primary/30 p-4 rounded-xl flex items-start gap-4">
          <span className="text-2xl">ℹ️</span>
          <p className="text-sm text-primary leading-relaxed">
            Deprem anında <strong>"Ben İyiyim"</strong> butonuna bastığınızda, aşağıda eklediğiniz kişilere 
            konumunuzla birlikte otomatik mesaj gönderilir. En az 1 kişi eklemeniz önerilir.
          </p>
        </div>

        {/* Contact List */}
        <div className="grid md:grid-cols-2 gap-6">
          {loading ? (
            <div className="col-span-2 text-center py-12 text-gray-500">Yükleniyor...</div>
          ) : contacts.length === 0 && !showAddForm ? (
            <div className="col-span-2 text-center py-12 border-2 border-dashed border-dark-border rounded-xl">
              <p className="text-gray-400 mb-4">Henüz acil durum kişisi eklemediniz.</p>
              <button 
                onClick={() => setShowAddForm(true)}
                className="px-6 py-2 bg-primary text-white rounded-lg font-bold hover:bg-orange-600 transition-colors"
              >
                + İlk Kişiyi Ekle
              </button>
            </div>
          ) : (
            contacts.map((contact) => (
              <div key={contact.id} className="bg-dark-surface p-6 rounded-2xl border border-dark-border hover:border-primary/50 transition-colors group relative">
                <button 
                  onClick={() => handleDelete(contact.id)}
                  className="absolute top-4 right-4 text-gray-600 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                >
                  ✕
                </button>

                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 rounded-full bg-primary/20 text-primary flex items-center justify-center font-display font-bold text-xl border border-primary/30">
                    {contact.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-lg">{contact.name}</h3>
                    <span className="inline-block px-2 py-0.5 rounded bg-gray-700 text-xs text-gray-300 border border-gray-600">
                      {contact.relation}
                    </span>
                  </div>
                </div>

                <div className="space-y-2 mb-6">
                  <div className="flex items-center gap-2 text-gray-400 text-sm">
                    <span>📞</span> {contact.phone}
                  </div>
                  {contact.email && (
                    <div className="flex items-center gap-2 text-gray-400 text-sm">
                      <span>📧</span> {contact.email}
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap gap-2 mb-6">
                  {contact.methods?.map((method: string) => (
                    <span key={method} className="px-2 py-1 rounded bg-dark border border-dark-border text-xs text-gray-300 capitalize">
                      {method === 'whatsapp' ? '💬 WhatsApp' : method === 'sms' ? '📱 SMS' : '📧 E-posta'}
                    </span>
                  ))}
                </div>

                <div className="flex gap-3">
                  <button 
                    onClick={() => handleTest(contact)}
                    className="flex-1 py-2 rounded-lg border border-blue-500/30 text-blue-400 hover:bg-blue-500/10 transition-colors text-sm font-medium"
                  >
                    Test Et
                  </button>
                  <button className="flex-1 py-2 rounded-lg border border-dark-border text-gray-400 hover:bg-dark-border hover:text-white transition-colors text-sm font-medium">
                    Düzenle
                  </button>
                </div>
              </div>
            ))
          )}

          {/* Add Button / Form */}
          {!showAddForm && contacts.length < 5 && contacts.length > 0 && (
            <button
              onClick={() => setShowAddForm(true)}
              className="flex flex-col items-center justify-center gap-4 p-6 rounded-2xl border-2 border-dashed border-dark-border text-gray-500 hover:text-primary hover:border-primary/50 hover:bg-primary/5 transition-all min-h-[280px]"
            >
              <span className="text-4xl">+</span>
              <span className="font-medium">Yeni Kişi Ekle</span>
            </button>
          )}
        </div>

        {/* ADD CONTACT FORM MODAL/INLINE */}
        {showAddForm && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-dark-surface w-full max-w-lg rounded-2xl border border-dark-border p-8 shadow-2xl animate-scaleIn">
              <h2 className="text-2xl font-display font-bold text-white mb-6">Yeni Kişi Ekle</h2>
              
              <form onSubmit={handleAddContact} className="space-y-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">Ad Soyad *</label>
                    <input
                      required
                      type="text"
                      value={newContact.name}
                      onChange={(e) => setNewContact({...newContact, name: e.target.value})}
                      className="w-full bg-dark border border-dark-border rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-primary outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-1">Yakınlık *</label>
                      <select
                        value={newContact.relation}
                        onChange={(e) => setNewContact({...newContact, relation: e.target.value})}
                        className="w-full bg-dark border border-dark-border rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-primary outline-none appearance-none"
                      >
                        {RELATION_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-1">Telefon *</label>
                      <input
                        required
                        type="tel"
                        placeholder="+90..."
                        value={newContact.phone}
                        onChange={(e) => setNewContact({...newContact, phone: e.target.value})}
                        className="w-full bg-dark border border-dark-border rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-primary outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">E-posta (Opsiyonel)</label>
                    <input
                      type="email"
                      value={newContact.email}
                      onChange={(e) => setNewContact({...newContact, email: e.target.value})}
                      className="w-full bg-dark border border-dark-border rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-primary outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Bildirim Yöntemleri</label>
                    <div className="flex gap-4">
                      {['whatsapp', 'sms', 'email'].map((method) => (
                        <button
                          key={method}
                          type="button"
                          onClick={() => toggleMethod(method)}
                          className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-colors ${
                            newContact.methods.includes(method)
                              ? 'bg-primary/20 border-primary text-primary'
                              : 'bg-dark border-dark-border text-gray-500 hover:text-gray-300'
                          }`}
                        >
                          {method === 'whatsapp' ? 'WhatsApp' : method === 'sms' ? 'SMS' : 'E-posta'}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex gap-4 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowAddForm(false)}
                    className="flex-1 py-3 bg-dark border border-dark-border text-gray-300 font-bold rounded-xl hover:bg-dark-border transition-colors"
                  >
                    İptal
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-3 bg-primary text-white font-bold rounded-xl hover:bg-orange-600 shadow-lg shadow-orange-500/20 transition-all"
                  >
                    Kaydet
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default AcilKisiler;
