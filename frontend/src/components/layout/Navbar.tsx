import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Search, Bell, Map as MapIcon, Shield, LayoutDashboard, X, Settings } from 'lucide-react';
import NotificationSettings from '../notifications/NotificationSettings';
import { AnimatePresence, motion } from 'framer-motion';
import { useAuthStore } from '../../store/useAuthStore';

/**
 * Main application navigation bar with Stitch aesthetic.
 */
export default function Navbar() {
    const [showNotifications, setShowNotifications] = useState(false);
    const location = useLocation();
    const { user } = useAuthStore();

    return (
        <nav className="h-16 border-b border-dark-border bg-dark-surface sticky top-0 z-[1000] px-6 flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2 group">
                <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center transition-transform group-hover:rotate-12">
                    <Shield className="text-white w-5 h-5" />
                </div>
                <span className="text-xl font-black tracking-tighter text-white">QuakeSense</span>
            </Link>

            <div className="hidden md:flex items-center gap-8">
                <NavLink to="/" icon={<LayoutDashboard size={18} />} label="Dashboard" active={location.pathname === '/'} />
                <NavLink to="/map" icon={<MapIcon size={18} />} label="Harita" active={location.pathname === '/map'} />
                <NavLink icon={<Shield size={18} />} label="Risk Analizi" />
            </div>

            <div className="flex items-center gap-4">
                <button className="p-2 text-slate-400 hover:text-white transition-colors">
                    <Search size={20} />
                </button>
                <div className="relative">
                    <button
                        onClick={() => setShowNotifications(!showNotifications)}
                        className={`p-2 transition-colors relative ${showNotifications ? 'text-primary' : 'text-slate-400 hover:text-white'}`}
                    >
                        <Bell size={20} />
                        {!showNotifications && <span className="absolute top-1 right-1 w-2 h-2 bg-primary rounded-full" />}
                    </button>

                    <AnimatePresence>
                        {showNotifications && (
                            <>
                                {/* Backdrop */}
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    onClick={() => setShowNotifications(false)}
                                    className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[1001]"
                                />
                                {/* Modal Content */}
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.95, y: 10 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95, y: 10 }}
                                    className="absolute right-0 mt-4 w-[400px] z-[1002]"
                                >
                                    <div className="relative">
                                        <button
                                            onClick={() => setShowNotifications(false)}
                                            className="absolute top-4 right-4 text-slate-500 hover:text-white z-10"
                                        >
                                            <X size={20} />
                                        </button>
                                        <NotificationSettings onClose={() => setShowNotifications(false)} />
                                    </div>
                                </motion.div>
                            </>
                        )}
                    </AnimatePresence>
                </div>

                {user ? (
                    <Link to="/settings" className={`p-2 rounded-xl transition-all flex items-center gap-2 ${location.pathname === '/settings' ? 'bg-primary/10 text-primary border border-primary/20' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
                        <Settings size={20} />
                        <span className="text-xs font-bold hidden lg:block">AYARLAR</span>
                    </Link>
                ) : (
                    <Link to="/login" className="px-5 py-2 bg-primary text-white text-xs font-black rounded-lg hover:bg-primary-dark transition-all">
                        GİRİŞ YAP
                    </Link>
                )}
            </div>
        </nav>
    );
}

function NavLink({ icon, label, to = "#", active = false }: { icon: React.ReactNode, label: string, to?: string, active?: boolean }) {
    return (
        <Link to={to} className={`flex items-center gap-2 text-sm font-bold transition-all ${active ? 'text-primary' : 'text-slate-400 hover:text-slate-100'
            }`}>
            {icon}
            {label}
        </Link>
    );
}
