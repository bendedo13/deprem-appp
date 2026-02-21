import { ReactNode } from 'react';
import { NavLink, Outlet, Navigate } from 'react-router-dom';
import {
    LayoutDashboard,
    Users,
    Activity,
    Send,
    Settings,
    LogOut,
    Menu,
    X,
    ShieldCheck
} from 'lucide-react';
import { useState } from 'react';
import { useAuthStore } from '../../store/useAuthStore';

export default function AdminLayout() {
    const [isSidebarOpen, setSidebarOpen] = useState(false);
    const { user, logout } = useAuthStore();

    // Protection: Only admins can access
    if (!user || !user.is_admin) {
        return <Navigate to="/" replace />;
    }

    const navItems = [
        { icon: <LayoutDashboard size={20} />, label: 'Dashboard', path: '/admin' },
        { icon: <Users size={20} />, label: 'Kullanıcılar', path: '/admin/users' },
        { icon: <Activity size={20} />, label: 'Depremler', path: '/admin/earthquakes' },
        { icon: <Send size={20} />, label: 'Broadcast', path: '/admin/broadcast' },
    ];

    return (
        <div className="min-h-screen bg-dark flex">
            {/* Sidebar Desktop */}
            <aside className="hidden lg:flex flex-col w-64 bg-dark-surface border-r border-dark-border">
                <div className="p-6 flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/20">
                        <ShieldCheck className="text-white" size={24} />
                    </div>
                    <div>
                        <h1 className="font-black text-white italic tracking-tighter text-xl">QUAKE<span className="text-primary">ADMIN</span></h1>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">SaaS Control Panel</p>
                    </div>
                </div>

                <nav className="flex-1 px-4 py-6 space-y-2">
                    {navItems.map((item) => (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            end={item.path === '/admin'}
                            className={({ isActive }) => `
                                flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200
                                ${isActive
                                    ? 'bg-primary/10 text-primary border border-primary/20 shadow-inner'
                                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                                }
                            `}
                        >
                            {item.icon}
                            <span className="font-bold text-sm">{item.label}</span>
                        </NavLink>
                    ))}
                </nav>

                <div className="p-4 border-t border-dark-border">
                    <button
                        onClick={logout}
                        className="flex items-center gap-3 w-full px-4 py-3 text-slate-400 hover:text-red-400 hover:bg-red-400/5 rounded-xl transition-all font-bold text-sm"
                    >
                        <LogOut size={20} />
                        Çıkış Yap
                    </button>
                </div>
            </aside>

            {/* Mobile Header */}
            <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-dark-surface border-b border-dark-border z-40 px-4 flex items-center justify-between">
                <button onClick={() => setSidebarOpen(true)} className="p-2 text-slate-400">
                    <Menu size={24} />
                </button>
                <h1 className="font-black text-white italic text-lg tracking-tighter">QUAKE<span className="text-primary">ADMIN</span></h1>
                <div className="w-10" />
            </div>

            {/* Main Content */}
            <main className="flex-1 lg:ml-0 mt-16 lg:mt-0 p-4 lg:p-8 overflow-x-hidden">
                <div className="max-w-7xl mx-auto">
                    <Outlet />
                </div>
            </main>

            {/* Mobile Sidebar Overlay */}
            {isSidebarOpen && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 lg:hidden">
                    <aside className="w-72 h-full bg-dark-surface border-r border-dark-border p-6 flex flex-col">
                        <div className="flex items-center justify-between mb-8">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                                    <ShieldCheck className="text-white" size={20} />
                                </div>
                                <h1 className="font-black text-white italic tracking-tighter">QUAKE<span className="text-primary">ADMIN</span></h1>
                            </div>
                            <button onClick={() => setSidebarOpen(false)} className="p-1 text-slate-400">
                                <X size={24} />
                            </button>
                        </div>

                        <nav className="space-y-2 flex-1">
                            {navItems.map((item) => (
                                <NavLink
                                    key={item.path}
                                    to={item.path}
                                    onClick={() => setSidebarOpen(false)}
                                    className={({ isActive }) => `
                                        flex items-center gap-3 px-4 py-3 rounded-xl transition-all
                                        ${isActive ? 'bg-primary/20 text-primary' : 'text-slate-400'}
                                    `}
                                >
                                    {item.icon}
                                    <span className="font-bold">{item.label}</span>
                                </NavLink>
                            ))}
                        </nav>

                        <button
                            onClick={logout}
                            className="flex items-center gap-3 w-full px-4 py-3 text-red-400 hover:bg-red-400/5 rounded-xl transition-all font-bold mt-auto"
                        >
                            <LogOut size={20} />
                            Çıkış Yap
                        </button>
                    </aside>
                </div>
            )}
        </div>
    );
}
