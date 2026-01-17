import React, { useEffect, useRef, useState } from 'react';
import { Loader2, Building2, CheckCircle, AlertCircle } from 'lucide-react';
import api from '../../services/api';

const PluggyConnect = ({ onSuccess, onError }) => {
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState(null); // 'connecting' | 'success' | 'error'
    const pluggyRef = useRef(null);

    const initPluggyConnect = async () => {
        setLoading(true);
        setStatus('connecting');

        try {
            // Get connect token from backend
            const response = await api.get('/pluggy/connect-token');
            const { connectToken } = response.data;

            // Dynamically load Pluggy SDK
            if (!window.PluggyConnect) {
                const script = document.createElement('script');
                script.src = 'https://cdn.pluggy.ai/pluggy-connect/v2.7.0/pluggy-connect.js';
                script.async = true;
                document.body.appendChild(script);

                await new Promise((resolve, reject) => {
                    script.onload = resolve;
                    script.onerror = () => reject(new Error('Failed to load Pluggy SDK'));
                });
            }

            // Initialize Pluggy Connect Widget
            const pluggyConnect = new window.PluggyConnect({
                connectToken,
                includeSandbox: true, // Set to false in production
                onSuccess: async (itemData) => {
                    console.log('Pluggy Connection Success:', itemData);

                    try {
                        // Send item data to backend for processing
                        await api.post('/pluggy/sync-item', { itemId: itemData.item.id });

                        setStatus('success');
                        onSuccess?.(itemData);

                        // Auto close after 2 seconds
                        setTimeout(() => {
                            setStatus(null);
                        }, 2000);
                    } catch (error) {
                        console.error('Failed to sync Pluggy item:', error);
                        setStatus('error');
                        onError?.(error);
                    }
                },
                onError: (error) => {
                    console.error('Pluggy Connection Error:', error);
                    setStatus('error');
                    onError?.(error);
                },
                onClose: () => {
                    setLoading(false);
                    if (status === 'connecting') {
                        setStatus(null);
                    }
                }
            });

            pluggyRef.current = pluggyConnect;
            pluggyConnect.init();

        } catch (error) {
            console.error('Failed to initialize Pluggy:', error);
            setStatus('error');
            setLoading(false);
            onError?.(error);
        }
    };

    useEffect(() => {
        return () => {
            // Cleanup
            if (pluggyRef.current && typeof pluggyRef.current.destroy === 'function') {
                pluggyRef.current.destroy();
            }
        };
    }, []);

    return (
        <div className="space-y-4">
            {!status && (
                <button
                    onClick={initPluggyConnect}
                    disabled={loading}
                    className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-bold py-4 px-6 rounded-xl transition-all shadow-lg shadow-emerald-500/30 hover:shadow-emerald-500/50 flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {loading ? (
                        <>
                            <Loader2 className="animate-spin" size={20} />
                            <span>Conectando...</span>
                        </>
                    ) : (
                        <>
                            <Building2 size={20} />
                            <span>Conectar Banco via Open Finance</span>
                        </>
                    )}
                </button>
            )}

            {status === 'success' && (
                <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-900/30 p-4 rounded-xl flex items-center gap-3 animate-fade-in">
                    <CheckCircle className="text-emerald-600 flex-shrink-0" size={24} />
                    <div>
                        <h4 className="font-bold text-emerald-800 dark:text-emerald-300">
                            Conexão realizada com sucesso!
                        </h4>
                        <p className="text-sm text-emerald-700 dark:text-emerald-400">
                            Suas transações estão sendo sincronizadas...
                        </p>
                    </div>
                </div>
            )}

            {status === 'error' && (
                <div className="bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-900/30 p-4 rounded-xl flex items-center gap-3 animate-fade-in">
                    <AlertCircle className="text-rose-600 flex-shrink-0" size={24} />
                    <div>
                        <h4 className="font-bold text-rose-800 dark:text-rose-300">
                            Erro ao conectar
                        </h4>
                        <p className="text-sm text-rose-700 dark:text-rose-400">
                            Tente novamente ou entre em contato com o suporte.
                        </p>
                    </div>
                    <button
                        onClick={() => setStatus(null)}
                        className="ml-auto text-rose-600 hover:text-rose-800 font-medium text-sm"
                    >
                        Fechar
                    </button>
                </div>
            )}

            {status === 'connecting' && (
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-900/30 p-4 rounded-xl">
                    <p className="text-sm text-blue-800 dark:text-blue-300">
                        <strong>💡 Dica:</strong> Uma janela do seu banco será aberta. Faça login normalmente e autorize o acesso aos seus dados financeiros de forma segura.
                    </p>
                </div>
            )}
        </div>
    );
};

export default PluggyConnect;
