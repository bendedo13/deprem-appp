import { Search, Bell, User, Map as MapIcon, Shield, LayoutDashboard } from 'lucide-react';

/**
 * Main application navigation bar with Stitch aesthetic.
 */
export default function Navbar() {
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
                <button className="p-2 text-slate-400 hover:text-white transition-colors relative">
                    <Bell size={20} />
                    <span className="absolute top-1 right-1 w-2 h-2 bg-primary rounded-full" />
                </button>
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
