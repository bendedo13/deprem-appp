
import React from 'react';
import './Footer.css';

const Footer: React.FC = () => {
  return (
    <footer className="footer">
      <div className="footer-content">
        <p>&copy; 2026 Deprem App - Türkiye Deprem Erken Uyarı Sistemi</p>
        <p className="footer-subtitle">Hayat kurtarma platformu</p>
      </div>
    </footer>
  );
};

export default Footer;
