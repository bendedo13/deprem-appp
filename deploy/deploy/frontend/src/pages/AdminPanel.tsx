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

interface SubscriptionPlan {
  id: string;
  name: string;
  price_monthly: number;
  price_yearly: number;
  features: string[];
  is_active: boolean;
  max_alerts: number;
  max_regions: number;
  sms_enabled: boolean;
  email_enabled: boolean;
  push_enabled: boolean;
}

interface Stats {
  total_users: number;
  active_users: number;
  premium_users: number;
  total_revenue: number;
  new_users_today: number;
  new_users_week: number;
}

const AdminPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'users' | 'plans' | 'settings'>('dashboard');
  const [users, setUsers] = useState<User[]>([]);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive' | 'premium' | 'free'>('all');
  const [sortField, setSortField] = useState<'created_at' | 'email' | 'full_name'>('created_at');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const usersPerPage = 10;

  const token = localStorage.getItem('token');

  const api = axios.create({
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
      const res = await api.get('/admin/stats');
      setStats(res.data);
    } catch {
      const mock: Stats = {
        total_users: 1284,
        active_users: 1102,
        premium_users: 347,
        total_revenue: 52340,
        new_users_today: 14,
        new_users_week: 87,
      };
      setStats(mock);
    }
  };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/users');
      setUsers(res.data);
    } catch {
      const mock: User[] = Array.from({ length: 25 }, (_, i) => ({
        id: i + 1,
        email: `kullanici${i + 1}@example.com`,
        full_name: `Kullanıcı ${i + 1}`,
        is_active: i % 5 !== 0,
        is_admin: i === 0,
        subscription_plan: i % 3 === 0 ? 'premium' : i % 4 === 0 ? 'pro' : 'free',
        subscription_status: i % 6 === 0 ? 'expired' : 'active',
        created_at: new Date(Date.now() - i * 86400000 * 3).toISOString(),
        last_login: new Date(Date.now() - i * 86400000).toISOString(),
        phone: `+90 5${String(Math.floor(Math.random() * 90000000 + 10000000))}`,
      }));
      setUsers(mock);
    } finally {
      setLoading(false);
    }
  };

  const fetchPlans = async () => {
    try {
      const res = await api.get('/admin/plans');
      setPlans(res.data);
    } catch {
      const mock: SubscriptionPlan[] = [
        {
          id: 'free',
          name: 'Ücretsiz',
          price_monthly: 0,
          price_yearly: 0,
          features: ['Temel deprem bildirimleri', '1 bölge takibi', 'Email bildirimleri'],
          is_active: true,
          max_alerts: 5,
          max_regions: 1,
          sms_enabled: false,
          email_enabled: true,
          push_enabled: true,
        },
        {
          id: 'premium',
          name: 'Premium',
          price_monthly: 49.99,
          price_yearly: 499.99,
          features: ['Gelişmiş bildirimler', '5 bölge takibi', 'SMS + Email + Push', 'Öncelikli destek'],
          is_active: true,
          max_alerts: 50,
          max_regions: 5,
          sms_enabled: true,
          email_enabled: true,
          push_enabled: true,
        },
        {
          id: 'pro',
          name: 'Pro',
          price_monthly: 99.99,
          price_yearly: 999.99,
          features: ['Sınırsız bildirimler', 'Sınırsız bölge', 'Tüm kanallar', '7/24 destek', 'API erişimi'],
          is_active: true,
          max_alerts: -1,
          max_regions: -1,
          sms_enabled: true,
          email_enabled: true,
          push_enabled: true,
        },
      ];
      setPlans(mock);
    }
  };

  const handleUpdateUser = async () => {
    if (!selectedUser) return;
    try {
      await api.put(`/admin/users/${selectedUser.id}`, selectedUser);
      setUsers(users.map(u => (u.id === selectedUser.id ? selectedUser : u)));
      setShowUserModal(false);
      showNotification('success', 'Kullanıcı başarıyla güncellendi.');
    } catch {
      showNotification('error', 'Güncelleme sırasında hata oluştu.');
    }
  };

  const handleDeleteUser = async (userId: number) => {
    if (!window.confirm('Bu kullanıcıyı silmek istediğinize emin misiniz?')) return;
    try {
      await api.delete(`/admin/users/${userId}`);
      setUsers(users.filter(u => u.id !== userId));
      showNotification('success', 'Kullanıcı silindi.');
    } catch {
      showNotification('error', 'Silme sırasında hata oluştu.');
    }
  };

  const handleToggleUserStatus = async (user: User) => {
    try {
      const updated = { ...user, is_active: !user.is_active };
      await api.patch(`/admin/users/${user.id}/status`, { is_active: updated.is_active });
      setUsers(users.map(u => (u.id === user.id ? updated : u)));
      showNotification('success', `Kullanıcı ${updated.is_active ? 'aktif' : 'pasif'} yapıldı.`);
    } catch {
      showNotification('error', 'Durum güncellenirken hata oluştu.');
    }
  };

  const handleUpdatePlan = async () => {
    if (!selectedPlan) return;
    try {
      await api.put(`/admin/plans/${selectedPlan.id}`, selectedPlan);
      setPlans(plans.map(p => (p.id === selectedPlan.id ? selectedPlan : p)));
      setShowPlanModal(false);
      showNotification('success', 'Plan başarıyla güncellendi.');
    } catch {
      showNotification('error', 'Plan güncellenirken hata oluştu.');
    }
  };

  const handleCreatePlan = () => {
    const newPlan: SubscriptionPlan = {
      id: `plan_${Date.now()}`,
      name: 'Yeni Plan',
      price_monthly: 0,
      price_yearly: 0,
      features: [],
      is_active: true,
      max_alerts: 10,
      max_regions: 2,
      sms_enabled: false,
      email_enabled: true,
      push_enabled: true,
    };
    setSelectedPlan(newPlan);
    setShowPlanModal(true);
  };

  const filteredUsers = users
    .filter(u => {
      const matchSearch =
        u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.phone?.includes(searchTerm);
      const matchFilter =
        filterStatus === 'all' ||
        (filterStatus === 'active' && u.is_active) ||
        (filterStatus === 'inactive' && !u.is_active) ||
        (filterStatus === 'premium' && u.subscription_plan !== 'free') ||
        (filterStatus === 'free' && u.subscription_plan === 'free');
      return matchSearch && matchFilter;
    })
    .sort((a, b) => {
      const valA = a[sortField] ?? '';
      const valB = b[sortField] ?? '';
      return sortDir === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
    });

  const totalPages = Math.ceil(filteredUsers.length / usersPerPage);
  const paginatedUsers = filteredUsers.slice((currentPage - 1) * usersPerPage, currentPage * usersPerPage);

  const planBadgeColor: Record<string, string> = {
    free: 'bg-gray-100 text-gray-700',
    premium: 'bg-yellow-100 text-yellow-800',
    pro: 'bg-purple-100 text-purple-800',
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Notification */}
      {notification && (
        <div
          className={`fixed top-5 right-5 z-50 px-6 py-3 rounded-xl shadow-lg text-white font-medium transition-all ${
            notification.type === 'success' ? 'bg-green-500' : 'bg-red-500'
          }`}
        >
          {notification.type === 'success' ? '✓ ' : '✗ '}
          {notification.message}
        </div>
      )}

      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-red-600 rounded-lg flex items-center justify-center">
              <span className="text-white text-lg">🌍</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">DepremApp</h1>
              <p className="text-xs text-gray-500">Admin Paneli</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
              <span className="text-red-600 text-sm font-bold">A</span>
            </div>
            <span className="text-sm text-gray-700 font-medium">Admin</span>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6">
          <nav className="flex gap-1">
            {[
              { key: 'dashboard', label: 'Dashboard', icon: '📊' },
              { key: 'users', label: 'Kullanıcılar', icon: '👥' },
              { key: 'plans', label: 'Abonelik Planları', icon: '💳' },
              { key: 'settings', label: 'Ayarlar', icon: '⚙️' },
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`flex items-center gap-2 px-5 py-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.key
                    ? 'border-red-500 text-red-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <span>{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* DASHBOARD */}
        {activeTab === 'dashboard' && stats && (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Genel Bakış</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
              {[
                { label: 'Toplam Kullanıcı', value: stats.total_users.toLocaleString(), icon: '👥', color: 'bg-blue-50 text-blue-700', border: 'border-blue-100' },
                { label: 'Aktif Kullanıcı', value: stats.active_users.toLocaleString(), icon: '✅', color: 'bg-green-50 text-green-700', border: 'border-green-100' },
                { label: 'Premium Kullanıcı', value: stats.premium_users.toLocaleString(), icon: '⭐', color: 'bg-yellow-50 text-yellow-700', border: 'border-yellow-100' },
                { label: 'Toplam Gelir', value: `₺${stats.total_revenue.toLocaleString()}`, icon: '💰', color: 'bg-purple-50 text-purple-700', border: 'border-purple-100' },
                { label: 'Bugün Yeni', value: stats.new_users_today.toLocaleString(), icon: '📈', color: 'bg-orange-50 text-orange-700', border