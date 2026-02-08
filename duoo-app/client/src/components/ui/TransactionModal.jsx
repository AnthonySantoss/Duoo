import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import api from '../../services/api';
import { useAchievements } from '../../context/AchievementContext';

const TransactionModal = ({ isOpen, onClose, transaction = null, onSuccess }) => {
    const { checkAchievements } = useAchievements();
    const [wallets, setWallets] = useState([]);
    const [creditCards, setCreditCards] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [formData, setFormData] = useState({
        title: '',
        amount: '',
        category: 'Alimentação',
        date: new Date().toISOString().split('T')[0],
        type: 'expense',
        wallet_id: '',
        credit_card_id: '',
        installments: '1',
        split_with_partner: false,
        split_amount: '',
        notes: ''
    });

    useEffect(() => {
        fetchWallets();
        fetchCreditCards();
    }, []);

    useEffect(() => {
        if (transaction) {
            setFormData({
                title: transaction.title,
                amount: Math.abs(parseFloat(transaction.amount)).toString(),
                category: transaction.category,
                date: transaction.date.split('T')[0], // Ensure date format
                type: parseFloat(transaction.amount) < 0 ? 'expense' : 'income',
                wallet_id: transaction.wallet_id,
                split_with_partner: !!transaction.split_with_partner,
                split_amount: transaction.split_amount || '',
                notes: transaction.notes || ''
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

    const fetchCreditCards = async () => {
        try {
            const res = await api.get('/credit-cards?viewMode=user1');
            setCreditCards(res.data);
            if (res.data.length > 0 && !formData.credit_card_id && !transaction) {
                setFormData(prev => ({ ...prev, credit_card_id: res.data[0].id }));
            }
        } catch (error) {
            console.error('Failed to fetch credit cards:', error);
        }
    };

    const resetForm = () => {
        setFormData({
            title: '',
            amount: '',
            category: 'Alimentação',
            date: new Date().toISOString().split('T')[0],
            type: 'expense',
            wallet_id: wallets[0]?.id || '',
            credit_card_id: creditCards[0]?.id || '',
            installments: '1',
            split_with_partner: false,
            split_amount: '',
            notes: ''
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

        try {
            if (formData.type === 'credit') {
                if (!formData.credit_card_id) {
                    setError('Selecione um cartão de crédito');
                    setLoading(false);
                    return;
                }
                await api.post(`/credit-cards/${formData.credit_card_id}/purchases`, {
                    description: formData.title,
                    total_amount: parseFloat(formData.amount),
                    installments: parseInt(formData.installments),
                    purchase_date: formData.date,
                    category: formData.category,
                    notes: formData.notes
                });
            } else {
                const payload = {
                    title: formData.title,
                    amount: finalAmount,
                    category: formData.category,
                    date: formData.date,
                    type: formData.type,
                    wallet_id: parseInt(formData.wallet_id),
                    split_with_partner: formData.split_with_partner,
                    split_amount: formData.split_amount ? parseFloat(formData.split_amount) : null,
                    notes: formData.notes
                };

                if (transaction) {
                    await api.put(`/transactions/${transaction.id}`, payload);
                } else {
                    await api.post('/transactions', payload);
                }
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
                window.dispatchEvent(new CustomEvent('refresh-data'));
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
                                category: (e.target.value === 'expense' || e.target.value === 'credit') ? 'Alimentação' : 'Salário'
                            })}
                            disabled={!!transaction}
                            className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        >
                            <option value="expense">Despesa</option>
                            <option value="income">Receita</option>
                            <option value="credit">Crédito</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Categoria</label>
                        <select
                            value={formData.category}
                            onChange={e => setFormData({ ...formData, category: e.target.value })}
                            className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        >
                            {(formData.type === 'expense' || formData.type === 'credit') ? (
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

                {formData.type === 'credit' ? (
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Cartão</label>
                            <select
                                value={formData.credit_card_id}
                                onChange={e => setFormData({ ...formData, credit_card_id: e.target.value })}
                                required
                                className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            >
                                {creditCards.length === 0 && <option value="">Nenhum cartão</option>}
                                {creditCards.map(card => (
                                    <option key={card.id} value={card.id}>{card.name}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Parcelas</label>
                            <select
                                value={formData.installments}
                                onChange={e => setFormData({ ...formData, installments: e.target.value })}
                                className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            >
                                {[...Array(12)].map((_, i) => (
                                    <option key={i + 1} value={i + 1}>{i + 1 === 1 ? 'À vista' : `${i + 1}x`}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                ) : (
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
                )}

                {formData.type !== 'credit' && (
                    <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Dividir com parceiro</span>
                                <span className="text-[10px] bg-emerald-100 text-emerald-600 px-1.5 py-0.5 rounded font-bold uppercase">Duoo</span>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    className="sr-only peer"
                                    checked={formData.split_with_partner}
                                    onChange={e => setFormData({ ...formData, split_with_partner: e.target.checked })}
                                />
                                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-emerald-500"></div>
                            </label>
                        </div>

                        {formData.split_with_partner && (
                            <div className="animate-in fade-in slide-in-from-top-2 duration-200">
                                <label className="block text-xs font-medium text-slate-500 mb-1">Valor para o parceiro (Opcional, padrão 50%)</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    placeholder={`Ex: ${(parseFloat(formData.amount || 0) / 2).toFixed(2)}`}
                                    value={formData.split_amount}
                                    onChange={e => setFormData({ ...formData, split_amount: e.target.value })}
                                    className="w-full px-4 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                />
                            </div>
                        )}
                    </div>
                )}

                <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Notas / Observações</label>
                    <textarea
                        value={formData.notes}
                        onChange={e => setFormData({ ...formData, notes: e.target.value })}
                        placeholder="Ex: Amor, essa conta já está paga!"
                        rows="2"
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm resize-none"
                    />
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
