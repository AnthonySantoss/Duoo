import React, { useState, useEffect } from 'react';
import { Bell, X } from 'lucide-react';
import { useNotifications } from '../../context/NotificationContext';

const NotificationPermissionBanner = () => {
    const { requestBrowserNotificationPermission } = useNotifications();
    const [show, setShow] = useState(false);

    useEffect(() => {
        // Verificar se já perguntou antes
        const askedBefore = localStorage.getItem('notificationPermissionAsked');
        const enabled = localStorage.getItem('notificationsEnabled');

        // Mostrar banner se:
        // 1. Nunca perguntou antes
        // 2. Navegador suporta notificações
        // 3. Permissão ainda não foi concedida ou negada
        if (
            !askedBefore &&
            'Notification' in window &&
            Notification.permission === 'default' &&
            enabled !== 'false'
        ) {
            // Esperar 3 segundos antes de mostrar para não ser intrusivo
            setTimeout(() => {
                setShow(true);
            }, 3000);
        }
    }, []);

    const handleAllow = async () => {
        const granted = await requestBrowserNotificationPermission();
        localStorage.setItem('notificationPermissionAsked', 'true');
        setShow(false);

        if (granted) {
            // Enviar notificação de teste
            if ('Notification' in window && Notification.permission === 'granted') {
                new Notification('🎉 Notificações Ativadas!', {
                    body: 'Você receberá alertas importantes sobre suas finanças.',
                    icon: '/logo.png',
                    tag: 'welcome-notification'
                });
            }
        }
    };

    const handleDismiss = () => {
        localStorage.setItem('notificationPermissionAsked', 'true');
        localStorage.setItem('notificationsEnabled', 'false');
        setShow(false);
    };

    if (!show) return null;

    return (
        <div className="fixed bottom-4 right-4 z-50 max-w-md animate-slide-up">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 p-6">
                <div className="flex items-start gap-4">
                    <div className="p-3 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl flex-shrink-0">
                        <Bell className="text-emerald-600 dark:text-emerald-400" size={24} />
                    </div>
                    <div className="flex-1">
                        <h3 className="font-bold text-slate-900 dark:text-white mb-1">
                            Ativar Notificações?
                        </h3>
                        <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                            Receba alertas importantes sobre metas, faturas e orçamentos mesmo quando não estiver usando o app.
                        </p>
                        <div className="flex gap-2">
                            <button
                                onClick={handleAllow}
                                className="flex-1 py-2 px-4 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl transition-colors text-sm"
                            >
                                Permitir
                            </button>
                            <button
                                onClick={handleDismiss}
                                className="flex-1 py-2 px-4 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 font-medium rounded-xl transition-colors text-sm"
                            >
                                Agora não
                            </button>
                        </div>
                    </div>
                    <button
                        onClick={handleDismiss}
                        className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors flex-shrink-0"
                    >
                        <X size={20} />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default NotificationPermissionBanner;
