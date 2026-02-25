
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/pages/ReportDamage.css';

interface DamageReport {
  id: string;
  type: 'residential' | 'commercial' | 'public' | 'infrastructure';
  severity: 'light' | 'moderate' | 'severe' | 'critical';
  location: string;
  latitude: number;
  longitude: number;
  description: string;
  images: File[];
  reporterName: string;
  reporterPhone: string;
  reportedAt: Date;
  status: 'pending' | 'review' | 'verified' | 'resolved';
}

const ReportDamage: React.FC = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    type: 'residential',
    severity: 'moderate',
    location: '',
    latitude: 0,
    longitude: 0,
    description: '',
    reporterName: '',
    reporterPhone: '',
  });

  const [images, setImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]:
        name === 'latitude' || name === 'longitude' ? parseFloat(value) : value,
    }));
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setImages((prev) => [...prev, ...newFiles]);

      newFiles.forEach((file) => {
        const reader = new FileReader();
        reader.onload = (event) => {
          if (event.target?.result) {
            setImagePreviews((prev) => [...prev, event.target.result as string]);
          }
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
    setImagePreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setFormData((prev) => ({
            ...prev,
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          }));
        },
        () => alert('Konum alınamadı. Lütfen manuel giriniz.')
      );
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const formDataToSend = new FormData();
      Object.entries(formData).forEach(([key, value]) => {
        formDataToSend.append(key, String(value));
      });
      images.forEach((image) => {
        formDataToSend.append('images', image);
      });

      const response = await fetch('/api/damage-reports', {
        method: 'POST',
        body: formDataToSend,
      });

      if (response.ok) {
        setSuccessMessage('Hasar raporu başarıyla gönderildi!');
        setTimeout(() => {
          navigate('/dashboard');
        }, 2000);
      }
    } catch (error) {
      console.error('Error submitting report:', error);
      alert('Rapor gönderilemedi. Lütfen tekrar deneyin.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="report-damage-container">
      <header className="rd-header">
        <h1>📸 Hasar Bildirimi</h1>
        <p>Deprem sonrası hasar gören bölgeleri bildirin</p>
      </header>

      {successMessage && (
        <div className="success-message">{successMessage}</div>
      )}

      <form onSubmit={handleSubmit} className="damage-form">
        <div className="form-section">
          <h3>Hasar Türü</h3>
          <select
            name="type"
            value={formData.type}
            onChange={handleInputChange}
            className="form-control"
          >
            <option value="residential">Konut</option>
            <option value="commercial">Ticari İşletme</option>
            <option value="public">Kamu Binası</option>
            <option value="infrastructure">Altyapı (Yol, köprü vb.)</option>
          </select>
        </div>

        <div className="form-section">
          <h3>Hasar Derecesi</h3>
          <div className="severity-options">
            {[
              { value: 'light', label: 'Hafif', emoji: '🟢' },
              { value: 'moderate', label: 'Orta', emoji: '🟡' },
              { value: 'severe', label: 'Ağır', emoji: '🔴' },
              { value: 'critical', label: 'Kritik', emoji: '🔴🔴' },
            ].map((option) => (
              <label key={option.value} className="severity-option">
                <input
                  type="radio"
                  name="severity"
                  value={option.value}
                  checked={formData.severity === option.value}
                  onChange={handleInputChange}
                />
                <span>{option.emoji} {option.label}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="form-section">
          <h3>Konum</h3>
          <input
            type="text"
            name="location"
            placeholder="Sokak, mahalle, ilçe vb."
            value={formData.location}
            onChange={handleInputChange}
            className="form-control"
            required
          />
          <button
            type="button"
            onClick={getCurrentLocation}
            className="location-btn"
          >
            📍 Konumu Bul
          </button>
          {formData.latitude !== 0 && (
            <p className="location-info">
              Konum: {formData.latitude.toFixed(4)}, {formData.longitude.toFixed(4)}
            </p>
          )}
        </div>

        <div className="form-section">
          <h3>Açıklama</h3>
          <textarea
            name="description"
            placeholder="Hasarın detaylı açıklamasını yazın..."
            value={formData.description}
            onChange={handleInputChange}
            className="form-control"
            rows={4}
            required
          />
        </div>

        <div className="form-section">
          <h3>Fotoğraflar</h3>
          <div className="image-upload">
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handleImageSelect}
              id="image-input"
              className="hidden-input"
            />
            <label htmlFor="image-input" className="upload-label">
              📷 Fotoğraf Seçin (Maksimum 5)
            </label>
          </div>

          {imagePreviews.length > 0 && (
            <div className="image-previews">
              {imagePreviews.map((preview, index) => (
                <div key={index} className="image-preview">
                  <img src={preview} alt={`Preview ${index + 1}`} />
                  <button
                    type="button"
                    onClick={() => removeImage(index)}
                    className="remove-image"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="form-section">
          <h3>Kişisel Bilgiler</h3>
          <input
            type="text"
            name="reporterName"
            placeholder="Adınız Soyadınız"
            value={formData.reporterName}
            onChange={handleInputChange}
            className="form-control"
            required
          />
          <input
            type="tel"
            name="reporterPhone"
            placeholder="Telefon Numarası"
            value={formData.reporterPhone}
            onChange={handleInputChange}
            className="form-control"
            required
          />
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="submit-btn"
        >
          {submitting ? '⏳ Gönderiliyor...' : '✅ Raporu Gönder'}
        </button>
      </form>
    </div>
  );
};

export default ReportDamage;
