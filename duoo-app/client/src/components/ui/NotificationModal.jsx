import React, { useEffect, useId, useState } from 'react';
import { AlertCircle, Bell, CheckCircle2, CreditCard, Target, Wallet, X } from 'lucide-react';
import { normalizeNotificationTitle } from '../../utils/notificationText';

const NotificationModal = ({ notification, onClose }) => {
    const [isVisible, setIsVisible] = useState(false);
    const titleId = useId();

    useEffect(() => {
        if (!notification) return undefined;

        const showTimer = window.setTimeout(() => setIsVisible(true), 20);
        const handleKeyDown = (event) => {
            if (event.key === 'Escape') onCloseWithAnimation();
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => {
            window.clearTimeout(showTimer);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [notification]);

    if (!notification) return null;

    const onCloseWithAnimation = () => {
        setIsVisible(false);
        window.setTimeout(onClose, 180);
    };

    const getIcon = (type) => {
        switch (type) {
            case 'transaction':
                return { icon: Wallet, tone: 'bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-300' };
            case 'goal_progress':
                return { icon: Target, tone: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-300' };
            case 'invoice':
                return { icon: CreditCard, tone: 'bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-300' };
            case 'budget_alert':
                return { icon: AlertCircle, tone: 'bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-300' };
            case 'achievement':
                return { icon: CheckCircle2, tone: 'bg-violet-50 text-violet-600 dark:bg-violet-950/40 dark:text-violet-300' };
            default:
                return { icon: Bell, tone: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300' };
        }
    };

    const { icon: Icon, tone } = getIcon(notification.type);

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" role="presentation">
            <button
                aria-label="Fechar notificação"
                className={`absolute inset-0 cursor-default bg-slate-950/20 backdrop-blur-[2px] transition-opacity duration-200 motion-reduce:transition-none ${isVisible ? 'opacity-100' : 'opacity-0'}`}
                onClick={onCloseWithAnimation}
            />
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                className={`relative w-full max-w-[420px] rounded-[24px] border border-slate-200/80 bg-white p-6 shadow-[0_24px_70px_-24px_rgba(15,23,42,0.3)] transition duration-200 dark:border-slate-800 dark:bg-slate-900 motion-reduce:transition-none ${isVisible ? 'translate-y-0 scale-100 opacity-100' : 'translate-y-2 scale-[.98] opacity-0'}`}
            >
                <button
                    aria-label="Fechar notificação"
                    onClick={onCloseWithAnimation}
                    className="absolute right-4 top-4 rounded-xl p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                >
                    <X size={18} />
                </button>

                <div className="flex items-start gap-4 pr-8">
                    <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${tone}`}>
                        <Icon size={21} strokeWidth={1.8} />
                    </div>
                    <div className="min-w-0">
                        <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Duoo</p>
                        <h2 id={titleId} className="text-lg font-semibold leading-snug text-slate-950 dark:text-white">
                            {normalizeNotificationTitle(notification.title)}
                        </h2>
                    </div>
                </div>

                <p className="mt-5 text-sm leading-6 text-slate-600 dark:text-slate-300">{notification.message}</p>

                <button
                    onClick={onCloseWithAnimation}
                    className="mt-6 w-full rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 focus:outline-none focus:ring-4 focus:ring-emerald-500/20"
                >
                    Entendi
                </button>
            </div>
        </div>
    );
};

export default NotificationModal;
