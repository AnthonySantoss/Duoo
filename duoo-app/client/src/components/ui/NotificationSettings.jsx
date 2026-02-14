import React, { useState, useEffect } from 'react';
import { Bell, BellOff, Check, X } from 'lucide-react';
import { useNotifications } from '../../context/NotificationContext';
import Card from './Card';

const NotificationSettings = () => {
    const {
        requestBrowserNotificationPermission,
        isBrowserNotificationEnabled,
        setBrowserNotificationEnabled
    } = useNotifications();

    const [enabled, setEnabled] = useState(false);
    const [permission, setPermission] = useState('default');

    useEffect(() => {
        setEnabled(isBrowserNotificationEnabled());
        if ('Notification' in window) {
            setPermission(Notification.permission);
        }
    }, []);

    const handleToggle = async () => {
        if (!enabled) {
            // Tentar habilitar
            const granted = await requestBrowserNotificationPermission();
            if (granted) {
                setEnabled(true);
                setPermission('granted');
            } else {
                setPermission(Notification.permission);
            }
        } else {
            // Desabilitar
            setBrowserNotificationEnabled(false);
            setEnabled(false);
        }
    };

    const getStatusInfo = () => {
        if (permission === 'denied') {
            return {
                icon: <X className="text-red-500" size={20} />,
                text: 'Bloqueado pelo navegador',
                description: 'Você bloqueou as notificações. Para habilitar, acesse as configurações do navegador.',
                color: 'red'
            };
        }
        if (permission === 'granted' && enabled) {
            return {
                icon: <Check className="text-emerald-500" size={20} />,
                text: 'Ativado',
                description: 'Você receberá notificações do navegador mesmo quando não estiver na aba.',
                color: 'emerald'
            };
        }
        if (permission === 'granted' && !enabled) {
            return {
                icon: <BellOff className="text-amber-500" size={20} />,
                text: 'Desativado',
                description: 'Notificações do navegador estão desativadas. Clique para ativar.',
                color: 'amber'
            };
        }
        return {
            icon: <Bell className="text-blue-500" size={20} />,
            text: 'Não configurado',
            description: 'Clique para permitir notificações do navegador.',
            color: 'blue'
        };
    };

    const status = getStatusInfo();

    if (!('Notification' in window)) {
        return (
            <Card>
                <div className="flex items-start gap-4">
                    <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-xl">
                        <BellOff className="text-slate-400" size={24} />
                    </div>
                    <div className="flex-1">
                        <h3 className="font-bold text-slate-900 dark:text-white mb-1">
                            Notificações do Navegador
                        </h3>
                        <p className="text-sm text-slate-500">
                            Seu navegador não suporta notificações.
                        </p>
                    </div>
                </div>
            </Card>
        );
    }

    return (
        <Card>
            <div className="flex items-start gap-4">
                <div className={`p-3 bg-${status.color}-100 dark:bg-${status.color}-900/20 rounded-xl`}>
                    {status.icon}
                </div>
                <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="font-bold text-slate-900 dark:text-white">
                            Notificações do Navegador
                        </h3>
                        {permission !== 'denied' && (
                            <button
                                onClick={handleToggle}
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${enabled
                                        ? 'bg-emerald-500'
                                        : 'bg-slate-300 dark:bg-slate-600'
                                    }`}
                            >
                                <span
                                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${enabled ? 'translate-x-6' : 'translate-x-1'
                                        }`}
                                />
                            </button>
                        )}
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                        {status.icon}
                        <span className={`text-sm font-medium text-${status.color}-600 dark:text-${status.color}-400`}>
                            {status.text}
                        </span>
                    </div>
                    <p className="text-sm text-slate-500">
                        {status.description}
                    </p>
                    {permission === 'denied' && (
                        <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900/30 rounded-lg">
                            <p className="text-xs text-red-700 dark:text-red-400">
                                <strong>Como desbloquear:</strong>
                                <br />
                                1. Clique no ícone de cadeado ao lado da URL
                                <br />
                                2. Encontre "Notificações" nas permissões
                                <br />
                                3. Altere para "Permitir"
                                <br />
                                4. Recarregue a página
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </Card>
    );
};

export default NotificationSettings;
