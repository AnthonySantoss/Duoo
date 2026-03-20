import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Plus, ArrowUpCircle, ArrowDownCircle, Check, Calendar } from 'lucide-react';
import Card from '../components/ui/Card';
import Modal from '../components/ui/Modal';
import Toast from '../components/ui/Toast';
import api from '../services/api';
import { formatDisplayDate, getLocalDateString } from '../utils/dateUtils';

const Recurring = () => {
    const { viewMode } = useOutletContext();
    // State for dates
    const [currentDate, setCurrentDate] = useState(new Date(2026, 1)); // February 2026 as per image
    const [toast, setToast] = useState(null);

    const showToast = (message, type = 'info') => {
        setToast({ message, type });
    };

    const [transactions, setTransactions] = useState([]);
    const [wallets, setWallets] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchWallets = async () => {
        try {
            const res = await api.get('/wallets');
            setWallets(res.data);
        } catch (error) {
            console.error('Failed to fetch wallets:', error);
        }
    };

    const fetchTransactions = async () => {
        setLoading(true);
        try {
            const year = currentDate.getFullYear();
            const month = currentDate.getMonth() + 1;
            const res = await api.get('/recurring', { params: { year, month, viewMode } });
            setTransactions(res.data);
        } catch (error) {
            console.error(error);
            showToast("Erro ao carregar recorrências", "error");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTransactions();
        fetchWallets();
    }, [currentDate, viewMode]);

    // Modal state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newItem, setNewItem] = useState({
        title: '',
        amount: '',
        type: 'expense',
        installments: 1,
        isRecurring: false,
        date: getLocalDateString(),
        wallet_id: ''
    });

    const handleAddItem = async (e) => {
        e.preventDefault();
        if (!newItem.title || !newItem.amount) {
            showToast("Preencha todos os campos obrigatórios", "error");
            return;
        }

        try {
            await api.post('/recurring', {
                title: newItem.title,
                amount: parseFloat(newItem.amount),
                type: newItem.type,
                date: newItem.date,
                installments: newItem.installments,
                isRecurring: newItem.isRecurring,
                wallet_id: newItem.wallet_id || null
            });
            fetchTransactions();
            setIsModalOpen(false);
            setNewItem({
                title: '',
                amount: '',
                type: 'expense',
                installments: 1,
                isRecurring: false,
                date: getLocalDateString(),
                wallet_id: ''
            });
            showToast("Recorrência adicionada com sucesso!", "success");
        } catch (error) {
            console.error("Failed to add item", error);
            showToast(error.response?.data?.error || "Erro ao adicionar item", "error");
        }
    };

    // Action Modal State
    const [actionModalOpen, setActionModalOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState(null);
    const [updateWalletId, setUpdateWalletId] = useState('');

    const handleItemClick = (item) => {
        setSelectedItem(item);
        setUpdateWalletId(item.wallet_id || '');
        setActionModalOpen(true);
    };

    const handleUpdateStatus = async (status) => {
        if (!selectedItem) return;

        // Se for receita ou despesa e estiver recebendo/pagando, garantir que tenha carteira
        if ((selectedItem.type === 'income' && status === 'received') || (selectedItem.type === 'expense' && status === 'paid')) {
            if (!updateWalletId) {
                showToast(`Selecione uma carteira para ${selectedItem.type === 'income' ? 'receber' : 'pagar'}!`, "error");
                return;
            }
        }

        try {
            await api.put(`/recurring/${selectedItem.id}`, {
                status,
                wallet_id: updateWalletId
            });
            fetchTransactions();
            setActionModalOpen(false);
            setSelectedItem(null);
            showToast("Status atualizado com sucesso!", "success");
        } catch (error) {
            console.error("Failed to update status", error);
            showToast("Erro ao atualizar status", "error");
        }
    };

    const handleDeleteItem = async () => {
        if (!confirm("Tem certeza que deseja excluir esta recorrência?")) return;
        if (!selectedItem) return;

        try {
            await api.delete(`/recurring/${selectedItem.id}`);
            fetchTransactions();
            setActionModalOpen(false);
            setSelectedItem(null);
            showToast("Recorrência removida.", "success");
        } catch (error) {
            console.error("Failed to delete", error);
            showToast("Erro ao excluir", "error");
        }
    };

    // Calculate balances derived from transactions
    const { currentBalance, forecastedBalance } = React.useMemo(() => {
        let current = 0;
        let forecast = 0;

        transactions.forEach(t => {
            // Ensure amount is float
            const val = parseFloat(t.amount);

            // Forecast: Include EVERYTHING
            if (t.type === 'income') {
                forecast += val;
                // Current: Include only received
                if (t.status === 'received') current += val;
            } else {
                forecast -= val;
                // Current: Include only paid
                if (t.status === 'paid') current -= val;
            }
        });

        return { currentBalance: current, forecastedBalance: forecast };
    }, [transactions]);

    const formatCurrency = (value) => {
        return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    };



    const nextMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
    };

    const prevMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
    };

    const monthName = currentDate.toLocaleString('pt-BR', { month: 'long', year: 'numeric' });

    // Calculate progress for progress bars
    const progressData = React.useMemo(() => {
        let totalIncome = 0;
        let receivedIncome = 0;
        let totalExpense = 0;
        let paidExpense = 0;

        transactions.forEach(t => {
            const val = parseFloat(t.amount);
            if (t.type === 'income') {
                totalIncome += val;
                if (t.status === 'received') receivedIncome += val;
            } else {
                totalExpense += Math.abs(val);
                if (t.status === 'paid') paidExpense += Math.abs(val);
            }
        });

        return {
            incomeProgress: totalIncome > 0 ? (receivedIncome / totalIncome) * 100 : 0,
            expenseProgress: totalExpense > 0 ? (paidExpense / totalExpense) * 100 : 0,
            totalIncome,
            receivedIncome,
            totalExpense,
            paidExpense
        };
    }, [transactions]);

    return (
        <div className="flex flex-col h-[calc(100vh-160px)] md:h-[calc(100vh-140px)] relative bg-slate-50 dark:bg-slate-900 overflow-hidden rounded-t-2xl">
            {toast && (
                <Toast
                    message={toast.message}
                    type={toast.type}
                    onClose={() => setToast(null)}
                />
            )}

            {/* Header - Fixed at top of container */}
            <div className="shrink-0 pt-4 pb-4 px-4 bg-slate-50 dark:bg-slate-900 z-10">
                <div className="bg-emerald-600 rounded-full p-1 flex justify-between items-center shadow-lg shadow-emerald-500/20">
                    <button onClick={prevMonth} className="bg-white text-emerald-600 rounded-full p-1 w-8 h-8 flex items-center justify-center hover:bg-emerald-50 transition">
                        <ChevronLeft size={20} />
                    </button>
                    <span className="text-white font-medium text-lg capitalize">{monthName}</span>
                    <button onClick={nextMonth} className="bg-white text-emerald-600 rounded-full p-1 w-8 h-8 flex items-center justify-center hover:bg-emerald-50 transition">
                        <ChevronRight size={20} />
                    </button>
                </div>
            </div>

            {/* List - Scrolls internally */}
            <div className="flex-1 overflow-y-auto px-4 pb-48 space-y-3 scrollbar-hide">
                {transactions.length === 0 ? (
                    <Card className="text-center py-12">
                        <div className="w-16 h-16 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400">
                            <Calendar size={24} />
                        </div>
                        <p className="text-slate-500">Nenhuma recorrência neste mês.</p>
                    </Card>
                ) : (
                    transactions.map(item => (
                        <div
                            key={item.id}
                            onClick={() => handleItemClick(item)}
                            className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 p-4 flex flex-col md:flex-row md:items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group cursor-pointer"
                        >
                            <div className="flex items-center gap-4 mb-3 md:mb-0">
                                <div className={`p-3 rounded-full ${item.type === 'income' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                                    {item.type === 'income' ? <ArrowUpCircle size={20} /> : <ArrowDownCircle size={20} />}
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h4 className="font-bold text-slate-900 dark:text-white">{item.title}</h4>
                                        {item.isInvoice && (
                                            <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">
                                                Cartão
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${{
                                            'pending': 'bg-slate-100 text-slate-500',
                                            'paid': 'bg-emerald-100 text-emerald-600',
                                            'received': 'bg-emerald-100 text-emerald-600'
                                        }[item.status] || 'bg-slate-100 text-slate-500'
                                            }`}>
                                            {{
                                                'pending': 'Pendente',
                                                'paid': 'Pago',
                                                'received': 'Recebido'
                                            }[item.status]}
                                        </span>
                                        <span className="text-xs text-slate-400">•</span>
                                        <span className="text-xs text-slate-400">{formatDisplayDate(item.date)}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-4 justify-between md:justify-end">
                                <span className={`font-bold text-lg ${item.type === 'income' ? 'text-emerald-600' : 'text-slate-900 dark:text-slate-200'}`}>
                                    {item.type === 'income' ? '+ ' : '- '}{formatCurrency(parseFloat(item.amount))}
                                </span>
                                <ChevronRight size={20} className="text-slate-300" />
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Floating Footer - Absolute positioned within fixed container */}
            <div className="absolute bottom-0 left-4 right-4 z-20 pb-4">
                <div className="relative">
                    {/* Floating Add Button */}
                    <div className="absolute -top-7 left-1/2 -translate-x-1/2 z-10">
                        <button
                            onClick={() => setIsModalOpen(true)}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-transform hover:scale-105 border-[6px] border-slate-50 dark:border-slate-900"
                            aria-label="Adicionar Recorrência"
                        >
                            <Plus size={28} strokeWidth={2.5} />
                        </button>
                    </div>

                    {/* Balance Card */}
                    <div className="bg-emerald-600 rounded-2xl p-5 pt-8 shadow-xl shadow-emerald-500/20 flex justify-between items-center">
                        <div>
                            <p className="text-emerald-50 text-xs font-semibold uppercase tracking-wide mb-1 opacity-90">Saldo previsto</p>
                            <p className="text-2xl font-black text-white">
                                {formatCurrency(forecastedBalance)}
                            </p>
                        </div>
                        <div className="text-right">
                            <p className="text-emerald-50 text-xs font-semibold uppercase tracking-wide mb-1 opacity-90">Saldo</p>
                            <p className="text-2xl font-bold text-emerald-100">
                                {formatCurrency(currentBalance)}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Action Modal */}
            <Modal isOpen={actionModalOpen} onClose={() => setActionModalOpen(false)} title="Detalhes da Recorrência">
                {selectedItem && (
                    <div className="space-y-6">
                        <div className="text-center">
                            <p className="text-sm text-slate-500 mb-1">Valor</p>
                            <h2 className={`text-3xl font-bold ${selectedItem.type === 'income' ? 'text-emerald-500' : 'text-rose-500'}`}>
                                {formatCurrency(parseFloat(selectedItem.amount))}
                            </h2>
                            <p className="text-lg font-medium mt-2 text-slate-900 dark:text-white">{selectedItem.title}</p>
                            <p className="text-sm text-slate-400">{formatDisplayDate(selectedItem.date)}</p>
                        </div>

                        {((selectedItem.type === 'income' && selectedItem.status !== 'received') || (selectedItem.type === 'expense' && selectedItem.status !== 'paid')) && (
                            <div>
                                <label className="block text-xs font-semibold text-slate-500 uppercase mb-2">
                                    {selectedItem.type === 'income' ? 'Carteira para Recebimento' : 'Pagar com a Carteira'}
                                </label>
                                <select
                                    value={updateWalletId}
                                    onChange={e => setUpdateWalletId(e.target.value)}
                                    className="w-full rounded-xl border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-3 text-sm"
                                >
                                    <option value="">Selecione uma carteira</option>
                                    {wallets.map(w => (
                                        <option key={w.id} value={w.id}>{w.name}</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        <div className="space-y-3">
                            {selectedItem.type === 'income' ? (
                                selectedItem.status !== 'received' ? (
                                    <button
                                        onClick={() => handleUpdateStatus('received')}
                                        className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold transition-colors shadow-lg shadow-emerald-500/20"
                                    >
                                        Marcar como Recebido
                                    </button>
                                ) : (
                                    <button
                                        disabled
                                        className="w-full py-3 rounded-xl bg-slate-100 text-slate-400 font-medium cursor-not-allowed"
                                    >
                                        Já Recebido
                                    </button>
                                )
                            ) : (
                                selectedItem.status !== 'paid' ? (
                                    <button
                                        onClick={() => handleUpdateStatus('paid')}
                                        className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold transition-colors shadow-lg shadow-emerald-500/20"
                                    >
                                        Marcar como Pago
                                    </button>
                                ) : (
                                    <button
                                        disabled
                                        className="w-full py-3 rounded-xl bg-slate-100 text-slate-400 font-medium cursor-not-allowed"
                                    >
                                        Já Pago
                                    </button>
                                )
                            )}

                            {/* Option to revert/reset if needed */}
                            {(selectedItem.status === 'received' || selectedItem.status === 'paid') && (
                                <button
                                    onClick={() => handleUpdateStatus('pending')}
                                    className="w-full py-3 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                                >
                                    Marcar como Pendente
                                </button>
                            )}

                            <button
                                onClick={handleDeleteItem}
                                className="w-full py-3 rounded-xl border border-rose-200 dark:border-rose-900/30 text-rose-500 font-medium hover:bg-rose-50 dark:hover:bg-rose-900/10 transition-colors"
                            >
                                Excluir Recorrência
                            </button>
                        </div>
                    </div>
                )}
            </Modal>

            {/* Modal for adding new item */}
            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Adicionar Recorrência">
                <form onSubmit={handleAddItem} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Título</label>
                        <input
                            type="text"
                            value={newItem.title}
                            onChange={e => setNewItem({ ...newItem, title: e.target.value })}
                            className="w-full rounded-xl border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-3"
                            placeholder="Ex: Salário"
                            required
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Valor</label>
                            <input
                                type="number"
                                step="0.01"
                                value={newItem.amount}
                                onChange={e => setNewItem({ ...newItem, amount: e.target.value })}
                                className="w-full rounded-xl border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-3"
                                placeholder="0.00"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Tipo</label>
                            <select
                                value={newItem.type}
                                onChange={e => setNewItem({ ...newItem, type: e.target.value })}
                                className="w-full rounded-xl border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-3"
                            >
                                <option value="income">Receita</option>
                                <option value="expense">Despesa</option>
                            </select>
                        </div>
                    </div>

                    {newItem.type === 'expense' && (
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Parcelas</label>
                            <select
                                value={newItem.installments}
                                onChange={e => setNewItem({ ...newItem, installments: parseInt(e.target.value) })}
                                className="w-full rounded-xl border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-3"
                            >
                                <option value={1}>À vista (1x)</option>
                                <option value={2}>2x</option>
                                <option value={3}>3x</option>
                                <option value={4}>4x</option>
                                <option value={5}>5x</option>
                                <option value={6}>6x</option>
                                <option value={10}>10x</option>
                                <option value={12}>12x</option>
                                <option value={18}>18x</option>
                                <option value={24}>24x</option>
                            </select>
                        </div>
                    )}

                    {newItem.type === 'income' && (
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Carteira Padrão</label>
                                <select
                                    value={newItem.wallet_id}
                                    onChange={e => setNewItem({ ...newItem, wallet_id: e.target.value })}
                                    className="w-full rounded-xl border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-3"
                                >
                                    <option value="">Selecione uma carteira</option>
                                    {wallets.map(w => (
                                        <option key={w.id} value={w.id}>{w.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex items-center gap-2 p-1">
                                <input
                                    type="checkbox"
                                    id="isRecurring"
                                    checked={newItem.isRecurring}
                                    onChange={e => setNewItem({ ...newItem, isRecurring: e.target.checked })}
                                    className="w-5 h-5 text-emerald-500 rounded focus:ring-emerald-500 border-gray-300"
                                />
                                <label htmlFor="isRecurring" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                    É receita recorrente? (Repetir 12 meses)
                                </label>
                            </div>
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Data</label>
                        <input
                            type="date"
                            value={newItem.date}
                            onChange={e => setNewItem({ ...newItem, date: e.target.value })}
                            className="w-full rounded-xl border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-3"
                            required
                        />
                    </div>
                    <button type="submit" className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3 rounded-xl mt-2 transition-colors">
                        Salvar
                    </button>
                </form>
            </Modal>
        </div >
    );
};

export default Recurring;
