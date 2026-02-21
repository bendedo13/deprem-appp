import { useState } from 'react';
import { Search, Bell, User, Map as MapIcon, Shield, LayoutDashboard, X } from 'lucide-react';
import NotificationSettings from '../notifications/NotificationSettings';
import { AnimatePresence, motion } from 'framer-motion';

/**
 * Main application navigation bar with Stitch aesthetic.
 */
export default function Navbar() {
    const [showNotifications, setShowNotifications] = useState(false);

    return (
        <nav className="h-16 border-b border-dark-border bg-dark-surface sticky top-0 z-[1000] px-6 flex items-center justify-between">
            <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                    <Shield className="text-white w-5 h-5" />
                </div>
                <span className="text-xl font-black tracking-tighter text-white">QuakeSense</span>
            </div>

            <div className="hidden md:flex items-center gap-8">
                <NavLink icon={<LayoutDashboard size={18} />} label="Dashboard" active />
                <NavLink icon={<MapIcon size={18} />} label="Harita" />
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
                <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center cursor-pointer hover:border-primary transition-all">
                    <User size={18} className="text-slate-400" />
                </div>
            </div>
        </nav>
    );
}

function NavLink({ icon, label, active = false }: { icon: React.ReactNode, label: string, active?: boolean }) {
    return (
        <a href="#" className={`flex items-center gap-2 text-sm font-bold transition-all ${active ? 'text-primary' : 'text-slate-400 hover:text-slate-100'
            }`}>
            {icon}
            {label}
        </a>
    );
}
