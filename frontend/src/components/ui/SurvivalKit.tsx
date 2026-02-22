import { useState } from 'react';
import { Briefcase, CheckCircle2, Circle, AlertTriangle } from 'lucide-react';

const INITIAL_ITEMS = [
    { id: 1, text: 'Su (Kişi başı günlük 4 litre)', checked: false },
    { id: 2, text: 'Enerji veren gıdalar (Konserve, bisküvi vb.)', checked: false },
    { id: 3, text: 'İlk yardım çantası', checked: false },
    { id: 4, text: 'Pilli radyo ve yedek piller', checked: false },
    { id: 5, text: 'Fener ve yedek piller', checked: false },
    { id: 6, text: 'Kişisel nakit para', checked: false },
    { id: 7, text: 'Kibrit / Çakmak', checked: false },
    { id: 8, text: 'Düdük', checked: false },
    { id: 9, text: 'Hijyen malzemeleri (Sabun, maske vb.)', checked: false },
];

/**
 * Survival Kit Checklist component.
 */
export default function SurvivalKit() {
    const [items, setItems] = useState(INITIAL_ITEMS);

    const toggleItem = (id: number) => {
        setItems(items.map(item =>
            item.id === id ? { ...item, checked: !item.checked } : item
        ));
    };

    const progress = Math.round((items.filter(i => i.checked).length / items.length) * 100);

    return (
        <div className="bg-dark-surface border border-dark-border rounded-2xl overflow-hidden shadow-xl">
            <div className="p-5 border-b border-dark-border bg-dark/30 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Briefcase className="w-5 h-5 text-primary" />
                    <h3 className="font-bold text-slate-100 uppercase text-sm tracking-wider">Deprem Çantası</h3>
                </div>
                <div className="text-[10px] font-black bg-primary/10 text-primary px-2 py-1 rounded-md">
                    %{progress} TAMAMLANDI
                </div>
            </div>

            <div className="p-4 space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar">
                {items.map(item => (
                    <button
                        key={item.id}
                        onClick={() => toggleItem(item.id)}
                        className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all border ${item.checked
                            ? 'bg-primary/5 border-primary/20 text-slate-300'
                            : 'bg-dark/50 border-transparent text-slate-500 hover:border-dark-border'
                            }`}
                    >
                        {item.checked ? (
                            <CheckCircle2 className="w-5 h-5 text-primary" />
                        ) : (
                            <Circle className="w-5 h-5 text-slate-700" />
                        )}
                        <span className={`text-xs font-medium ${item.checked ? 'line-through opacity-50' : ''}`}>
                            {item.text}
                        </span>
                    </button>
                ))}
            </div>

            {progress < 100 && (
                <div className="p-4 bg-amber-500/5 border-t border-amber-500/10 flex items-start gap-3">
                    <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                    <p className="text-[10px] text-amber-500/80 font-medium">
                        Çantanız henüz eksik. En kısa sürede tüm malzemeleri tamamlamanız hayati önem taşır.
                    </p>
                </div>
            )}
        </div>
    );
}
