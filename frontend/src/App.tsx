import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster, toast } from 'react-hot-toast';
import Navbar from './components/layout/Navbar';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import AdminLayout from './pages/admin/AdminLayout';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminUsers from './pages/admin/AdminUsers';
import AdminEarthquakes from './pages/admin/AdminEarthquakes';
import AdminBroadcast from './pages/admin/AdminBroadcast';
import Settings from './pages/Settings';
import { requestPermissionAndGetToken, onMessageListener } from './services/pushNotification';
import { useAuthStore } from './store/useAuthStore';

/**
 * Root application component with Routing and Protection.
 */
function App() {
  const { checkAuth, loading } = useAuthStore();

  useEffect(() => {
    // Auth Check
    checkAuth();

    // Web Push Başlatma
    const setupNotifications = async () => {
      await requestPermissionAndGetToken();

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

  if (loading) {
    return (
      <div className="min-h-screen bg-dark flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-dark text-slate-100 selection:bg-primary/30">
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

        <Routes>
          {/* Public App Layout */}
          <Route path="/" element={<><Navbar /><Dashboard /></>} />
          <Route path="/login" element={<><Navbar /><Login /></>} />
          <Route path="/settings" element={<><Navbar /><Settings /></>} />

          {/* Admin Layout & Routes */}
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<AdminDashboard />} />
            <Route path="users" element={<AdminUsers />} />
            <Route path="earthquakes" element={<AdminEarthquakes />} />
            <Route path="broadcast" element={<AdminBroadcast />} />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
