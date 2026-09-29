import React, { useEffect } from 'react';
import { AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';

const Toast = ({ message, type = 'info', onClose, duration = 3000 }) => {
    useEffect(() => {
        const timer = setTimeout(onClose, duration);
        return () => clearTimeout(timer);
    }, [duration, onClose]);

    const variants = {
        success: { icon: CheckCircle2, tone: 'text-emerald-600 dark:text-emerald-400', border: 'border-l-emerald-500' },
        error: { icon: AlertTriangle, tone: 'text-rose-600 dark:text-rose-400', border: 'border-l-rose-500' },
        info: { icon: Info, tone: 'text-slate-500 dark:text-slate-300', border: 'border-l-slate-400' }
    };
    const variant = variants[type] || variants.info;
    const Icon = variant.icon;

    return (
        <div
            role={type === 'error' ? 'alert' : 'status'}
            aria-live={type === 'error' ? 'assertive' : 'polite'}
            className={`fixed bottom-4 right-4 z-50 flex w-[calc(100vw-2rem)] max-w-sm items-start gap-3 rounded-2xl border border-slate-200 border-l-4 bg-white px-4 py-3.5 text-slate-700 shadow-[0_16px_40px_-20px_rgba(15,23,42,0.3)] animate-in slide-in-from-bottom-2 duration-200 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 motion-reduce:animate-none ${variant.border}`}
        >
            <Icon size={18} className={`mt-0.5 shrink-0 ${variant.tone}`} strokeWidth={2} />
            <p className="min-w-0 flex-1 text-sm font-medium leading-5">{message}</p>
            <button
                onClick={onClose}
                aria-label="Fechar mensagem"
                className="-mr-1 -mt-1 rounded-lg p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            >
                <X size={16} />
            </button>
        </div>
    );
};

export default Toast;
