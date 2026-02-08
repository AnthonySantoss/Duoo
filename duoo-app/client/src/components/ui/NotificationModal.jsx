import React, { useEffect, useState } from 'react';
import { Trophy, Sparkles, X, Heart, Wallet, Target, CreditCard, Bell } from 'lucide-react';

const NotificationModal = ({ notification, onClose }) => {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        if (notification) {
            setTimeout(() => setIsVisible(true), 50);
        }
    }, [notification]);

    if (!notification) return null;

    const handleClose = () => {
        setIsVisible(false);
        setTimeout(onClose, 300); // Wait for animation
    };

    const getIcon = (type) => {
        switch (type) {
            case 'note':
                return {
                    icon: <Heart size={64} className="text-white fill-white" />,
                    bg: 'from-rose-400 to-pink-500',
                    shadow: 'shadow-rose-500/30',
                    sparkles: 'text-rose-400'
                };
            case 'transaction':
                return {
                    icon: <Wallet size={64} className="text-white" />,
                    bg: 'from-blue-400 to-indigo-500',
                    shadow: 'shadow-blue-500/30',
                    sparkles: 'text-blue-400'
                };
            case 'goal_progress':
                return {
                    icon: <Target size={64} className="text-white" />,
                    bg: 'from-emerald-400 to-teal-500',
                    shadow: 'shadow-emerald-500/30',
                    sparkles: 'text-emerald-400'
                };
            case 'invoice':
                return {
                    icon: <CreditCard size={64} className="text-white" />,
                    bg: 'from-orange-400 to-red-500',
                    shadow: 'shadow-orange-500/30',
                    sparkles: 'text-orange-400'
                };
            case 'achievement':
                return {
                    icon: <Trophy size={64} className="text-white" />,
                    bg: 'from-amber-400 to-yellow-500',
                    shadow: 'shadow-amber-500/30',
                    sparkles: 'text-amber-400'
                };
            default:
                return {
                    icon: <Bell size={64} className="text-white" />,
                    bg: 'from-slate-400 to-gray-500',
                    shadow: 'shadow-slate-500/30',
                    sparkles: 'text-slate-400'
                };
        }
    };

    const style = getIcon(notification.type);

    return (
        <>
            {/* Overlay */}
            <div
                className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] transition-opacity duration-300 ${isVisible ? 'opacity-100' : 'opacity-0'
                    }`}
                onClick={handleClose}
            />

            {/* Modal */}
            <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 pointer-events-none">
                <div
                    className={`bg-white dark:bg-slate-900 rounded-3xl shadow-2xl max-w-md w-full p-8 relative pointer-events-auto border border-slate-100 dark:border-slate-800 transition-all duration-500 ${isVisible
                        ? 'scale-100 opacity-100 translate-y-0'
                        : 'scale-75 opacity-0 translate-y-8'
                        }`}
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Close button */}
                    <button
                        onClick={handleClose}
                        className="absolute top-4 right-4 p-2 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                    >
                        <X size={20} className="text-slate-600 dark:text-slate-300" />
                    </button>

                    {/* Sparkles decoration */}
                    <div className="absolute -top-2 -right-2 animate-bounce">
                        <Sparkles className={style.sparkles} size={32} />
                    </div>
                    <div className="absolute -bottom-2 -left-2 animate-bounce delay-150">
                        <Sparkles className={style.sparkles} size={24} />
                    </div>

                    {/* Content */}
                    <div className="text-center space-y-6">
                        {/* Icon with animation */}
                        <div className="relative inline-block">
                            <div className={`absolute inset-0 bg-gradient-to-br ${style.bg} opacity-30 rounded-full blur-2xl animate-pulse`} />
                            <div className={`relative bg-gradient-to-br ${style.bg} p-6 rounded-full shadow-lg transform hover:scale-110 transition-transform`}>
                                {style.icon}
                            </div>
                        </div>

                        {/* Title */}
                        <div>
                            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                                {notification.title}
                            </h2>
                        </div>

                        {/* Description */}
                        <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed">
                            {notification.message}
                        </p>

                        {/* Action Button */}
                        <button
                            onClick={handleClose}
                            className={`w-full bg-gradient-to-r ${style.bg} text-white font-bold py-4 px-8 rounded-2xl shadow-lg ${style.shadow} transition-all transform hover:scale-105 active:scale-95`}
                        >
                            Continuar
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
};

export default NotificationModal;
