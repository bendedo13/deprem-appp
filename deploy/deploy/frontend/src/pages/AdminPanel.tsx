import React, { useState, useEffect } from 'react';
import axios from 'axios';

interface User {
  id: number;
  email: string;
  full_name: string;
  is_active: boolean;
  is_admin: boolean;
  subscription_plan: string;
  subscription_status: string;
  created_at: string;
  last_login: string;
  phone: string;
}

interface Plan {
  id: string;
  name: string;
  price_monthly: number;
  price_yearly: number;
  features: string[];
  is_active: boolean;
  max_alerts: number;
  max_regions: number;
}

const AdminPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'users' | 'plans' | 'logs'>('dashboard');
  const [users, setUsers] = useState<User[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [stats, setStats] = useState({
    total_users: 0,
    active_users: 0,
    premium_users: 0,
    total_revenue: 0,
    new_users_today: 0,
    active_subscriptions: 0,
  });
  const [userFilter, setUserFilter] = useState<'all' | 'active' | 'inactive' | 'premium' | 'free'>('all');
  const [sortConfig, setSortConfig] = useState<{ key: keyof User; direction: 'asc' | 'desc' }>({
    key: 'created_at',
    direction: 'desc',
  });
  const [currentPage, setCurrentPage] = useState(1);
  const usersPerPage = 10;

  const token = localStorage.getItem('token');

  const axiosAuth = axios.create({
    baseURL: '/api',
    headers: { Authorization: `Bearer ${token}` },
  });

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 3500);
  };

  useEffect(() => {
    fetchStats();
    fetchUsers();
    fetchPlans();
  }, []);

  const fetchStats = async () => {
    try {
      const res = await axiosAuth.get('/admin/stats');
      setStats(res.data);
    } catch {
      // fallback mock
      setStats({
        total_users: 0,
        active_users: 0,
        premium_users: 0,
        total_revenue: 0,
        new_users_today: 0,
        active_subscriptions: 0,
      });
    }
  };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await axiosAuth.get('/admin/users');
      setUsers(res.data);
    } catch {
      showNotification('error', 'Kullanıcılar yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  const fetchPlans = async () => {
    try {
      const res = await axiosAuth.get('/admin/plans');
      setPlans(res.data);
    } catch {
      setPlans([
        {
          id: 'free',
          name: 'Ücretsiz',
          price_monthly: 0,
          price_yearly: 0,
          features: ['5 bölge takibi', 'Temel bildirimler', 'Son 7 gün geçmiş'],
          is_active: true,
          max_alerts: 5,
          max_regions: 3,
        },
        {
          id: 'premium',
          name: 'Premium',
          price_monthly: 49.99,
          price_yearly: 499.99,
          features: ['Sınırsız bölge', 'Öncelikli bildirimler', 'Tüm geçmiş', 'SMS uyarısı'],
          is_active: true,
          max_alerts: 999,
          max_regions: 999,
        },
        {
          id: 'enterprise',
          name: 'Kurumsal',
          price_monthly: 199.99,
          price_yearly: 1999.99,
          features: ['Her şey dahil', 'API erişimi', 'Özel destek', 'SLA garantisi'],
          is_active: true,
          max_alerts: 9999,
          max_regions: 9999,
        },
      ]);
    }
  };

  const updateUser = async (userId: number, data: Partial<User>) => {
    try {
      await axiosAuth.put(`/admin/users/${userId}`, data);
      showNotification('success', 'Kullanıcı güncellendi');
      fetchUsers();
      fetchStats();
      setShowUserModal(false);
    } catch {
      showNotification('error', 'Güncelleme başarısız');
    }
  };

  const deleteUser = async (userId: number) => {
    if (!window.confirm('Bu kullanıcıyı silmek istediğinizden emin misiniz?')) return;
    try {
      await axiosAuth.delete(`/admin/users/${userId}`);
      showNotification('success', 'Kullanıcı silindi');
      fetchUsers();
      fetchStats();
    } catch {
      showNotification('error', 'Silme işlemi başarısız');
    }
  };

  const updatePlan = async (planId: string, data: Partial<Plan>) => {
    try {
      await axiosAuth.put(`/admin/plans/${planId}`, data);
      showNotification('success', 'Plan güncellendi');
      fetchPlans();
      setShowPlanModal(false);
    } catch {
      // local update fallback
      setPlans((prev) => prev.map((p) => (p.id === planId ? { ...p, ...data } : p)));
      showNotification('success', 'Plan güncellendi (local)');
      setShowPlanModal(false);
    }
  };

  const toggleUserStatus = async (user: User) => {
    await updateUser(user.id, { is_active: !user.is_active });
  };

  const filteredUsers = users
    .filter((u) => {
      const matchSearch =
        u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.phone?.includes(searchTerm);
      const matchFilter =
        userFilter === 'all' ||
        (userFilter === 'active' && u.is_active) ||
        (userFilter === 'inactive' && !u.is_active) ||
        (userFilter === 'premium' && u.subscription_plan !== 'free') ||
        (userFilter === 'free' && u.subscription_plan === 'free');
      return matchSearch && matchFilter;
    })
    .sort((a, b) => {
      const aVal = a[sortConfig.key] ?? '';
      const bVal = b[sortConfig.key] ?? '';
      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });

  const paginatedUsers = filteredUsers.slice((currentPage - 1) * usersPerPage, currentPage * usersPerPage);
  const totalPages = Math.ceil(filteredUsers.length / usersPerPage);

  const handleSort = (key: keyof User) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  const getPlanBadge = (plan: string) => {
    const styles: Record<string, string> = {
      free: 'bg-gray-700 text-gray-300',
      premium: 'bg-yellow-600 text-yellow-100',
      enterprise: 'bg-purple-700 text-purple-100',
    };
    return styles[plan] || 'bg-gray-700 text-gray-300';
  };

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(val);

  const formatDate = (d: string) => {
    if (!d) return '-';
    return new Date(d).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 font-sans">
      {/* Notification */}
      {notification && (
        <div
          className={`fixed top-5 right-5 z-50 px-5 py-3 rounded-xl shadow-2xl text-sm font-semibold flex items-center gap-3 transition-all duration-300 ${
            notification.type === 'success'
              ? 'bg-emerald-600 text-white border border-emerald-400'
              : 'bg-red-600 text-white border border-red-400'
          }`}
        >
          <span>{notification.type === 'success' ? '✓' : '✗'}</span>
          {notification.message}
        </div>
      )}

      {/* Sidebar + Main */}
      <div className="flex h-screen overflow-hidden">
        {/* Sidebar */}
        <aside className="w-64 bg-gray-900 border-r border-gray-800 flex flex-col shrink-0">
          <div className="p-6 border-b border-gray-800">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-red-600 rounded-lg flex items-center justify-center text-lg">🌍</div>
              <div>
                <div className="font-bold text-white text-sm">Deprem App</div>
                <div className="text-xs text-gray-400">Admin Paneli</div>
              </div>
            </div>
          </div>
          <nav className="flex-1 p-4 space-y-1">
            {[
              { key: 'dashboard', icon: '📊', label: 'Dashboard' },
              { key: 'users', icon: '👥', label: 'Kullanıcılar' },
              { key: 'plans', icon: '💳', label: 'Abonelik Planları' },
              { key: 'logs', icon: '📋', label: 'Sistem Logları' },
            ].map((item) => (
              <button
                key={item.key}
                onClick={() => setActiveTab(item.key as any)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                  activeTab === item.key
                    ? 'bg-red-600 text-white shadow-lg shadow-red-900/30'
                    : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                }`}
              >
                <span className="text-base">{item.icon}</span>
                {item.label}
              </button>
            ))}
          </nav>
          <div className="p-4 border-t border-gray-800">
            <div className="flex items-center gap-3 px-3 py-2">
              <div className="w-8 h-8 bg-gray-700 rounded-full flex items-center justify-center text-xs font-bold">A</div>
              <div>
                <div className="text-xs font-semibold text-white">Admin</div>
                <div className="text-xs text-gray-500">Süper Yönetici</div>
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto bg-gray-950">
          {/* Header */}
          <div className="sticky top-0 z-10 bg-gray-950 border-b border-gray-800 px-8 py-4 flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-white">
                {activeTab === 'dashboard' && 'Dashboard'}
                {activeTab === 'users' && 'Kullanıcı Yönetimi'}
                {activeTab === 'plans' && 'Abonelik Planları'}
                {activeTab === 'logs' && 'Sistem Logları'}
              </h1>
              <p className="text-xs text-gray-500 mt-0.5">
                {new Date().toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
            </div>
            <button
              onClick={() => { fetchUsers(); fetchStats(); fetchPlans(); }}
              className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-xl text-sm text-gray-300 transition"
            >
              <span>🔄</span> Yenile
            </button>
          </div>

          <div className="p-8">
            {/* DASHBOARD TAB */}
            {activeTab === 'dashboard' && (
              <div className="space-y-8">
                {/* Stats Grid */}
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-5">
                  {[
                    { label: 'Toplam Kullanıcı', value: stats.total_users, icon: '👥', color: 'blue', change: '+12%' },
                    { label: 'Aktif Kullanıcı', value: stats.active_users, icon: '✅', color: 'green', change: '+8%' },
                    { label: 'Premium Üye', value: stats.premium_users, icon: '⭐', color: 'yellow', change: '+23%' },
                    { label: 'Toplam Gelir', value: formatCurrency(stats.total_revenue), icon: '💰', color: 'emerald', change: '+15%' },
                    { label: 'Bugün Yeni', value: stats.new_users_today, icon: '🆕', color: 'purple', change: '' },
                    { label: 'Aktif Abonelik', value: stats.active_subscriptions, icon: '📱', color: 'red', change: '+5%' },
                  ].map((stat, i) => (
                    <div key={i} className="bg-gray-900 border border-gray-800 rounded-2xl p-5 hover:border-gray-700 transition">
                      <div className="flex items-start justify-between mb-4">
                        <div className="w-10 h-10 bg