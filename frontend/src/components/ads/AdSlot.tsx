/**
 * Placeholder for Google AdSense implementation.
 */
export default function AdSlot({ spot }: { spot: 'top' | 'sidebar' | 'list' }) {
    const styles = {
        top: "w-full h-24 mb-6",
        sidebar: "w-full h-64 mb-6",
        list: "w-full h-32 my-4"
    };

    return (
        <div className={`${styles[spot]} bg-dark-surface border border-dashed border-dark-border rounded-xl flex flex-col items-center justify-center opacity-40 group hover:opacity-100 transition-opacity`}>
            <span className="text-[10px] uppercase tracking-widest font-bold text-slate-500 mb-1">Advertisement</span>
            <div className="text-xs text-slate-600 font-medium">Google AdSense Slot ({spot})</div>
        </div>
    );
}
