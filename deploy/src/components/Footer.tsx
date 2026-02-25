
import React from 'react';

const Footer: React.FC = () => {
  return (
    <footer className="bg-gray-900 text-white py-6 mt-12">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="mb-4 md:mb-0">
            <p className="text-gray-400">© 2026 Deprem App - Türkiye Deprem İzleme Sistemi</p>
          </div>
          <div className="flex space-x-6">
            <a href="#" className="text-gray-400 hover:text-white transition">Hakkında</a>
            <a href="#" className="text-gray-400 hover:text-white transition">İletişim</a>
            <a href="#" className="text-gray-400 hover:text-white transition">Gizlilik</a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
