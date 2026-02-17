import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { PlusCircle, Edit, Trash2, TrendingUp, Users, Receipt, Landmark } from 'lucide-react';
import Card from '../components/ui/Card';
import ProgressBar from '../components/ui/ProgressBar';
import Modal from '../components/ui/Modal';
import ConfirmModal from '../components/ui/ConfirmModal';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import Toast from '../components/ui/Toast';
import { formatDisplayDate } from '../utils/dateUtils';

const Goals = () => {
    const { viewMode } = useOutletContext();
    const { user, partner, hasPartner } = useAuth();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isProgressModalOpen, setIsProgressModalOpen] = useState(false);
    const [goals, setGoals] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editingGoal, setEditingGoal] = useState(null);
    const [selectedGoal, setSelectedGoal] = useState(null);
    const [progressAmount, setProgressAmount] = useState('');
    const [toast, setToast] = useState(null);
    const [wallets, setWallets] = useState([]);
    const [selectedWallet, setSelectedWallet] = useState('');
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [goalToDelete, setGoalToDelete] = useState(null);
    const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
    const [linkedTransactions, setLinkedTransactions] = useState([]);

    const [formData, setFormData] = useState({
        title: '',
        target_amount: '',
        current_amount: '0',
        is_joint: false,
        is_yielding: false,
        cdi_percentage: '100',
        bank_name: '',
        is_event_bucket: false
    });

    useEffect(() => {
        fetchGoals();
        fetchWallets();
    }, [viewMode]);

    const fetchWallets = async () => {
        try {
            const res = await api.get('/wallets');
            setWallets(res.data);
            if (res.data.length > 0) {
                // Default to first wallet if available, or keep empty?
                // keeping empty to be optional as per previous thought, or maybe default?
                // Let's keep empty by default so user consciously chooses to create a transaction.
                // But wait, user said "money doesn't leave balance", so they WANT it to.
                // So maybe defaulting to the first wallet is better UX.
                setSelectedWallet(res.data[0].id);
            }
        } catch (error) {
            console.error('Failed to fetch wallets:', error);
        }
    };

    const fetchGoals = async () => {
        setLoading(true);
        try {
            const res = await api.get('/goals', {
                params: { viewMode }
            });
            setGoals(res.data);
        } catch (error) {
            console.error('Failed to fetch goals:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleOpenModal = (goal = null) => {
        if (goal) {
            setEditingGoal(goal);
            setFormData({
                title: goal.title,
                target_amount: goal.target_amount.toString(),
                current_amount: goal.current_amount.toString(),
                is_joint: goal.is_joint || false,
                is_yielding: goal.is_yielding || false,
                cdi_percentage: goal.cdi_percentage ? goal.cdi_percentage.toString() : '100',
                bank_name: goal.bank_name || '',
                is_event_bucket: goal.is_event_bucket || false
            });
        } else {
            setEditingGoal(null);
            setFormData({
                title: '',
                target_amount: '',
                current_amount: '0',
                is_joint: false,
                is_yielding: false,
                cdi_percentage: '100',
                bank_name: '',
                is_event_bucket: false
            });
        }
        setIsModalOpen(true);
    };

    const handleSave = async (e) => {
        e.preventDefault();

        const payload = {
            title: formData.title,
            target_amount: parseFloat(formData.target_amount),
            current_amount: parseFloat(formData.current_amount),
            is_joint: formData.is_joint,
            is_yielding: formData.is_yielding,
            cdi_percentage: formData.is_yielding ? parseFloat(formData.cdi_percentage) : null,
            bank_name: formData.is_yielding ? formData.bank_name : null,
            is_event_bucket: formData.is_event_bucket
        };

        try {
            if (editingGoal) {
                await api.put(`/goals/${editingGoal.id}`, payload);
            } else {
                await api.post('/goals', payload);
            }

            setIsModalOpen(false);
            fetchGoals();
            setFormData({ title: '', target_amount: '', current_amount: '0', is_joint: false, is_yielding: false, cdi_percentage: '100', bank_name: '' });
        } catch (error) {
            console.error('Failed to save goal:', error);
            setToast({ message: error.response?.data?.error || 'Erro ao salvar meta', type: 'error' });
        }
    };

    const handleDelete = (id) => {
        setGoalToDelete(id);
        setDeleteConfirmOpen(true);
    };

    const confirmDelete = async () => {
        if (!goalToDelete) return;
        try {
            await api.delete(`/goals/${goalToDelete}`);
            fetchGoals();
            setToast({ message: 'Meta excluída com sucesso', type: 'success' });
        } catch (error) {
            console.error('Failed to delete goal:', error);
            setToast({ message: error.response?.data?.error || 'Erro ao excluir meta', type: 'error' });
        } finally {
            setGoalToDelete(null);
        }
    };

    const handleOpenProgressModal = (goal) => {
        setSelectedGoal(goal);
        setProgressAmount('');
        // Reset wallet selection or keep default? Let's default to first wallet if available
        if (wallets.length > 0) setSelectedWallet(wallets[0].id);
        else setSelectedWallet('');
        setIsProgressModalOpen(true);
    };

    const fetchLinkedTransactions = async (goalId) => {
        try {
            const res = await api.get(`/transactions`, { params: { goal_id: goalId } });
            setLinkedTransactions(res.data);
        } catch (error) {
            console.error('Failed to fetch linked transactions:', error);
        }
    };

    const handleOpenDetails = async (goal) => {
        setSelectedGoal(goal);
        setLinkedTransactions([]);
        setIsDetailsModalOpen(true);
        if (goal.is_event_bucket) {
            fetchLinkedTransactions(goal.id);
        }
    };

    const handleAddProgress = async (e) => {
        e.preventDefault();

        try {
            await api.post(`/goals/${selectedGoal.id}/progress`, {
                amount: parseFloat(progressAmount),
                wallet_id: selectedWallet
            });

            setIsProgressModalOpen(false);
            fetchGoals();
            setProgressAmount('');
        } catch (error) {
            console.error('Failed to add progress:', error);
            setToast({ message: error.response?.data?.error || 'Erro ao adicionar progresso', type: 'error' });
        }
    };

    const getOwnerLabel = (goal) => {
        if (goal.is_joint && partner) {
            return (
                <div className="flex items-center gap-1 text-xs text-slate-500">
                    <Users size={12} />
                    <span>{user?.name} & {partner.name}</span>
                </div>
            );
        }
        if (!goal.User) return 'Desconhecido';
        if (goal.User.id === user?.id) return user?.name || 'Você';
        if (partner && goal.User.id === partner.id) return partner.name;
        return goal.User.name;
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
            <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold">Metas de Poupança</h3>
                <button
                    onClick={() => handleOpenModal()}
                    className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-lg font-bold text-sm hover:bg-emerald-600 transition-colors"
                >
                    <PlusCircle size={16} /> Nova Meta
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {goals.length === 0 ? (
                    <Card className="col-span-full text-center py-12">
                        <p className="text-slate-500">Nenhuma meta encontrada. Crie sua primeira meta!</p>
                    </Card>
                ) : (
                    goals.map(goal => {
                        const progress = (parseFloat(goal.current_amount) / parseFloat(goal.target_amount)) * 100;
                        return (
                            <Card
                                key={goal.id}
                                className={`group relative cursor-pointer hover:ring-2 hover:ring-emerald-500/20 transition-all ${goal.is_event_bucket ? 'border-2 border-blue-100 dark:border-blue-900/30' : ''}`}
                                onClick={() => handleOpenDetails(goal)}
                            >
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex-1">
                                        <h4 className="font-bold mb-1">{goal.title}</h4>
                                        <div className="flex items-center gap-2">
                                            {getOwnerLabel(goal)}
                                            {goal.is_event_bucket && (
                                                <span className="text-[10px] bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded font-black uppercase tracking-wider">
                                                    Cesto
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs font-bold px-2 py-1 bg-slate-100 rounded-lg">
                                            {progress.toFixed(0)}%
                                        </span>
                                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={() => handleOpenProgressModal(goal)}
                                                className="p-1.5 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 text-emerald-600 rounded-lg transition-colors"
                                                title="Adicionar Progresso"
                                            >
                                                <TrendingUp size={14} />
                                            </button>
                                            <button
                                                onClick={() => handleOpenModal(goal)}
                                                className="p-1.5 hover:bg-blue-50 dark:hover:bg-blue-900/20 text-blue-600 rounded-lg transition-colors"
                                                title="Editar"
                                            >
                                                <Edit size={14} />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(goal.id)}
                                                className="p-1.5 hover:bg-rose-50 dark:hover:bg-rose-900/20 text-rose-600 rounded-lg transition-colors"
                                                title="Excluir"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                                <ProgressBar
                                    progress={progress}
                                    colorClass={goal.is_joint ? "bg-emerald-500" : progress >= 100 ? "bg-emerald-500" : "bg-blue-500"}
                                />
                                {goal.is_yielding && (
                                    <div className="mt-3 flex items-center gap-3 bg-emerald-50 dark:bg-emerald-900/10 p-2.5 rounded-xl border border-emerald-100 dark:border-emerald-900/20">
                                        <div className="bg-emerald-100 dark:bg-emerald-900/40 p-1.5 rounded-lg shrink-0">
                                            <TrendingUp size={16} className="text-emerald-600 dark:text-emerald-400 animate-pulse" />
                                        </div>
                                        <div className="flex flex-col leading-none">
                                            <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">
                                                Rendeu até hoje
                                            </span>
                                            <div className="flex items-baseline gap-1.5">
                                                <span className="text-sm font-bold text-emerald-700 dark:text-emerald-300">
                                                    + R$ {parseFloat(goal.accumulated_yield || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                </span>
                                                <span className="text-[10px] font-medium text-emerald-600/70 dark:text-emerald-400/70">
                                                    ({goal.cdi_percentage}% CDI)
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                )}
                                <div className="flex justify-between text-xs mt-3 text-slate-500">
                                    <span>R$ {parseFloat(goal.current_amount).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                    <span>Meta: R$ {parseFloat(goal.target_amount).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                </div>
                            </Card>
                        );
                    })
                )}
            </div>

            {/* Nova/Editar Meta Modal */}
            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingGoal ? "Editar Meta" : "Nova Meta"}>
                <form onSubmit={handleSave} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Título da Meta</label>
                        <input
                            type="text"
                            required
                            placeholder="Ex: Carro Novo"
                            value={formData.title}
                            onChange={e => setFormData({ ...formData, title: e.target.value })}
                            className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Valor Alvo (R$)</label>
                        <input
                            type="number"
                            required
                            step="0.01"
                            placeholder="Ex: 50000"
                            value={formData.target_amount}
                            onChange={e => setFormData({ ...formData, target_amount: e.target.value })}
                            className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                            {editingGoal ? 'Valor Atual (R$)' : 'Já economizado (opcional)'}
                        </label>
                        <input
                            type="number"
                            step="0.01"
                            value={formData.current_amount}
                            onChange={e => setFormData({ ...formData, current_amount: e.target.value })}
                            className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                    </div>

                    <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                        <label className="flex items-center gap-2 cursor-pointer mb-3">
                            <input
                                type="checkbox"
                                checked={formData.is_yielding}
                                onChange={e => setFormData({ ...formData, is_yielding: e.target.checked })}
                                className="w-4 h-4 text-emerald-600 bg-white border-slate-300 rounded focus:ring-emerald-500 focus:ring-2"
                            />
                            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                Este dinheiro está rendendo?
                            </span>
                        </label>

                        {formData.is_yielding && (
                            <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2 duration-300">
                                <div>
                                    <label className="block text-xs font-medium text-slate-500 mb-1">% do CDI</label>
                                    <input
                                        type="number"
                                        placeholder="100"
                                        value={formData.cdi_percentage}
                                        onChange={e => setFormData({ ...formData, cdi_percentage: e.target.value })}
                                        className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-slate-500 mb-1">Banco / Corretora</label>
                                    <input
                                        type="text"
                                        placeholder="Ex: Nubank, Inter"
                                        value={formData.bank_name}
                                        onChange={e => setFormData({ ...formData, bank_name: e.target.value })}
                                        className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    {hasPartner && (
                        <div>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={formData.is_joint}
                                    onChange={e => setFormData({ ...formData, is_joint: e.target.checked })}
                                    className="w-4 h-4 text-emerald-600 bg-slate-100 border-slate-300 rounded focus:ring-emerald-500 focus:ring-2"
                                />
                                <span className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1">
                                    <Users size={16} />
                                    Meta conjunta com {partner?.name}
                                </span>
                            </label>
                            <p className="text-xs text-slate-500 mt-1 ml-6">
                                Ambos poderão visualizar e contribuir para esta meta
                            </p>
                        </div>
                    )}

                    <div className="bg-blue-50 dark:bg-blue-900/10 p-4 rounded-xl border border-blue-100 dark:border-blue-800">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={formData.is_event_bucket}
                                onChange={e => setFormData({ ...formData, is_event_bucket: e.target.checked })}
                                className="w-4 h-4 text-blue-600 bg-white border-slate-300 rounded focus:ring-blue-500 focus:ring-2"
                            />
                            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                É um "Cesto de Evento"? (Ex: Casamento, Viagem)
                            </span>
                        </label>
                        <p className="text-[10px] text-blue-600 dark:text-blue-400 mt-1 ml-6 leading-tight">
                            Permite vincular gastos específicos diretamente a esta meta para acompanhamento detalhado.
                        </p>
                    </div>

                    <button type="submit" className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3 rounded-xl transition-colors shadow-lg shadow-emerald-500/30">
                        {editingGoal ? 'Atualizar Meta' : 'Criar Meta'}
                    </button>
                </form>
            </Modal>

            {/* Adicionar Progresso Modal */}
            <Modal isOpen={isProgressModalOpen} onClose={() => setIsProgressModalOpen(false)} title="Adicionar Progresso">
                <form onSubmit={handleAddProgress} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                            Meta: {selectedGoal?.title}
                        </label>
                        <p className="text-xs text-slate-500 mb-3">
                            Progresso atual: R$ {parseFloat(selectedGoal?.current_amount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} de R$ {parseFloat(selectedGoal?.target_amount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Valor a Adicionar (R$)</label>
                        <input
                            type="number"
                            required
                            step="0.01"
                            placeholder="Ex: 500.00"
                            value={progressAmount}
                            onChange={e => setProgressAmount(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Carteira de Origem (Opcional)</label>
                        <select
                            value={selectedWallet || ''}
                            onChange={e => setSelectedWallet(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        >
                            <option value="">Não debitar de nenhuma carteira</option>
                            {wallets.map(wallet => (
                                <option key={wallet.id} value={wallet.id}>{wallet.name}</option>
                            ))}
                        </select>
                        <p className="text-xs text-slate-500 mt-1">
                            Se selecionado, o valor será descontado do saldo da carteira como um investimento.
                        </p>
                    </div>

                    <button type="submit" className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3 rounded-xl transition-colors shadow-lg shadow-emerald-500/30">
                        Adicionar Progresso
                    </button>
                </form>
            </Modal>

            {/* Detalhes da Meta / Cesto */}
            <Modal isOpen={isDetailsModalOpen} onClose={() => setIsDetailsModalOpen(false)} title={selectedGoal?.title}>
                <div className="space-y-6">
                    <div className="bg-slate-50 dark:bg-slate-800 p-6 rounded-2xl space-y-4">
                        <div className="flex justify-between items-center">
                            <span className="text-sm font-bold text-slate-500 uppercase tracking-widest">Progresso Total</span>
                            <span className="text-xl font-black text-emerald-500">
                                {((parseFloat(selectedGoal?.current_amount || 0) / parseFloat(selectedGoal?.target_amount || 1)) * 100).toFixed(1)}%
                            </span>
                        </div>
                        <ProgressBar
                            progress={(parseFloat(selectedGoal?.current_amount || 0) / parseFloat(selectedGoal?.target_amount || 1)) * 100}
                            colorClass="bg-emerald-500"
                        />
                        <div className="flex justify-between text-xs font-bold text-slate-400 uppercase">
                            <span>R$ {parseFloat(selectedGoal?.current_amount || 0).toLocaleString('pt-BR')}</span>
                            <span>Meta: R$ {parseFloat(selectedGoal?.target_amount || 0).toLocaleString('pt-BR')}</span>
                        </div>
                    </div>

                    {selectedGoal?.is_event_bucket && (
                        <div className="space-y-4">
                            <h4 className="font-black text-slate-900 dark:text-white flex items-center gap-2">
                                <Receipt size={18} className="text-blue-500" /> Transações Vinculadas
                            </h4>
                            <div className="max-h-[300px] overflow-y-auto space-y-2 pr-2 scrollbar-thin scrollbar-thumb-slate-200">
                                {linkedTransactions.length === 0 ? (
                                    <div className="text-center py-8 text-slate-400 text-sm">Nenhuma transação vinculada ainda.</div>
                                ) : (
                                    linkedTransactions.map(t => (
                                        <div key={t.id} className="flex justify-between items-center p-3 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl">
                                            <div>
                                                <p className="font-bold text-sm">{t.title}</p>
                                                <p className="text-[10px] text-slate-400 font-bold">{formatDisplayDate(t.date)}</p>
                                            </div>
                                            <span className={`font-black text-sm ${parseFloat(t.amount) < 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                                                R$ {Math.abs(parseFloat(t.amount)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                            </span>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    )}

                    <div className="flex gap-4 pt-4 border-t border-slate-50 dark:border-slate-800">
                        <button
                            onClick={(e) => { e.stopPropagation(); handleOpenProgressModal(selectedGoal); setIsDetailsModalOpen(false); }}
                            className="flex-1 bg-emerald-500 text-white py-3 rounded-xl font-black text-sm hover:scale-[1.02] transition-all"
                        >
                            ADICIONAR FUNDOS
                        </button>
                        <button
                            onClick={(e) => { e.stopPropagation(); handleOpenModal(selectedGoal); setIsDetailsModalOpen(false); }}
                            className="px-6 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 py-3 rounded-xl font-black text-sm hover:bg-slate-200"
                        >
                            EDITAR
                        </button>
                    </div>
                </div>
            </Modal>

            <ConfirmModal
                isOpen={deleteConfirmOpen}
                onClose={() => setDeleteConfirmOpen(false)}
                onConfirm={confirmDelete}
                title="Excluir Meta"
                message="Tem certeza que deseja excluir esta meta? Esta ação não pode ser desfeita."
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

export default Goals;
