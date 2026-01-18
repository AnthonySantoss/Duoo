import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { CreditCard as CreditCardIcon, PlusCircle, Edit, Trash2, ShoppingCart, Calendar, TrendingDown, ChevronRight } from 'lucide-react';
import Card from '../components/ui/Card';
import Modal from '../components/ui/Modal';
import ConfirmModal from '../components/ui/ConfirmModal';
import ProgressBar from '../components/ui/ProgressBar';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import Toast from '../components/ui/Toast';

const CreditCards = () => {
    const { viewMode } = useOutletContext();
    const { user, partner } = useAuth();
    const [creditCards, setCreditCards] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isCardModalOpen, setIsCardModalOpen] = useState(false);
    const [editingCard, setEditingCard] = useState(null);
    const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
    const [invoices, setInvoices] = useState([]);
    const [editingInvoice, setEditingInvoice] = useState(null);
    const [toast, setToast] = useState(null);

    const [wallets, setWallets] = useState([]);

    // Confirmações
    const [deleteInvoiceConfirmOpen, setDeleteInvoiceConfirmOpen] = useState(false);
    const [invoiceToDelete, setInvoiceToDelete] = useState(null);
    const [deleteCardConfirmOpen, setDeleteCardConfirmOpen] = useState(false);
    const [cardToDelete, setCardToDelete] = useState(null);

    const [cardFormData, setCardFormData] = useState({
        name: '',
        limit: '',
        due_day: '10',
        closing_day: '5',
        is_joint: true,
        current_used_limit: ''
    });



    const [invoiceFormData, setInvoiceFormData] = useState({
        credit_card_id: '',
        month: new Date().getMonth() + 1,
        year: new Date().getFullYear(),
        amount: '',
        due_date: new Date().toISOString().split('T')[0],
        paid: false,
        wallet_id: ''
    });

    useEffect(() => {
        fetchCreditCards();
        fetchWallets();
    }, [viewMode]);

    const fetchWallets = async () => {
        try {
            const res = await api.get('/wallets');
            setWallets(res.data);
        } catch (error) {
            console.error('Failed to fetch wallets:', error);
        }
    };

    const fetchCreditCards = async () => {
        setLoading(true);
        try {
            const res = await api.get('/credit-cards', {
                params: { viewMode }
            });
            setCreditCards(res.data);
        } catch (error) {
            console.error('Failed to fetch credit cards:', error);
        } finally {
            setLoading(false);
        }
    };



    const fetchInvoices = async () => {
        try {
            const res = await api.get('/invoices', { params: { viewMode } });
            setInvoices(res.data);
        } catch (error) {
            console.error('Failed to fetch invoices:', error);
        }
    };

    useEffect(() => {
        if (creditCards.length > 0) {
            fetchInvoices();
        }
    }, [creditCards, viewMode]);

    const handleOpenInvoiceModal = (card = null, invoice = null) => {
        if (invoice) {
            setEditingInvoice(invoice);
            setInvoiceFormData({
                credit_card_id: invoice.credit_card_id,
                month: invoice.month,
                year: invoice.year,
                amount: invoice.amount,
                due_date: invoice.due_date.split('T')[0],
                paid: invoice.paid
            });
        } else if (card) {
            setEditingInvoice(null);
            setInvoiceFormData({
                credit_card_id: card.id,
                month: new Date().getMonth() + 1,
                year: new Date().getFullYear(),
                amount: '',
                due_date: new Date().toISOString().split('T')[0],
                paid: false
            });
        }
        setIsInvoiceModalOpen(true);
    };

    const handleSaveInvoice = async (e) => {
        e.preventDefault();

        // Validate wallet selection if marking as paid
        if (invoiceFormData.paid && !invoiceFormData.wallet_id) {
            setToast({ message: 'Selecione uma carteira para pagar a fatura', type: 'error' });
            return;
        }

        try {
            await api.post('/invoices', invoiceFormData);
            await fetchInvoices();
            setIsInvoiceModalOpen(false);
            setInvoiceFormData({
                credit_card_id: '',
                month: new Date().getMonth() + 1,
                year: new Date().getFullYear(),
                amount: '',
                due_date: new Date().toISOString().split('T')[0],
                paid: false,
                wallet_id: ''
            });
        } catch (error) {
            console.error('Failed to save invoice:', error);
            setToast({ message: error.response?.data?.error || 'Erro ao salvar fatura', type: 'error' });
        }
    };

    const handleDeleteInvoice = (id) => {
        setInvoiceToDelete(id);
        setDeleteInvoiceConfirmOpen(true);
    };

    const confirmDeleteInvoice = async () => {
        if (!invoiceToDelete) return;
        try {
            await api.delete(`/invoices/${invoiceToDelete}`);
            await fetchInvoices();
            setToast({ message: 'Fatura excluída com sucesso', type: 'success' });
        } catch (error) {
            console.error('Failed to delete invoice:', error);
            setToast({ message: error.response?.data?.error || 'Erro ao excluir fatura', type: 'error' });
        } finally {
            setInvoiceToDelete(null);
        }
    };

    const handleOpenCardModal = (card = null) => {
        if (card) {
            setEditingCard(card);
            setCardFormData({
                name: card.name,
                limit: card.limit.toString(),
                due_day: card.due_day.toString(),
                closing_day: card.closing_day.toString(),
                is_joint: card.is_joint !== undefined ? card.is_joint : true,
                current_used_limit: card.current_debt ? card.current_debt.toString() : ''
            });
        } else {
            setEditingCard(null);
            setCardFormData({
                name: '',
                limit: '',
                due_day: '10',
                closing_day: '5',
                is_joint: true,
                current_used_limit: ''
            });
        }
        setIsCardModalOpen(true);
    };

    const handleSaveCard = async (e) => {
        e.preventDefault();

        const payload = {
            name: cardFormData.name,
            limit: parseFloat(cardFormData.limit),
            due_day: parseInt(cardFormData.due_day),
            closing_day: parseInt(cardFormData.closing_day),
            is_joint: cardFormData.is_joint,
            current_debt: parseFloat(cardFormData.current_used_limit) || 0
        };

        try {
            if (editingCard) {
                await api.put(`/credit-cards/${editingCard.id}`, payload);
            } else {
                await api.post('/credit-cards', payload);
            }

            setIsCardModalOpen(false);
            fetchCreditCards();
            setCardFormData({ name: '', limit: '', due_day: '10', closing_day: '5', is_joint: true, current_used_limit: '' });
        } catch (error) {
            console.error('Failed to save credit card:', error);
            setToast({ message: error.response?.data?.error || 'Erro ao salvar cartão', type: 'error' });
        }
    };

    const handleDeleteCard = (id) => {
        setCardToDelete(id);
        setDeleteCardConfirmOpen(true);
    };

    const confirmDeleteCard = async () => {
        if (!cardToDelete) return;
        try {
            await api.delete(`/credit-cards/${cardToDelete}`);
            fetchCreditCards();
            setToast({ message: 'Cartão excluído com sucesso', type: 'success' });
        } catch (error) {
            console.error('Failed to delete credit card:', error);
            setToast({ message: error.response?.data?.error || 'Erro ao excluir cartão', type: 'error' });
        } finally {
            setCardToDelete(null);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    // Helper functions for styling
    const getProviderStyles = (name) => {
        const n = name?.toLowerCase() || '';
        if (n.includes('nubank')) return { color: 'text-[#820AD1]', bg: 'bg-[#820AD1]' };
        if (n.includes('xp')) return { color: 'text-black', bg: 'bg-black' };
        if (n.includes('inter')) return { color: 'text-[#FF7A00]', bg: 'bg-[#FF7A00]' };
        if (n.includes('itaú') || n.includes('itau')) return { color: 'text-[#EC7000]', bg: 'bg-[#EC7000]' };
        if (n.includes('c6')) return { color: 'text-black', bg: 'bg-black' };
        return { color: 'text-emerald-600', bg: 'bg-emerald-500' };
    };

    return (
        <div className="space-y-8 font-sans">
            {/* Header Section */}
            <div className="flex items-end justify-between">
                <div>
                    <h3 className="text-2xl font-bold text-slate-900 dark:text-white">Meus Cartões</h3>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">Gerencie limites e datas de fechamento.</p>
                </div>
                <button
                    onClick={() => handleOpenCardModal()}
                    className="flex items-center gap-2 px-5 py-2.5 bg-emerald-500 text-white rounded-xl font-bold text-sm hover:bg-emerald-600 transition-colors shadow-lg shadow-emerald-500/20"
                >
                    <PlusCircle size={18} /> Novo Cartão
                </button>
            </div>

            {/* Credit Cards Carousel */}
            <div className="relative -mx-8 px-8">
                <div className="flex gap-6 overflow-x-auto pb-4 snap-x snap-mandatory" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch' }}>
                    {creditCards.length === 0 ? (
                        <div className="col-span-full py-12 text-center bg-white dark:bg-slate-900 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800">
                            <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                                <CreditCardIcon size={32} className="text-slate-300" />
                            </div>
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Nenhum cartão encontrado</h3>
                            <p className="text-slate-500 text-sm mt-1">Adicione seu primeiro cartão de crédito para começar.</p>
                        </div>
                    ) : (
                        creditCards.map(card => {
                            const styles = getProviderStyles(card.name);

                            // Calculate current month invoice from unpaid invoices
                            const currentMonth = new Date().getMonth() + 1;
                            const currentYear = new Date().getFullYear();
                            const currentMonthInvoice = invoices.find(inv =>
                                inv.credit_card_id === card.id &&
                                inv.month === currentMonth &&
                                inv.year === currentYear &&
                                !inv.paid
                            );

                            const currentDebt = currentMonthInvoice ? parseFloat(currentMonthInvoice.amount || 0) : 0;
                            const limit = parseFloat(card.limit || 0);
                            const usagePercent = limit > 0 ? Math.min(100, (currentDebt / limit) * 100) : 0;
                            const available = Math.max(0, limit - currentDebt);

                            let ownerBadge = { label: 'CONJUNTO', style: 'bg-emerald-100 text-emerald-800 dark:text-emerald-400 dark:bg-emerald-900/30' };

                            // Check if card is individual or joint
                            if (card.is_joint === false && card.User) {
                                const ownerName = card.User.name.toUpperCase();
                                ownerBadge = {
                                    label: ownerName,
                                    style: 'bg-blue-100 text-blue-800 dark:text-blue-400 dark:bg-blue-900/30'
                                };
                            }

                            return (
                                <div
                                    key={card.id}
                                    className="group relative bg-white dark:bg-slate-900 rounded-[28px] p-7 shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden flex flex-col justify-between h-[340px] w-[340px] min-w-[340px] snap-start hover:shadow-md transition-all cursor-pointer"
                                    onClick={() => handleOpenInvoiceModal(card)}
                                >
                                    {/* Decorative Blob */}
                                    <div className={`absolute -top-6 -right-6 w-32 h-32 rounded-full blur-2xl opacity-10 ${styles.bg}`}></div>

                                    {/* Top Row */}
                                    <div className="flex justify-between items-start relative z-10">
                                        <div className={`w-14 h-14 rounded-2xl ${styles.bg} flex items-center justify-center text-white shadow-lg shadow-black/5`}>
                                            <CreditCardIcon size={28} strokeWidth={1.5} />
                                        </div>
                                        <div className="flex flex-col items-end">
                                            <span className="text-[10px] font-extrabold text-slate-300 dark:text-slate-600 uppercase tracking-widest mb-1">
                                                {card.name.split(' ')[0]}
                                            </span>
                                            <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wide ${ownerBadge.style}`}>
                                                {ownerBadge.label}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Middle Info */}
                                    <div className="mt-2 relative z-10">
                                        <h3 className="font-bold text-xl text-slate-900 dark:text-white mb-1 truncate" title={card.name}>
                                            {card.name}
                                        </h3>
                                        <div className="flex items-center gap-1.5 text-slate-400 dark:text-slate-500 text-sm font-medium tracking-widest">
                                            <span className="text-lg leading-3 mx-0.5">•</span>
                                            <span className="text-lg leading-3 mx-0.5">•</span>
                                            <span className="text-lg leading-3 mx-0.5">•</span>
                                            <span className="text-lg leading-3 mx-0.5">•</span>
                                            <span>8821</span>
                                        </div>

                                        <div className="mt-8">
                                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">FATURA ATUAL</p>
                                            <div className="flex items-baseline gap-1">
                                                <span className="text-sm font-semibold text-slate-400">R$</span>
                                                <span className="text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                                                    {currentDebt.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Bottom Row (Limit & Progress) */}
                                    <div className="pt-5 border-t border-slate-100 dark:border-slate-800 mt-auto relative z-10">
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="text-xs text-slate-500 font-semibold">Limite Usado</span>
                                            <span className="text-xs text-slate-900 dark:text-white font-bold">{usagePercent.toFixed(0)}%</span>
                                        </div>

                                        <div className="h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden mb-3">
                                            <div
                                                className={`h-full rounded-full transition-all duration-1000 ease-out bg-emerald-500`}
                                                style={{ width: `${usagePercent}%` }}
                                            ></div>
                                        </div>

                                        <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                                            <span>DISP: R$ {available.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
                                            <span>VENCE DIA {card.due_day}</span>
                                        </div>
                                    </div>

                                    <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleOpenInvoiceModal(card); }}
                                            className="p-2 bg-white/90 dark:bg-slate-800/90 text-slate-600 rounded-lg hover:text-emerald-600 shadow-sm backdrop-blur-sm"
                                            title="Adicionar Fatura"
                                        >
                                            <PlusCircle size={14} />
                                        </button>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleOpenCardModal(card); }}
                                            className="p-2 bg-white/90 dark:bg-slate-800/90 text-slate-600 rounded-lg hover:text-blue-600 shadow-sm backdrop-blur-sm"
                                            title="Editar"
                                        >
                                            <Edit size={14} />
                                        </button>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleDeleteCard(card.id); }}
                                            className="p-2 bg-white/90 dark:bg-slate-800/90 text-slate-600 rounded-lg hover:text-rose-600 shadow-sm backdrop-blur-sm"
                                            title="Excluir"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            {/* Monthly Invoices Section */}
            <div className="mt-12">
                <div className="flex items-end justify-between mb-6">
                    <div>
                        <h3 className="text-2xl font-bold text-slate-900 dark:text-white">Faturas Mensais</h3>
                        <p className="text-slate-500 dark:text-slate-400 mt-1">Registre o valor total de cada fatura mensal.</p>
                    </div>
                </div>

                <Card>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
                                <tr>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 dark:text-slate-300 uppercase">Cartão</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 dark:text-slate-300 uppercase">Mês/Ano</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 dark:text-slate-300 uppercase">Valor</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 dark:text-slate-300 uppercase">Vencimento</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 dark:text-slate-300 uppercase">Status</th>
                                    <th className="px-6 py-4 text-right text-xs font-bold text-slate-600 dark:text-slate-300 uppercase">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {invoices.length > 0 ? (
                                    invoices.map(invoice => {
                                        const card = creditCards.find(c => c.id === invoice.credit_card_id);
                                        const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
                                        return (
                                            <tr key={invoice.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-2">
                                                        <CreditCardIcon size={16} className="text-slate-400" />
                                                        <span className="font-medium text-slate-900 dark:text-white">{card?.name || 'Cartão'}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-slate-600 dark:text-slate-400">
                                                    {monthNames[invoice.month - 1]}/{invoice.year}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="font-bold text-slate-900 dark:text-white">
                                                        R$ {parseFloat(invoice.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-slate-600 dark:text-slate-400">
                                                    {new Date(invoice.due_date).toLocaleDateString('pt-BR')}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`px-2 py-1 rounded-md text-xs font-semibold ${invoice.paid ? 'bg-emerald-100 text-emerald-700' : 'bg-orange-100 text-orange-700'}`}>
                                                        {invoice.paid ? 'Paga' : 'Pendente'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <div className="flex gap-2 justify-end">
                                                        <button
                                                            onClick={() => handleOpenInvoiceModal(null, invoice)}
                                                            className="p-2 hover:bg-blue-50 dark:hover:bg-blue-900/20 text-blue-600 rounded-lg transition-colors"
                                                            title="Editar"
                                                        >
                                                            <Edit size={16} />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteInvoice(invoice.id)}
                                                            className="p-2 hover:bg-rose-50 dark:hover:bg-rose-900/20 text-rose-600 rounded-lg transition-colors"
                                                            title="Excluir"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                ) : (
                                    <tr>
                                        <td colSpan="6" className="px-6 py-12 text-center text-slate-400">
                                            Nenhuma fatura cadastrada. Clique em um cartão acima para adicionar.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </Card>
            </div>

            {/* Invoice Modal */}
            <Modal isOpen={isInvoiceModalOpen} onClose={() => setIsInvoiceModalOpen(false)} title={editingInvoice ? "Editar Fatura" : "Nova Fatura"}>
                <form onSubmit={handleSaveInvoice} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Cartão</label>
                        <select
                            value={invoiceFormData.credit_card_id}
                            onChange={e => setInvoiceFormData({ ...invoiceFormData, credit_card_id: e.target.value })}
                            required
                            disabled={!!editingInvoice}
                            className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50"
                        >
                            <option value="">Selecione um cartão</option>
                            {creditCards.map(card => (
                                <option key={card.id} value={card.id}>{card.name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Mês</label>
                            <select
                                value={invoiceFormData.month}
                                onChange={e => setInvoiceFormData({ ...invoiceFormData, month: parseInt(e.target.value) })}
                                required
                                disabled={!!editingInvoice}
                                className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50"
                            >
                                {['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'].map((m, i) => (
                                    <option key={i + 1} value={i + 1}>{m}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Ano</label>
                            <input
                                type="number"
                                value={invoiceFormData.year}
                                onChange={e => setInvoiceFormData({ ...invoiceFormData, year: parseInt(e.target.value) })}
                                required
                                disabled={!!editingInvoice}
                                className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Valor da Fatura (R$)</label>
                        <input
                            type="number"
                            step="0.01"
                            value={invoiceFormData.amount}
                            onChange={e => setInvoiceFormData({ ...invoiceFormData, amount: e.target.value })}
                            required
                            placeholder="0.00"
                            className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Data de Vencimento</label>
                        <input
                            type="date"
                            value={invoiceFormData.due_date}
                            onChange={e => setInvoiceFormData({ ...invoiceFormData, due_date: e.target.value })}
                            required
                            className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                    </div>

                    <div className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            id="paid"
                            checked={invoiceFormData.paid}
                            onChange={e => setInvoiceFormData({ ...invoiceFormData, paid: e.target.checked })}
                            className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
                        />
                        <label htmlFor="paid" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                            Fatura já foi paga
                        </label>
                    </div>

                    {invoiceFormData.paid && (
                        <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Carteira para Pagamento</label>
                            <select
                                value={invoiceFormData.wallet_id}
                                onChange={e => setInvoiceFormData({ ...invoiceFormData, wallet_id: e.target.value })}
                                required={invoiceFormData.paid}
                                className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            >
                                <option value="">Selecione uma carteira</option>
                                {wallets.map(wallet => (
                                    <option key={wallet.id} value={wallet.id}>{wallet.name}</option>
                                ))}
                            </select>
                            <p className="text-xs text-slate-500 mt-1">
                                O valor da fatura será descontado do saldo desta carteira.
                            </p>
                        </div>
                    )}

                    <button
                        type="submit"
                        className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3 rounded-xl transition-colors shadow-lg shadow-emerald-500/30"
                    >
                        {editingInvoice ? 'Atualizar Fatura' : 'Salvar Fatura'}
                    </button>
                </form>
            </Modal>

            {/* Add/Edit Card Modal */}
            <Modal isOpen={isCardModalOpen} onClose={() => setIsCardModalOpen(false)} title={editingCard ? "Editar Cartão" : "Novo Cartão"}>
                <form onSubmit={handleSaveCard} className="space-y-4">
                    {partner && (
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Propriedade do Cartão</label>
                            <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                                <button
                                    type="button"
                                    onClick={() => setCardFormData({ ...cardFormData, is_joint: true })}
                                    className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${cardFormData.is_joint ? 'bg-white dark:bg-slate-700 text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                >
                                    Conjunto
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setCardFormData({ ...cardFormData, is_joint: false })}
                                    className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${!cardFormData.is_joint ? 'bg-white dark:bg-slate-700 text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                >
                                    Individual ({user?.name})
                                </button>
                            </div>
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Nome do Cartão</label>
                        <input
                            type="text"
                            required
                            placeholder="Ex: Nubank Platinum"
                            value={cardFormData.name}
                            onChange={e => setCardFormData({ ...cardFormData, name: e.target.value })}
                            className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Limite Total (R$)</label>
                            <input
                                type="number"
                                required
                                step="0.01"
                                placeholder="0.00"
                                value={cardFormData.limit}
                                onChange={e => setCardFormData({ ...cardFormData, limit: e.target.value })}
                                className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Limite Utilizado (R$)</label>
                            <input
                                type="number"
                                step="0.01"
                                placeholder="0.00"
                                value={cardFormData.current_used_limit}
                                onChange={e => setCardFormData({ ...cardFormData, current_used_limit: e.target.value })}
                                className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Dia do Vencimento</label>
                            <select
                                value={cardFormData.due_day}
                                onChange={e => setCardFormData({ ...cardFormData, due_day: e.target.value })}
                                className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            >
                                {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                                    <option key={day} value={day}>Dia {day}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Dia do Fechamento</label>
                            <select
                                value={cardFormData.closing_day}
                                onChange={e => setCardFormData({ ...cardFormData, closing_day: e.target.value })}
                                className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            >
                                {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                                    <option key={day} value={day}>Dia {day}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <button type="submit" className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3 rounded-xl transition-colors shadow-lg shadow-emerald-500/30">
                        {editingCard ? 'Atualizar Cartão' : 'Salvar Cartão'}
                    </button>
                </form>
            </Modal>

            <ConfirmModal
                isOpen={deleteInvoiceConfirmOpen}
                onClose={() => setDeleteInvoiceConfirmOpen(false)}
                onConfirm={confirmDeleteInvoice}
                title="Excluir Fatura"
                message="Tem certeza que deseja excluir esta fatura?"
                type="danger"
                confirmText="Excluir"
                cancelText="Cancelar"
            />

            <ConfirmModal
                isOpen={deleteCardConfirmOpen}
                onClose={() => setDeleteCardConfirmOpen(false)}
                onConfirm={confirmDeleteCard}
                title="Excluir Cartão"
                message="Tem certeza? Isso excluirá todas as compras deste cartão."
                type="danger"
                confirmText="Excluir"
                cancelText="Cancelar"
            />
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

export default CreditCards;
