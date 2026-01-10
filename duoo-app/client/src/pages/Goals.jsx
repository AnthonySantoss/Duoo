import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { PlusCircle, Edit, Trash2, TrendingUp, Users } from 'lucide-react';
import Card from '../components/ui/Card';
import ProgressBar from '../components/ui/ProgressBar';
import Modal from '../components/ui/Modal';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

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

    const [formData, setFormData] = useState({
        title: '',
        target_amount: '',
        current_amount: '0',
        is_joint: false,
        is_yielding: false,
        cdi_percentage: '100',
        bank_name: ''
    });

    useEffect(() => {
        fetchGoals();
    }, [viewMode]);

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
                bank_name: goal.bank_name || ''
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
                bank_name: ''
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
            bank_name: formData.is_yielding ? formData.bank_name : null
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
            alert(error.response?.data?.error || 'Erro ao salvar meta');
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('Tem certeza que deseja excluir esta meta?')) return;

        try {
            await api.delete(`/goals/${id}`);
            fetchGoals();
        } catch (error) {
            console.error('Failed to delete goal:', error);
            alert(error.response?.data?.error || 'Erro ao excluir meta');
        }
    };

    const handleOpenProgressModal = (goal) => {
        setSelectedGoal(goal);
        setProgressAmount('');
        setIsProgressModalOpen(true);
    };

    const handleAddProgress = async (e) => {
        e.preventDefault();

        try {
            await api.post(`/goals/${selectedGoal.id}/progress`, {
                amount: parseFloat(progressAmount)
            });

            setIsProgressModalOpen(false);
            fetchGoals();
            setProgressAmount('');
        } catch (error) {
            console.error('Failed to add progress:', error);
            alert(error.response?.data?.error || 'Erro ao adicionar progresso');
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
                            <Card key={goal.id} className="group relative">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex-1">
                                        <h4 className="font-bold mb-1">{goal.title}</h4>
                                        {getOwnerLabel(goal)}
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
                                <div className="flex justify-between text-xs mt-3 text-slate-500">
                                    <span>R$ {parseFloat(goal.current_amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                    <span>Meta: R$ {parseFloat(goal.target_amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
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
                            Progresso atual: R$ {parseFloat(selectedGoal?.current_amount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} de R$ {parseFloat(selectedGoal?.target_amount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
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

                    <button type="submit" className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3 rounded-xl transition-colors shadow-lg shadow-emerald-500/30">
                        Adicionar Progresso
                    </button>
                </form>
            </Modal>
        </div>
    );
};

export default Goals;
