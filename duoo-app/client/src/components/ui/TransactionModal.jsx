import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import api from '../../services/api';
import { useAchievements } from '../../context/AchievementContext';

const TransactionModal = ({ isOpen, onClose, transaction = null, onSuccess }) => {
    const { checkAchievements } = useAchievements();
    const [wallets, setWallets] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [formData, setFormData] = useState({
        title: '',
        amount: '',
        category: 'Alimentação',
        date: new Date().toISOString().split('T')[0],
        type: 'expense',
        wallet_id: ''
    });

    useEffect(() => {
        fetchWallets();
    }, []);

    useEffect(() => {
        if (transaction) {
            setFormData({
                title: transaction.title,
                amount: Math.abs(parseFloat(transaction.amount)).toString(),
                category: transaction.category,
                date: transaction.date.split('T')[0], // Ensure date format
                type: parseFloat(transaction.amount) < 0 ? 'expense' : 'income',
                wallet_id: transaction.wallet_id
            });
        } else {
            resetForm();
        }
    }, [transaction, isOpen]);

    const fetchWallets = async () => {
        try {
            // Busca apenas carteiras do usuário logado (não do parceiro)
            const res = await api.get('/wallets?mine=true');
            setWallets(res.data);
            if (res.data.length > 0 && !formData.wallet_id && !transaction) {
                setFormData(prev => ({ ...prev, wallet_id: res.data[0].id }));
            }
        } catch (error) {
            console.error('Failed to fetch wallets:', error);
        }
    };

    const resetForm = () => {
        setFormData({
            title: '',
            amount: '',
            category: 'Alimentação',
            date: new Date().toISOString().split('T')[0],
            type: 'expense',
            wallet_id: wallets[0]?.id || ''
        });
    };


    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        const numAmount = parseFloat(formData.amount);
        const finalAmount = formData.type === 'expense' ? -Math.abs(numAmount) : Math.abs(numAmount);

        // Validação no frontend - verificar saldo para despesas
        if (formData.type === 'expense') {
            const selectedWallet = wallets.find(w => w.id === parseInt(formData.wallet_id));
            if (selectedWallet && numAmount > parseFloat(selectedWallet.balance)) {
                setError(`Saldo insuficiente. Saldo disponível: R$ ${parseFloat(selectedWallet.balance).toFixed(2)}`);
                setLoading(false);
                return;
            }
        }

        const payload = {
            title: formData.title,
            amount: finalAmount,
            category: formData.category,
            date: formData.date,
            type: formData.type,
            wallet_id: parseInt(formData.wallet_id)
        };

        try {
            if (transaction) {
                await api.put(`/transactions/${transaction.id}`, payload);
            } else {
                await api.post('/transactions', payload);
            }

            if (onSuccess) onSuccess();
            onClose();
            resetForm();
            setError('');
            // Verificamos por conquistas imediatamente após o lançamento
            setTimeout(() => {
                checkAchievements();
                // Trigger notification refresh
                window.dispatchEvent(new CustomEvent('refresh-notifications'));
            }, 500);
        } catch (err) {
            console.error('Failed to save transaction:', err);
            setError(err.response?.data?.error || 'Erro ao salvar transação');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={transaction ? "Editar Transação" : "Nova Transação"}>
            <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                    <div className="p-3 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-xl text-rose-700 dark:text-rose-300 text-sm font-medium">
                        ⚠️ {error}
                    </div>
                )}
                <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Descrição</label>
                    <input
                        type="text"
                        required
                        placeholder="Ex: Supermercado"
                        value={formData.title}
                        onChange={e => setFormData({ ...formData, title: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Valor</label>
                        <input
                            type="number"
                            required
                            placeholder="0.00"
                            step="0.01"
                            value={formData.amount}
                            onChange={e => setFormData({ ...formData, amount: e.target.value })}
                            className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Data</label>
                        <input
                            type="date"
                            required
                            value={formData.date}
                            onChange={e => setFormData({ ...formData, date: e.target.value })}
                            className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Tipo</label>
                        <select
                            value={formData.type}
                            onChange={e => setFormData({
                                ...formData,
                                type: e.target.value,
                                category: e.target.value === 'expense' ? 'Alimentação' : 'Salário'
                            })}
                            className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        >
                            <option value="expense">Despesa</option>
                            <option value="income">Receita</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Categoria</label>
                        <select
                            value={formData.category}
                            onChange={e => setFormData({ ...formData, category: e.target.value })}
                            className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        >
                            {formData.type === 'expense' ? (
                                <>
                                    <option>Alimentação</option>
                                    <option>Lazer</option>
                                    <option>Moradia</option>
                                    <option>Contas</option>
                                    <option>Saúde</option>
                                    <option>Transporte</option>
                                    <option>Educação</option>
                                    <option>Outros</option>
                                </>
                            ) : (
                                <>
                                    <option>Salário</option>
                                    <option>Freelance</option>
                                    <option>Investimentos</option>
                                    <option>Presente</option>
                                    <option>Venda</option>
                                    <option>Reembolso</option>
                                    <option>Outros</option>
                                </>
                            )}
                        </select>
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Carteira</label>
                    <select
                        value={formData.wallet_id}
                        onChange={e => setFormData({ ...formData, wallet_id: e.target.value })}
                        required
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                        {wallets.map(wallet => (
                            <option key={wallet.id} value={wallet.id}>
                                {wallet.name}
                            </option>
                        ))}
                    </select>
                </div>

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3 rounded-xl transition-colors shadow-lg shadow-emerald-500/30 mt-2 disabled:opacity-50"
                >
                    {loading ? 'Salvando...' : (transaction ? 'Atualizar Transação' : 'Salvar Transação')}
                </button>
            </form>
        </Modal>
    );
};

export default TransactionModal;
