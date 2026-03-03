import { useEffect, useState } from 'react';
import {
    Users,
    Activity,
    ShieldCheck,
    Bell,
    TrendingUp,
    Clock,
    AlertTriangle,
    Database,
    Server,
    CheckCircle2,
    XCircle
} from 'lucide-react';
import { adminService } from '../../services/api';
import type { AdminStats } from '../../types';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    AreaChart,
    Area
} from 'recharts';

export default function AdminDashboard() {
    const [stats, setStats] = useState<AdminStats | null>(null);
    const [health, setHealth] = useState<{ database: string; redis: string } | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [statsData, healthData] = await Promise.all([
                    adminService.getStats(),
                    adminService.getSystemHealth().catch(() => null),
                ]);
                setStats(statsData);
                setHealth(healthData);
            } catch (error) {
                console.error('Failed to fetch admin stats:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    if (loading || !stats) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    const statCards = [
        {
            label: 'Toplam Kullanıcı',
            value: stats.total_users,
            sub: `Aktif: ${stats.active_users}`,
            icon: <Users size={20} />,
            iconBg: 'bg-blue-500/10 text-blue-400',
        },
        {
            label: 'Admin Sayısı',
            value: stats.admin_users,
            sub: 'Yönetim Ekibi',
            icon: <ShieldCheck size={20} />,
            iconBg: 'bg-primary/10 text-primary',
        },
        {
            label: 'Deprem (24s)',
            value: stats.earthquakes_last_24h,
            sub: `7 Gün: ${stats.earthquakes_last_7d}`,
            icon: <Activity size={20} />,
            iconBg: 'bg-red-500/10 text-red-400',
        },
        {
            label: 'FCM Token',
            value: stats.users_with_fcm,
            sub: 'Push Bildirim Hazır',
            icon: <Bell size={20} />,
            iconBg: 'bg-green-500/10 text-green-400',
        },
        {
            label: 'SOS Kayıtları',
            value: stats.sos_records_total,
            sub: `24s: ${stats.sos_records_last_24h}`,
            icon: <AlertTriangle size={20} />,
            iconBg: 'bg-orange-500/10 text-orange-400',
        },
        {
            label: 'Premium Kullanıcı',
            value: stats.premium_users,
            sub: 'Ücretli Plan',
            icon: <TrendingUp size={20} />,
            iconBg: 'bg-yellow-500/10 text-yellow-400',
        },
    ];

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-black text-white italic tracking-tighter uppercase">Sistem Özeti</h2>
                    <p className="text-slate-400 text-sm">QuakeSense SaaS platformuna ait gerçek zamanlı operasyonel veriler.</p>
                </div>

                {/* System Health */}
                {health && (
                    <div className="flex items-center gap-3 bg-dark-surface border border-dark-border rounded-xl px-4 py-3">
                        <Server size={16} className="text-slate-400" />
                        <div className="flex items-center gap-3 text-xs font-bold">
                            <span className="flex items-center gap-1.5">
                                <Database size={14} />
                                <span className="text-slate-400">DB:</span>
                                {health.database === 'ok'
                                    ? <CheckCircle2 size={14} className="text-green-400" />
                                    : <XCircle size={14} className="text-red-400" />
                                }
                            </span>
                            <span className="flex items-center gap-1.5">
                                <span className="text-slate-400">Redis:</span>
                                {health.redis === 'ok'
                                    ? <CheckCircle2 size={14} className="text-green-400" />
                                    : <XCircle size={14} className="text-red-400" />
                                }
                            </span>
                        </div>
                    </div>
                )}
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {statCards.map((card, i) => (
                    <div key={i} className="bg-dark-surface border border-dark-border p-5 rounded-2xl relative overflow-hidden group hover:border-slate-600 transition-colors">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-4 ${card.iconBg}`}>
                            {card.icon}
                        </div>
                        <div className="space-y-0.5">
                            <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">{card.label}</p>
                            <h3 className="text-2xl font-black text-white italic">{card.value}</h3>
                            <p className="text-[11px] text-slate-400 font-bold">{card.sub}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Distribution Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-dark-surface border border-dark-border rounded-2xl p-6">
                    <h4 className="text-sm font-black text-white uppercase italic tracking-widest mb-6 flex items-center gap-2">
                        <TrendingUp size={16} className="text-primary" />
                        Kullanıcı Segmentasyonu
                    </h4>
                    <div className="h-[280px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={[
                                { name: 'Toplam', val: stats.total_users },
                                { name: 'Aktif', val: stats.active_users },
                                { name: 'Admin', val: stats.admin_users },
                                { name: 'FCM', val: stats.users_with_fcm },
                                { name: 'Konum', val: stats.users_with_location },
                                { name: 'Premium', val: stats.premium_users },
                            ]}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#1e1e2d" vertical={false} />
                                <XAxis dataKey="name" stroke="#52525b" fontSize={10} fontWeight="bold" axisLine={false} tickLine={false} />
                                <YAxis stroke="#52525b" fontSize={10} fontWeight="bold" axisLine={false} tickLine={false} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#111827', border: '1px solid #1f2937', borderRadius: '12px' }}
                                    itemStyle={{ color: '#fff', fontWeight: 'bold' }}
                                />
                                <Bar dataKey="val" fill="#f97316" radius={[6, 6, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="bg-dark-surface border border-dark-border rounded-2xl p-6">
                    <h4 className="text-sm font-black text-white uppercase italic tracking-widest mb-6 flex items-center gap-2">
                        <Clock size={16} className="text-blue-500" />
                        Sismik Aktivite
                    </h4>
                    <div className="h-[280px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={[
                                { name: 'Toplam', val: stats.total_earthquakes },
                                { name: '7 Gün', val: stats.earthquakes_last_7d },
                                { name: '24 Saat', val: stats.earthquakes_last_24h },
                                { name: 'SOS Total', val: stats.sos_records_total },
                                { name: 'SOS 24s', val: stats.sos_records_last_24h },
                            ]}>
                                <defs>
                                    <linearGradient id="colorVal" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#1e1e2d" vertical={false} />
                                <XAxis dataKey="name" stroke="#52525b" fontSize={10} fontWeight="bold" axisLine={false} tickLine={false} />
                                <YAxis stroke="#52525b" fontSize={10} fontWeight="bold" axisLine={false} tickLine={false} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#111827', border: '1px solid #1f2937', borderRadius: '12px' }}
                                    itemStyle={{ color: '#fff', fontWeight: 'bold' }}
                                />
                                <Area type="monotone" dataKey="val" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorVal)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>
    );
}
