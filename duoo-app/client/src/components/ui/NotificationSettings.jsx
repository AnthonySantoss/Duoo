import React, { useState, useEffect } from 'react';
import { Bell, BellOff, Check, X } from 'lucide-react';
import { useNotifications } from '../../context/NotificationContext';
import Card from './Card';
import api from '../../services/api';

const NotificationSettings = () => {
    const {
        requestBrowserNotificationPermission,
        isBrowserNotificationEnabled,
        setBrowserNotificationEnabled
    } = useNotifications();

    const [enabled, setEnabled] = useState(false);
    const [permission, setPermission] = useState('default');
    const [config, setConfig] = useState({
        daily_reminder_enabled: false,
        daily_reminder_hour: 20
    });

    useEffect(() => {
        setEnabled(isBrowserNotificationEnabled());
        if ('Notification' in window) {
            setPermission(Notification.permission);
        }
        
        api.get('/config').then(res => {
            if (res.data) {
                setConfig(res.data);
            }
        }).catch(err => console.error("Falhar ao carregar configs:", err));
    }, []);

    const updateConfig = async (newConfigParams) => {
        try {
            const updated = { ...config, ...newConfigParams };
            setConfig(updated); // Update UI optimistically
            await api.put('/config', updated);
        } catch (error) {
            console.error("Erro ao atualizar configs", error);
        }
    };

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

                    {/* Lembrete Diário Molecule */}
                    <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-800">
                        <div className="flex items-center justify-between mb-3">
                            <h4 className="font-bold text-slate-900 dark:text-white">
                                Lembrete de Atualização
                            </h4>
                            <button
                                onClick={() => updateConfig({ daily_reminder_enabled: !config.daily_reminder_enabled })}
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                                    config.daily_reminder_enabled ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'
                                }`}
                            >
                                <span
                                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                        config.daily_reminder_enabled ? 'translate-x-6' : 'translate-x-1'
                                    }`}
                                />
                            </button>
                        </div>
                        <p className="text-sm text-slate-500 mb-3">
                            Quer ser lembrado de registrar seus gastos diariamente? O Duoo te envia uma notificação móvel no horário definido.
                        </p>
                        
                        {config.daily_reminder_enabled && (
                            <div className="flex items-center gap-3 mt-4">
                                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                                    Horário ideal:
                                </label>
                                <select 
                                    aria-label="Definir horário do lembrete diário"
                                    value={config.daily_reminder_hour}
                                    onChange={(e) => updateConfig({ daily_reminder_hour: parseInt(e.target.value) })}
                                    className="rounded-lg border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm p-2 focus:ring-2 focus:ring-emerald-500 outline-none font-medium"
                                >
                                    {[...Array(24).keys()].map(h => (
                                        <option key={h} value={h}>
                                            {h.toString().padStart(2, '0')}:00
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}
                    </div>

                </div>
            </div>
        </Card>
    );
};

export default NotificationSettings;
