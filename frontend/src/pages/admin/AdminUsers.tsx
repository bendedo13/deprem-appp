import { useEffect, useState } from 'react';
import { adminService } from '../../services/api';
import {
    Search,
    MoreVertical,
    ToggleLeft,
    ToggleRight,
    Shield,
    Trash2,
    Calendar,
    Mail,
    MapPin,
    Smartphone
} from 'lucide-react';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { toast } from 'react-hot-toast';

export default function AdminUsers() {
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(0);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const data = await adminService.getUsers(page * 50, 50, search);
            setUsers(data);
        } catch (error) {
            toast.error('Kullanıcılar yüklenemedi');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const timer = setTimeout(fetchUsers, 300);
        return () => clearTimeout(timer);
    }, [search, page]);

    const handleToggleAdmin = async (user: any) => {
        try {
            await adminService.updateUser(user.id, { is_admin: !user.is_admin });
            toast.success('Admin yetkisi güncellendi');
            fetchUsers();
        } catch (error) {
            toast.error('Yetkilendirme hatası');
        }
    };

    const handleToggleActive = async (user: any) => {
        try {
            await adminService.updateUser(user.id, { is_active: !user.is_active });
            toast.success(user.is_active ? 'Kullanıcı donduruldu' : 'Kullanıcı aktifleşti');
            fetchUsers();
        } catch (error) {
            toast.error('Durum güncellenemedi');
        }
    };

    const handleDelete = async (user_id: number) => {
        if (!window.confirm('Kullanıcıyı silmek istediğinize emin misiniz?')) return;
        try {
            await adminService.deleteUser(user_id);
            toast.success('Kullanıcı silindi');
            fetchUsers();
        } catch (error) {
            toast.error('Silme işlemi başarısız');
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-black text-white italic tracking-tighter uppercase">Kullanıcı Yönetimi</h2>
                    <p className="text-slate-400 text-sm">Platform kullanıcılarını denetleyin, yetkilendirin ve yönetin.</p>
                </div>

                <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                    <input
                        type="text"
                        placeholder="E-posta ile ara..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="bg-dark-surface border border-dark-border rounded-xl pl-12 pr-4 py-3 text-white focus:border-primary outline-none transition-all w-80 font-bold"
                    />
                </div>
            </div>

            <div className="bg-dark-surface border border-dark-border rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-dark/50 border-b border-dark-border">
                            <tr>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Kullanıcı</th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Durum & Rol</th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Cihaz / Konum</th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Kayıt Tarihi</th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">İşlemler</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-dark-border">
                            {users.map((user) => (
                                <tr key={user.id} className="hover:bg-white/5 transition-colors group">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-black uppercase">
                                                {user.email[0]}
                                            </div>
                                            <div>
                                                <div className="font-bold text-white flex items-center gap-2">
                                                    {user.email}
                                                    {user.is_admin && <Shield size={14} className="text-primary" />}
                                                </div>
                                                <div className="text-xs text-slate-500">ID: #{user.id}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col gap-2">
                                            <span className={`px-2 py-1 rounded-md text-[10px] font-black w-fit uppercase ${user.is_active ? 'bg-green-500/10 text-green-500 border border-green-500/20' : 'bg-red-500/10 text-red-500 border border-red-500/20'}`}>
                                                {user.is_active ? 'AKTİF' : 'DONDURULDU'}
                                            </span>
                                            <span className={`px-2 py-1 rounded-md text-[10px] font-black w-fit uppercase ${user.is_admin ? 'bg-primary/10 text-primary border border-primary/20' : 'bg-slate-500/10 text-slate-500 border border-slate-500/20'}`}>
                                                {user.is_admin ? 'ADMİN' : 'STANDART'}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="space-y-1">
                                            <div className={`flex items-center gap-1.5 text-xs font-bold ${user.fcm_token ? 'text-blue-400' : 'text-slate-600'}`}>
                                                <Smartphone size={14} />
                                                {user.fcm_token ? 'Token Mevcut' : 'Cihaz Yok'}
                                            </div>
                                            <div className={`flex items-center gap-1.5 text-xs font-bold ${user.latitude ? 'text-slate-300' : 'text-slate-600'}`}>
                                                <MapPin size={14} />
                                                {user.latitude ? `${user.latitude.toFixed(2)}, ${user.longitude.toFixed(2)}` : 'Konum Kapalı'}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2 text-xs text-slate-400 font-bold">
                                            <Calendar size={14} />
                                            {format(new Date(user.created_at), 'd MMMM yyyy', { locale: tr })}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={() => handleToggleAdmin(user)}
                                                className={`p-2 rounded-lg transition-colors ${user.is_admin ? 'text-primary bg-primary/10' : 'text-slate-400 hover:bg-white/5'}`}
                                                title="Admin Yetkisi"
                                            >
                                                <Shield size={18} />
                                            </button>
                                            <button
                                                onClick={() => handleToggleActive(user)}
                                                className={`p-2 rounded-lg transition-colors ${user.is_active ? 'text-slate-400 hover:text-red-400 hover:bg-red-400/10' : 'text-green-400 bg-green-400/10'}`}
                                                title={user.is_active ? 'Dondur' : 'Aktif Et'}
                                            >
                                                {user.is_active ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                                            </button>
                                            <button
                                                onClick={() => handleDelete(user.id)}
                                                className="p-2 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-500/10 transition-colors"
                                                title="Sil"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {users.length === 0 && !loading && (
                    <div className="p-12 text-center text-slate-500 font-bold uppercase tracking-widest text-sm">
                        Kullanıcı bulunamadı
                    </div>
                )}
            </div>
        </div>
    );
}
