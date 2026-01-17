import React, { useState, useEffect } from 'react';
import { Building2, Trash2, AlertCircle, CheckCircle } from 'lucide-react';
import api from '../../services/api';

const ConnectedAccounts = ({ onDisconnect }) => {
    const [connectedItems, setConnectedItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [disconnecting, setDisconnecting] = useState(null);

    useEffect(() => {
        fetchConnectedItems();
    }, []);

    const fetchConnectedItems = async () => {
        try {
            const response = await api.get('/pluggy/connected-items');
            setConnectedItems(response.data);
        } catch (error) {
            console.error('Failed to fetch connected items:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDisconnect = async (itemId, bankName) => {
        if (!confirm(`Tem certeza que deseja desconectar ${bankName}? Isso removerá todas as transações sincronizadas.`)) {
            return;
        }

        setDisconnecting(itemId);

        try {
            await api.delete(`/pluggy/disconnect/${itemId}`);
            setConnectedItems(items => items.filter(item => item.pluggy_item_id !== itemId));
            onDisconnect?.();
        } catch (error) {
            console.error('Failed to disconnect:', error);
            alert('Erro ao desconectar. Tente novamente.');
        } finally {
            setDisconnecting(null);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
            </div>
        );
    }

    if (connectedItems.length === 0) {
        return (
            <div className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-6 text-center">
                <Building2 size={48} className="mx-auto mb-3 text-slate-300 dark:text-slate-600" />
                <p className="text-slate-500 dark:text-slate-400 text-sm">
                    Nenhuma conta bancária conectada ainda.
                </p>
            </div>
        );
    }

    // Group by pluggy_item_id
    const groupedItems = connectedItems.reduce((acc, item) => {
        const itemId = item.pluggy_item_id;
        if (!acc[itemId]) {
            acc[itemId] = {
                itemId,
                bankName: item.bank_name,
                accounts: [],
                totalBalance: 0
            };
        }
        acc[itemId].accounts.push(item);
        acc[itemId].totalBalance += parseFloat(item.balance || 0);
        return acc;
    }, {});

    return (
        <div className="space-y-3">
            {Object.values(groupedItems).map((group) => (
                <div
                    key={group.itemId}
                    className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 hover:border-emerald-400 dark:hover:border-emerald-600 transition-colors"
                >
                    <div className="flex items-start justify-between">
                        <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
                                    <Building2 size={20} className="text-emerald-600 dark:text-emerald-400" />
                                </div>
                                <div>
                                    <h4 className="font-bold text-slate-900 dark:text-white">
                                        {group.bankName || 'Banco'}
                                    </h4>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">
                                        {group.accounts.length} conta{group.accounts.length > 1 ? 's' : ''} sincronizada{group.accounts.length > 1 ? 's' : ''}
                                    </p>
                                </div>
                            </div>

                            <div className="space-y-1 ml-11">
                                {group.accounts.map((account, idx) => (
                                    <div key={idx} className="flex items-center justify-between text-sm">
                                        <span className="text-slate-600 dark:text-slate-400">
                                            {account.name}
                                        </span>
                                        <span className="font-medium text-slate-900 dark:text-white">
                                            R$ {parseFloat(account.balance || 0).toFixed(2)}
                                        </span>
                                    </div>
                                ))}
                            </div>

                            {group.accounts[0]?.last_sync && (
                                <div className="flex items-center gap-2 mt-3 ml-11">
                                    <CheckCircle size={14} className="text-emerald-500" />
                                    <span className="text-xs text-slate-500 dark:text-slate-400">
                                        Última sincronização: {new Date(group.accounts[0].last_sync).toLocaleString('pt-BR')}
                                    </span>
                                </div>
                            )}
                        </div>

                        <button
                            onClick={() => handleDisconnect(group.itemId, group.bankName)}
                            disabled={disconnecting === group.itemId}
                            className="ml-4 p-2 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Desconectar banco"
                        >
                            {disconnecting === group.itemId ? (
                                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-rose-600"></div>
                            ) : (
                                <Trash2 size={20} />
                            )}
                        </button>
                    </div>
                </div>
            ))}

            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-900/30 p-3 rounded-xl">
                <div className="flex gap-2">
                    <AlertCircle size={16} className="text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-blue-800 dark:text-blue-300">
                        <strong>Atenção:</strong> Ao desconectar, todas as transações e dados sincronizados deste banco serão removidos permanentemente.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default ConnectedAccounts;
