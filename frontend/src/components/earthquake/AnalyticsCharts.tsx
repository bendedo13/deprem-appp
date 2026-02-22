import React from 'react';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    BarChart,
    Bar,
    Cell,
    PieChart,
    Pie,
} from 'recharts';
import { Activity, MapPin, PieChart as PieIcon } from 'lucide-react';

interface DailyCount {
    date: string;
    count: number;
}

interface MagnitudeDistribution {
    range: string;
    count: number;
}

interface HotSpot {
    location: string;
    count: number;
    max_magnitude: number;
}

interface AnalyticsChartsProps {
    dailyCounts: DailyCount[];
    distribution: MagnitudeDistribution[];
    hotspots: HotSpot[];
}

const COLORS = ['#e00700', '#ff4d4d', '#ff8080', '#ffb3b3', '#ffe6e6'];

const AnalyticsCharts: React.FC<AnalyticsChartsProps> = ({
    dailyCounts = [],
    distribution = [],
    hotspots = [],
}) => {
    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Günlük Trend */}
            <div className="bg-dark-surface border border-dark-border rounded-2xl p-6 shadow-xl">
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                        <Activity className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-slate-100">Sismik Aktivite Trendi</h3>
                        <p className="text-xs text-slate-400">Son 7 günlük deprem frekansı</p>
                    </div>
                </div>
                <div className="h-[250px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={dailyCounts}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#3d1a1a" vertical={false} />
                            <XAxis
                                dataKey="date"
                                stroke="#64748b"
                                fontSize={12}
                                tickLine={false}
                                axisLine={false}
                                tickFormatter={(value) => value.split('-').slice(1).reverse().join('/')}
                            />
                            <YAxis
                                stroke="#64748b"
                                fontSize={12}
                                tickLine={false}
                                axisLine={false}
                            />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: '#1e0d0d',
                                    border: '1px solid #3d1a1a',
                                    borderRadius: '12px',
                                    color: '#f1f5f9'
                                }}
                                itemStyle={{ color: '#e00700' }}
                            />
                            <Line
                                type="monotone"
                                dataKey="count"
                                stroke="#e00700"
                                strokeWidth={3}
                                dot={{ fill: '#e00700', strokeWidth: 2, r: 4 }}
                                activeDot={{ r: 6, strokeWidth: 0 }}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Büyüklük Dağılımı */}
            <div className="bg-dark-surface border border-dark-border rounded-2xl p-6 shadow-xl">
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                        <PieIcon className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-slate-100">Şiddet Dağılımı</h3>
                        <p className="text-xs text-slate-400">Büyüklük aralıklarına göre yüzdeler</p>
                    </div>
                </div>
                <div className="h-[250px] w-full flex items-center justify-center">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={distribution}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={80}
                                paddingAngle={5}
                                dataKey="count"
                                nameKey="range"
                            >
                                {distribution.map((_, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: '#1e0d0d',
                                    border: '1px solid #3d1a1a',
                                    borderRadius: '12px'
                                }}
                                itemStyle={{ color: '#f1f5f9' }}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                    <div className="hidden sm:block">
                        <ul className="space-y-2">
                            {distribution.map((item, index) => (
                                <li key={item.range} className="flex items-center gap-2 text-xs text-slate-300">
                                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></span>
                                    {item.range}: {item.count}
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            </div>

            {/* Hotspots - Aktif Bölgeler */}
            <div className="bg-dark-surface border border-dark-border rounded-2xl p-6 shadow-xl lg:col-span-2">
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                        <MapPin className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-slate-100">En Aktif Bölgeler</h3>
                        <p className="text-xs text-slate-400">Deprem frekansı en yüksek 5 konum</p>
                    </div>
                </div>
                <div className="h-[200px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={hotspots}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#3d1a1a" vertical={false} />
                            <XAxis
                                dataKey="location"
                                stroke="#64748b"
                                fontSize={10}
                                tickLine={false}
                                axisLine={false}
                            />
                            <YAxis
                                stroke="#64748b"
                                fontSize={12}
                                tickLine={false}
                                axisLine={false}
                            />
                            <Tooltip
                                cursor={{ fill: 'rgba(224, 7, 0, 0.05)' }}
                                contentStyle={{
                                    backgroundColor: '#1e0d0d',
                                    border: '1px solid #3d1a1a',
                                    borderRadius: '12px'
                                }}
                            />
                            <Bar dataKey="count" fill="#e00700" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
};

export default AnalyticsCharts;
