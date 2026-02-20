import { Toaster } from 'react-hot-toast';
import Navbar from './components/layout/Navbar';
import Dashboard from './pages/Dashboard';

/**
 * Root application component.
 */
function App() {
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
