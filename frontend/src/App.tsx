import { useEffect } from 'react';
import { Toaster, toast } from 'react-hot-toast';
import Navbar from './components/layout/Navbar';
import Dashboard from './pages/Dashboard';
import { requestPermissionAndGetToken, onMessageListener } from './services/pushNotification';

/**
 * Root application component.
 */
function App() {
  useEffect(() => {
    // Web Push Başlatma
    const setupNotifications = async () => {
      const token = await requestPermissionAndGetToken();
      if (token) {
        toast.success("Bildirimler aktif edildi!");
      }

      // Uygulama açıkken gelen bildirimleri dinle
      onMessageListener().then((payload: any) => {
        toast(payload.notification.body, {
          icon: '🚨',
          duration: 6000,
        });
      });
    };

    setupNotifications();
  }, []);

  return (
    <div className="min-h-screen bg-dark text-slate-100 selection:bg-primary/30">
      <Navbar />
      <Dashboard />
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: '#1e0d0d',
            color: '#F8FAFC',
            border: '1px solid #3d1a1a',
            borderRadius: '12px',
          },
        }}
      />
    </div>
  );
}

export default App;
