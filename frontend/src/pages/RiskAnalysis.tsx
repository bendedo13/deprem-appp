import RiskTool from '../components/ui/RiskTool';
import { ShieldCheck, Info } from 'lucide-react';

export default function RiskAnalysis() {
    return (
        <div className="max-w-4xl mx-auto p-4 sm:p-8 space-y-8">
            <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-primary/20 rounded-2xl flex items-center justify-center text-primary shadow-lg shadow-primary/10">
                    <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                    <h1 className="text-3xl font-black text-slate-100 italic uppercase italic tracking-tighter">Risk Analiz Merkezi</h1>
                    <p className="text-sm text-slate-500">Bina özellikleri ve zemin yapısına göre sismik risk değerlendirmesi</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2">
                    <RiskTool />
                </div>

                <div className="space-y-6">
                    <div className="bg-dark-surface border border-dark-border p-6 rounded-2xl shadow-xl">
                        <div className="flex items-center gap-2 mb-4 text-primary">
                            <Info size={18} />
                            <h3 className="font-bold uppercase text-xs tracking-widest">Nasıl Hesaplanır?</h3>
                        </div>
                        <div className="space-y-4">
                            <p className="text-xs text-slate-400 leading-relaxed">
                                Analizimiz, Kandilli Rasathanesi ve AFAD verilerini temel alarak şu faktörleri değerlendirir:
                            </p>
                            <ul className="space-y-3">
                                <li className="flex items-start gap-2 text-[11px] text-slate-300">
                                    <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1 shrink-0"></span>
                                    <span>Bölgenin tarihsel sismik aktivite yoğunluğu.</span>
                                </li>
                                <li className="flex items-start gap-2 text-[11px] text-slate-300">
                                    <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1 shrink-0"></span>
                                    <span>Bina yapım yılına göre yönetmelik uyumluluğu.</span>
                                </li>
                                <li className="flex items-start gap-2 text-[11px] text-slate-300">
                                    <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1 shrink-0"></span>
                                    <span>Zemin sınıfı ve sismik dalga hızı etkileşimi.</span>
                                </li>
                            </ul>
                        </div>
                    </div>

                    <div className="bg-primary/5 border border-primary/20 p-6 rounded-2xl">
                        <h4 className="font-bold text-white text-sm mb-2">Önemli Uyarı</h4>
                        <p className="text-[10px] text-slate-400 leading-relaxed">
                            Bu araç yalnızca genel bir bilgilendirme amaçlıdır. Profesyonel bir yapı denetimi veya deprem dayanıklılık raporu yerine geçmez. Lütfen yetkili kuruluşlara başvurun.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
