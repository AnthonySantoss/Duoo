import React, { useState, useMemo, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Search, Filter, PlusCircle, ShoppingBag, Home, Coffee, Zap, AlertTriangle, Wallet, Trash2, Edit } from 'lucide-react';
import Card from '../components/ui/Card';
import Modal from '../components/ui/Modal';
import api from '../services/api';
import Toast from '../components/ui/Toast';

const Transactions = () => {
    const { viewMode } = useOutletContext();
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [transactions, setTransactions] = useState([]);
    const [wallets, setWallets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editingTransaction, setEditingTransaction] = useState(null);
    const [toast, setToast] = useState(null);

    // Form State
    const [formData, setFormData] = useState({
        title: '',
        amount: '',
        category: 'Alimentação',
        date: new Date().toISOString().split('T')[0],
        type: 'expense',
        wallet_id: ''
    });

    useEffect(() => {
        fetchTransactions();
        fetchWallets();
    }, [viewMode]);

    const fetchTransactions = async () => {
        setLoading(true);
        try {
            const res = await api.get('/transactions', {
                params: { viewMode, search: searchTerm }
            });
            setTransactions(res.data);
        } catch (error) {
            console.error('Failed to fetch transactions:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchWallets = async () => {
        try {
            const res = await api.get('/wallets');
            setWallets(res.data);
            if (res.data.length > 0 && !formData.wallet_id) {
                setFormData(prev => ({ ...prev, wallet_id: res.data[0].id }));
            }
        } catch (error) {
            console.error('Failed to fetch wallets:', error);
        }
    };

    useEffect(() => {
        const delayDebounceFn = setTimeout(() => {
            fetchTransactions();
        }, 300);

        return () => clearTimeout(delayDebounceFn);
    }, [searchTerm, viewMode]);

    const getCategoryIcon = (category) => {
        switch (category) {
            case 'Alimentação': return <ShoppingBag size={16} />;
            case 'Moradia': return <Home size={16} />;
            case 'Lazer': return <Coffee size={16} />;
            case 'Contas': return <Zap size={16} />;
            case 'Saúde': return <AlertTriangle size={16} />;
            case 'Transporte': return <Wallet size={16} />;
            default: return <Wallet size={16} />;
        }
    };

    const handleOpenModal = (transaction = null) => {
        if (!transaction && wallets.length === 0) {
            setToast({ message: 'É necessário criar uma carteira antes de adicionar uma transação.', type: 'info' });
            return;
        }

        if (transaction) {
            setEditingTransaction(transaction);
            setFormData({
                title: transaction.title,
                amount: Math.abs(parseFloat(transaction.amount)).toString(),
                category: transaction.category,
                date: transaction.date,
                type: parseFloat(transaction.amount) < 0 ? 'expense' : 'income',
                wallet_id: transaction.wallet_id
            });
        } else {
            setEditingTransaction(null);
            setFormData({
                title: '',
                amount: '',
                category: 'Alimentação',
                date: new Date().toISOString().split('T')[0],
                type: 'expense',
                wallet_id: wallets[0]?.id || ''
            });
        }
        setIsModalOpen(true);
    };

    const handleSave = async (e) => {
        e.preventDefault();

        const numAmount = parseFloat(formData.amount);
        const finalAmount = formData.type === 'expense' ? -Math.abs(numAmount) : Math.abs(numAmount);

        const payload = {
            title: formData.title,
            amount: finalAmount,
            category: formData.category,
            date: formData.date,
            type: formData.type,
            wallet_id: parseInt(formData.wallet_id)
        };

        try {
            if (editingTransaction) {
                await api.put(`/transactions/${editingTransaction.id}`, payload);
            } else {
                await api.post('/transactions', payload);
            }

            setIsModalOpen(false);
            fetchTransactions();
            setFormData({
                title: '',
                amount: '',
                category: 'Alimentação',
                date: new Date().toISOString().split('T')[0],
                type: 'expense',
                wallet_id: wallets[0]?.id || ''
            });
        } catch (error) {
            console.error('Failed to save transaction:', error);
            setToast({ message: error.response?.data?.error || 'Erro ao salvar transação', type: 'error' });
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('Tem certeza que deseja excluir esta transação?')) return;

        try {
            await api.delete(`/transactions/${id}`);
            fetchTransactions();
        } catch (error) {
            console.error('Failed to delete transaction:', error);
            setToast({ message: error.response?.data?.error || 'Erro ao excluir transação', type: 'error' });
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
                <div className="relative w-full md:w-96 group">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-500 transition-colors" size={20} />
                    <input
                        type="text"
                        placeholder="Buscar transações..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-sm"
                    />
                </div>
                <div className="flex gap-2 w-full md:w-auto">
                    <button
                        onClick={() => handleOpenModal()}
                        className="flex items-center justify-center gap-2 px-6 py-3 bg-emerald-500 text-white rounded-xl text-sm font-bold hover:bg-emerald-600 transition-colors shadow-lg shadow-emerald-500/30"
                    >
                        <PlusCircle size={18} /> Nova
                    </button>
                </div>
            </div>

            <div className="space-y-4">
                {transactions.length === 0 ? (
                    <Card className="text-center py-12">
                        <p className="text-slate-500">Nenhuma transação encontrada.</p>
                    </Card>
                ) : (
                    transactions.map(item => (
                        <Card key={item.id} className="flex flex-col md:flex-row md:items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group border border-transparent hover:border-slate-200 dark:hover:border-slate-700">
                            <div className="flex items-center gap-4 mb-3 md:mb-0">
                                <div className={`p-3 rounded-full ${parseFloat(item.amount) > 0 ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>
                                    {getCategoryIcon(item.category)}
                                </div>
                                <div>
                                    <h4 className="font-bold text-slate-900 dark:text-white">{item.title}</h4>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className="text-xs px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 font-medium">{item.category}</span>
                                        <span className="text-xs text-slate-400">•</span>
                                        <span className="text-xs text-slate-400">{new Date(item.date).toLocaleDateString('pt-BR')}</span>
                                        {item.Wallet && (
                                            <>
                                                <span className="text-xs text-slate-400">•</span>
                                                <span className="text-xs text-slate-400">{item.Wallet.name}</span>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                <span className={`block font-bold text-lg ${parseFloat(item.amount) > 0 ? 'text-emerald-600' : 'text-slate-900 dark:text-white'}`}>
                                    {parseFloat(item.amount) > 0 ? '+' : ''} R$ {Math.abs(parseFloat(item.amount)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </span>
                                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                        onClick={() => handleOpenModal(item)}
                                        className="p-2 hover:bg-blue-50 dark:hover:bg-blue-900/20 text-blue-600 rounded-lg transition-colors"
                                        title="Editar"
                                    >
                                        <Edit size={18} />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(item.id)}
                                        className="p-2 hover:bg-rose-50 dark:hover:bg-rose-900/20 text-rose-600 rounded-lg transition-colors"
                                        title="Excluir"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            </div>
                        </Card>
                    ))
                )}
            </div>

            {/* Nova/Editar Transação Modal */}
            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingTransaction ? "Editar Transação" : "Nova Transação"}>
                <form onSubmit={handleSave} className="space-y-4">
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

                    <button type="submit" className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3 rounded-xl transition-colors shadow-lg shadow-emerald-500/30 mt-2">
                        {editingTransaction ? 'Atualizar Transação' : 'Salvar Transação'}
                    </button>
                </form>
            </Modal>
            {toast && (
                <Toast
                    message={toast.message}
                    type={toast.type}
                    onClose={() => setToast(null)}
                />
            )}
        </div>
    );
};

export default Transactions;
