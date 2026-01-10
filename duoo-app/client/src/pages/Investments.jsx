import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { CreditCard as CreditCardIcon, PlusCircle, Edit, Trash2, ShoppingCart, Calendar, TrendingDown, ChevronRight } from 'lucide-react';
import Card from '../components/ui/Card';
import Modal from '../components/ui/Modal';
import ProgressBar from '../components/ui/ProgressBar';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const CreditCards = () => {
    const { viewMode } = useOutletContext();
    const { user, partner } = useAuth();
    const [creditCards, setCreditCards] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isCardModalOpen, setIsCardModalOpen] = useState(false);
    const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);
    const [editingCard, setEditingCard] = useState(null);
    const [selectedCard, setSelectedCard] = useState(null);
    const [selectedCardPurchases, setSelectedCardPurchases] = useState([]);

    const [cardFormData, setCardFormData] = useState({
        name: '',
        limit: '',
        due_day: '10',
        closing_day: '5',
        is_joint: true,
        current_used_limit: ''
    });

    const [purchaseFormData, setPurchaseFormData] = useState({
        description: '',
        total_amount: '',
        installments: '1',
        purchase_date: new Date().toISOString().split('T')[0]
    });

    useEffect(() => {
        fetchCreditCards();
    }, [viewMode]);

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

    const fetchPurchases = async (cardId) => {
        try {
            const res = await api.get(`/credit-cards/${cardId}/purchases`);
            setSelectedCardPurchases(res.data);
        } catch (error) {
            console.error('Failed to fetch purchases:', error);
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
            alert(error.response?.data?.error || 'Erro ao salvar cartão');
        }
    };

    const handleDeleteCard = async (id) => {
        if (!confirm('Tem certeza? Isso excluirá todas as compras deste cartão.')) return;

        try {
            await api.delete(`/credit-cards/${id}`);
            fetchCreditCards();
        } catch (error) {
            console.error('Failed to delete credit card:', error);
            alert(error.response?.data?.error || 'Erro ao excluir cartão');
        }
    };

    const handleOpenPurchaseModal = async (card) => {
        setSelectedCard(card);
        await fetchPurchases(card.id);
        setPurchaseFormData({
            description: '',
            total_amount: '',
            installments: '1',
            purchase_date: new Date().toISOString().split('T')[0]
        });
        setIsPurchaseModalOpen(true);
    };

    const handleAddPurchase = async (e) => {
        e.preventDefault();

        try {
            await api.post(`/credit-cards/${selectedCard.id}/purchases`, purchaseFormData);

            setPurchaseFormData({
                description: '',
                total_amount: '',
                installments: '1',
                purchase_date: new Date().toISOString().split('T')[0]
            });

            await fetchPurchases(selectedCard.id);
            await fetchCreditCards();
            alert('Compra adicionada com sucesso!');
        } catch (error) {
            console.error('Failed to add purchase:', error);
            alert(error.response?.data?.error || 'Erro ao adicionar compra');
        }
    };

    const handleDeletePurchase = async (purchaseId) => {
        if (!confirm('Tem certeza que deseja excluir esta compra?')) return;

        try {
            await api.delete(`/credit-cards/purchases/${purchaseId}`);
            await fetchPurchases(selectedCard.id);
            await fetchCreditCards();
        } catch (error) {
            console.error('Failed to delete purchase:', error);
            alert(error.response?.data?.error || 'Erro ao excluir compra');
        }
    };

    const handlePayInstallment = async (purchaseId, currentRemaining) => {
        const newRemaining = Math.max(0, currentRemaining - 1);

        try {
            await api.put(`/credit-cards/purchases/${purchaseId}`, {
                remaining_installments: newRemaining
            });
            await fetchPurchases(selectedCard.id);
            await fetchCreditCards();
            alert('Parcela paga com sucesso!');
        } catch (error) {
            console.error('Failed to pay installment:', error);
            alert(error.response?.data?.error || 'Erro ao pagar parcela');
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

            {/* Credit Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
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
                        const currentDebt = parseFloat(card.current_debt || 0);
                        const limit = parseFloat(card.limit || 0);
                        const usagePercent = limit > 0 ? Math.min(100, (currentDebt / limit) * 100) : 0;
                        const available = Math.max(0, limit - currentDebt);

                        let ownerBadge = { label: 'CONJUNTO', style: 'bg-emerald-100 text-emerald-800 dark:text-emerald-400 dark:bg-emerald-900/30' };
                        // Simple logic to detect owner from card name or use viewMode default
                        // In a real app we'd use card.User data
                        if (card.name.toLowerCase().includes('bruno')) ownerBadge = { label: 'BRUNO', style: 'bg-purple-100 text-purple-800 dark:text-purple-400 dark:bg-purple-900/30' };
                        else if (card.name.toLowerCase().includes('ana')) ownerBadge = { label: 'ANA', style: 'bg-blue-100 text-blue-800 dark:text-blue-400 dark:bg-blue-900/30' };

                        return (
                            <div
                                key={card.id}
                                className="group relative bg-white dark:bg-slate-900 rounded-[28px] p-7 shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden flex flex-col justify-between h-[340px] hover:shadow-md transition-all cursor-pointer"
                                onClick={() => handleOpenPurchaseModal(card)}
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

            {/* Purchases Modal */}
            <Modal isOpen={isPurchaseModalOpen} onClose={() => setIsPurchaseModalOpen(false)} title={`Compras - ${selectedCard?.name}`}>
                <div className="space-y-6">
                    {/* Add Purchase Form */}
                    <form onSubmit={handleAddPurchase} className="space-y-4 pb-4 border-b border-slate-200 dark:border-slate-800">
                        <h4 className="font-bold flex items-center gap-2">
                            <PlusCircle size={16} />
                            Nova Compra
                        </h4>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Descrição</label>
                            <input
                                type="text"
                                required
                                placeholder="Ex: Notebook, Celular..."
                                value={purchaseFormData.description}
                                onChange={e => setPurchaseFormData({ ...purchaseFormData, description: e.target.value })}
                                className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Valor Total (R$)</label>
                                <input
                                    type="number"
                                    required
                                    step="0.01"
                                    placeholder="0.00"
                                    value={purchaseFormData.total_amount}
                                    onChange={e => setPurchaseFormData({ ...purchaseFormData, total_amount: e.target.value })}
                                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Parcelas</label>
                                <select
                                    value={purchaseFormData.installments}
                                    onChange={e => setPurchaseFormData({ ...purchaseFormData, installments: e.target.value })}
                                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                >
                                    {Array.from({ length: 24 }, (_, i) => i + 1).map(num => (
                                        <option key={num} value={num}>{num}x</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Data da Compra</label>
                            <input
                                type="date"
                                value={purchaseFormData.purchase_date}
                                onChange={e => setPurchaseFormData({ ...purchaseFormData, purchase_date: e.target.value })}
                                className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            />
                        </div>

                        <button type="submit" className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3 rounded-xl transition-colors">
                            Adicionar Compra
                        </button>
                    </form>

                    {/* Purchases List */}
                    <div>
                        <h4 className="font-bold mb-3">Compras Ativas</h4>
                        {selectedCardPurchases.length === 0 ? (
                            <p className="text-center text-slate-500 py-8">Nenhuma compra cadastrada</p>
                        ) : (
                            <div className="space-y-3">
                                {selectedCardPurchases.filter(p => p.remaining_installments > 0).map(purchase => (
                                    <div key={purchase.id} className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl">
                                        <div className="flex justify-between items-start mb-2">
                                            <div className="flex-1">
                                                <h5 className="font-bold">{purchase.description}</h5>
                                                <p className="text-xs text-slate-500">
                                                    {purchase.remaining_installments}x de R$ {parseFloat(purchase.installment_amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                </p>
                                            </div>
                                            <button
                                                onClick={() => handleDeletePurchase(purchase.id)}
                                                className="p-1 hover:bg-rose-100 dark:hover:bg-rose-900/20 text-rose-600 rounded transition-colors"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-slate-600 dark:text-slate-400">
                                                Faltam {purchase.remaining_installments} de {purchase.installments} parcelas
                                            </span>
                                            <button
                                                onClick={() => handlePayInstallment(purchase.id, purchase.remaining_installments)}
                                                className="px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white text-xs rounded-lg transition-colors"
                                            >
                                                Pagar 1 parcela
                                            </button>
                                        </div>
                                        <ProgressBar
                                            progress={((purchase.installments - purchase.remaining_installments) / purchase.installments) * 100}
                                            colorClass="bg-emerald-500"
                                            className="mt-2"
                                        />
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default CreditCards;
