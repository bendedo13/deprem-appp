import { useEffect, useState } from 'react';
import {
    Users,
    Activity,
    ShieldCheck,
    Bell,
    TrendingUp,
    Clock
} from 'lucide-react';
import { adminService } from '../../services/api';
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
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const data = await adminService.getStats();
                setStats(data);
            } catch (error) {
                console.error('Failed to fetch admin stats:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchStats();
    }, []);

    if (loading || !stats) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    const cards = [
        { label: 'Toplam Kullanıcı', value: stats.total_users, sub: `Aktif: ${stats.active_users}`, icon: <Users />, color: 'blue' },
        { label: 'Adminler', value: stats.admin_users, sub: 'Yönetim Ekibi', icon: <ShieldCheck />, color: 'primary' },
        { label: 'Deprem (24s)', value: stats.earthquakes_last_24h, sub: `7 Gün: ${stats.earthquakes_last_7d}`, icon: <Activity />, color: 'red' },
        { label: 'FCM Token', value: stats.users_with_fcm, sub: 'Push Bildirim Hazır', icon: <Bell />, color: 'green' },
    ];

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header */}
            <div>
                <h2 className="text-3xl font-black text-white italic tracking-tighter uppercase">Sistem Özeti</h2>
                <p className="text-slate-400 text-sm">QuakeSense SaaS platformuna ait gerçek zamanlı operasyonel veriler.</p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {cards.map((card, i) => (
                    <div key={i} className="bg-dark-surface border border-dark-border p-6 rounded-2xl relative overflow-hidden group">
                        <div className={`absolute top-0 right-0 p-3 bg-${card.color}/10 text-${card.color} rounded-bl-2xl opacity-50 group-hover:opacity-100 transition-opacity`}>
                            {card.icon}
                        </div>
                        <div className="space-y-1">
                            <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">{card.label}</p>
                            <h3 className="text-3xl font-black text-white italic">{card.value}</h3>
                            <p className="text-xs text-slate-400 font-bold">{card.sub}</p>
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
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={[
                                { name: 'Toplam', val: stats.total_users },
                                { name: 'Aktif', val: stats.active_users },
                                { name: 'Admin', val: stats.admin_users },
                                { name: 'FCM', val: stats.users_with_fcm },
                                { name: 'Konum', val: stats.users_with_location }
                            ]}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#1e1e2d" vertical={false} />
                                <XAxis dataKey="name" stroke="#52525b" fontSize={10} fontWeight="bold" axisLine={false} tickLine={false} />
                                <YAxis stroke="#52525b" fontSize={10} fontWeight="bold" axisLine={false} tickLine={false} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#1e1e2d', border: '1px solid #333', borderRadius: '12px' }}
                                    itemStyle={{ color: '#fff', fontWeight: 'bold' }}
                                />
                                <Bar dataKey="val" fill="#ff4d4d" radius={[6, 6, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="bg-dark-surface border border-dark-border rounded-2xl p-6">
                    <h4 className="text-sm font-black text-white uppercase italic tracking-widest mb-6 flex items-center gap-2">
                        <Clock size={16} className="text-blue-500" />
                        Sismik Aktivite
                    </h4>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={[
                                { name: 'Toplam', val: stats.total_earthquakes },
                                { name: '7 Gün', val: stats.earthquakes_last_7d },
                                { name: '24 Saat', val: stats.earthquakes_last_24h },
                                { name: 'Raporlar', val: stats.seismic_reports_total }
                            ]}>
                                <defs>
                                    <linearGradient id="colorVal" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#1e1e2d" vertical={false} />
                                <XAxis dataKey="name" stroke="#52525b" fontSize={10} fontWeight="bold" />
                                <YAxis stroke="#52525b" fontSize={10} fontWeight="bold" />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#1e1e2d', border: '1px solid #333', borderRadius: '12px' }}
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
