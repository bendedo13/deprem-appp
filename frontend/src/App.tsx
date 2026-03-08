import { useEffect, Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster, toast } from 'react-hot-toast';
import Navbar from './components/layout/Navbar';
import CookieBanner from './components/ui/CookieBanner';
import ErrorBoundary from './components/ErrorBoundary';
import { requestPermissionAndGetToken, onMessageListener } from './services/pushNotification';
import { useAuthStore } from './store/useAuthStore';

// Lazy Loaded Pages
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const MapPage = lazy(() => import('./pages/MapPage'));
const RiskAnalysis = lazy(() => import('./pages/RiskAnalysis'));
const Settings = lazy(() => import('./pages/Settings')); // Might be deprecated by new pages

// Admin
const AdminLayout = lazy(() => import('./pages/admin/AdminLayout'));
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'));
const AdminUsers = lazy(() => import('./pages/admin/AdminUsers'));
const AdminEarthquakes = lazy(() => import('./pages/admin/AdminEarthquakes'));
const AdminBroadcast = lazy(() => import('./pages/admin/AdminBroadcast'));
const AdminNotifications = lazy(() => import('./pages/admin/AdminNotifications'));
const AdminSettings = lazy(() => import('./pages/admin/AdminSettings'));

// Legal Pages
const GizlilikPolitikasi = lazy(() => import('./pages/legal/GizlilikPolitikasi'));
const KullanimKosullari = lazy(() => import('./pages/legal/KullanimKosullari'));
const CerezPolitikasi = lazy(() => import('./pages/legal/CerezPolitikasi'));

// User Pages
const ProfilYonetimi = lazy(() => import('./pages/user/ProfilYonetimi'));
const BildirimAyarlari = lazy(() => import('./pages/user/BildirimAyarlari'));
const AcilKisiler = lazy(() => import('./pages/user/AcilKisiler'));
const BenIyiyim = lazy(() => import('./pages/user/BenIyiyim'));

const PageLoader = () => (
  <div className="min-h-screen bg-dark flex items-center justify-center">
    <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
  </div>
);

function App() {
  const { checkAuth, loading } = useAuthStore();

  useEffect(() => {
    checkAuth();

    const setupNotifications = async () => {
      try {
        await requestPermissionAndGetToken();
        onMessageListener().then((payload: any) => {
          toast(payload.notification.body, {
            icon: '🚨',
            duration: 6000,
          });
        });
      } catch (error) {
        console.error("Bildirim hatası:", error);
      }
    };

    setupNotifications();
  }, []);

  if (loading) {
    return <PageLoader />;
  }

  return (
    <ErrorBoundary>
    <BrowserRouter>
      <div className="min-h-screen bg-dark text-gray-100 font-sans selection:bg-primary/30 selection:text-white">
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              background: '#111827',
              color: '#F3F4F6',
              border: '1px solid #374151',
              borderRadius: '12px',
              fontFamily: '"DM Sans", sans-serif',
            },
            success: {
              iconTheme: {
                primary: '#f97316',
                secondary: '#fff',
              },
            },
          }}
        />

        <CookieBanner />

        <Suspense fallback={<PageLoader />}>
          <Routes>
            {/* Public App Layout */}
            <Route path="/" element={<><Navbar /><Dashboard /></>} />
            <Route path="/login" element={<><Navbar /><Login /></>} />
            <Route path="/register" element={<><Navbar /><Register /></>} />
            <Route path="/map" element={<><Navbar /><MapPage /></>} />
            <Route path="/risk" element={<><Navbar /><RiskAnalysis /></>} />
            
            {/* User Pages */}
            <Route path="/profil" element={<><Navbar /><ProfilYonetimi /></>} />
            <Route path="/bildirim-ayarlari" element={<><Navbar /><BildirimAyarlari /></>} />
            <Route path="/acil-kisiler" element={<><Navbar /><AcilKisiler /></>} />
            <Route path="/ben-iyiyim" element={<BenIyiyim />} /> {/* No Navbar, dedicated page */}

            {/* Legal Pages */}
            <Route path="/gizlilik-politikasi" element={<><Navbar /><GizlilikPolitikasi /></>} />
            <Route path="/kullanim-kosullari" element={<><Navbar /><KullanimKosullari /></>} />
            <Route path="/cerez-politikasi" element={<><Navbar /><CerezPolitikasi /></>} />
            
            {/* Redirects */}
            <Route path="/privacy" element={<Navigate to="/gizlilik-politikasi" replace />} />
            <Route path="/terms" element={<Navigate to="/kullanim-kosullari" replace />} />

            {/* Admin Layout & Routes */}
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<AdminDashboard />} />
              <Route path="users" element={<AdminUsers />} />
              <Route path="earthquakes" element={<AdminEarthquakes />} />
              <Route path="broadcast" element={<AdminBroadcast />} />
              <Route path="notifications" element={<AdminNotifications />} />
              <Route path="settings" element={<AdminSettings />} />
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </div>
    </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
