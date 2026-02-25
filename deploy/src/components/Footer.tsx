
import React from 'react';

const Footer: React.FC = () => {
  return (
    <footer className="bg-gray-900 text-white py-8 mt-12">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="mb-4 md:mb-0">
            <p className="text-lg font-semibold">© 2026 Deprem App</p>
            <p className="text-gray-400 text-sm">Türkiye Deprem İzleme Sistemi</p>
          </div>
          <div className="text-gray-400 text-sm text-center md:text-right">
            <p>Gerçek zamanlı deprem bilgileri için</p>
            <p>github.com/bendedo13/deprem-appp</p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
