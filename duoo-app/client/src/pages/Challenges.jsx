import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Trophy, Target, Zap, UtensilsCrossed, PiggyBank, CheckCircle2, Lock, Clock, TrendingUp, PlusCircle, Settings, Edit2, X, Bell, Landmark } from 'lucide-react';
import Modal from '../components/ui/Modal';
import api from '../services/api';
import Card from '../components/ui/Card';
import Toast from '../components/ui/Toast';
import { formatDisplayDate } from '../utils/dateUtils';

const Challenges = () => {
    const { viewMode } = useOutletContext();
    const [loading, setLoading] = useState(true);
    const [challenges, setChallenges] = useState({ active: [], completed: [], available: [] });
    const [toast, setToast] = useState(null);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
    const [editingChallenge, setEditingChallenge] = useState(null);
    const [config, setConfig] = useState({
        large_transaction_limit: 500,
        weekly_report_day: 0,
        weekly_report_hour: 20,
        notifications_enabled: true
    });

    const [challengeFormData, setChallengeFormData] = useState({
        title: '',
        description: '',
        type: 'saving',
        target_amount: '',
        category: 'Outros',
        duration_days: 30,
        points: 100,
        icon: 'Trophy',
        target_type: 'expense'
    });

    useEffect(() => {
        fetchChallenges();
        fetchConfig();
    }, [viewMode]);

    const fetchConfig = async () => {
        try {
            const res = await api.get('/config');
            setConfig(res.data);
        } catch (error) {
            console.error('Error fetching config:', error);
        }
    };

    const fetchChallenges = async () => {
        try {
            const res = await api.get('/challenges');
            setChallenges(res.data);
        } catch (error) {
            console.error('Error fetching challenges:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleStart = async (challengeId) => {
        try {
            await api.post('/challenges/start', { challengeId });
            setToast({ message: 'Desafio iniciado! Boa sorte!', type: 'success' });
            fetchChallenges();
        } catch (error) {
            setToast({ message: 'Erro ao iniciar desafio.', type: 'error' });
        }
    };

    const handleSaveChallenge = async (e) => {
        e.preventDefault();
        try {
            if (editingChallenge) {
                await api.put(`/challenges/${editingChallenge.id}`, challengeFormData);
                setToast({ message: 'Desafio atualizado!', type: 'success' });
            } else {
                await api.post('/challenges', challengeFormData);
                setToast({ message: 'Desafio criado!', type: 'success' });
            }
            setIsCreateModalOpen(false);
            setEditingChallenge(null);
            fetchChallenges();
        } catch (error) {
            setToast({ message: 'Erro ao salvar desafio.', type: 'error' });
        }
    };

    const handleSaveConfig = async (e) => {
        e.preventDefault();
        try {
            await api.put('/config', config);
            setToast({ message: 'Configurações salvas!', type: 'success' });
            setIsConfigModalOpen(false);
        } catch (error) {
            setToast({ message: 'Erro ao salvar configurações.', type: 'error' });
        }
    };

    const openEdit = (c) => {
        setEditingChallenge(c);
        setChallengeFormData({
            title: c.title,
            description: c.description,
            type: c.type,
            target_amount: c.target_amount || '',
            category: c.category || 'Outros',
            duration_days: c.duration_days,
            points: c.points,
            icon: c.icon,
            target_type: c.target_type || 'expense'
        });
        setIsCreateModalOpen(true);
    };

    const getIcon = (iconName) => {
        switch (iconName) {
            case 'UtensilsCrossed': return <UtensilsCrossed className="text-rose-500" />;
            case 'Zap': return <Zap className="text-yellow-500" />;
            case 'PiggyBank': return <PiggyBank className="text-emerald-500" />;
            default: return <Trophy className="text-emerald-500" />;
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center p-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-500 p-4 max-w-5xl mx-auto">
            <div className="bg-gradient-to-r from-emerald-600 to-teal-600 p-8 rounded-3xl text-white shadow-xl relative overflow-hidden">
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="space-y-2">
                        <h2 className="text-3xl font-black mb-1 flex items-center gap-3">
                            <Trophy size={32} /> Desafios
                        </h2>
                        <p className="text-emerald-50 opacity-90 text-sm font-medium">Supere limites financeiros em casal.</p>
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={() => setIsConfigModalOpen(true)}
                            className="bg-white/20 hover:bg-white/30 p-3 rounded-2xl backdrop-blur-md transition-all active:scale-95"
                        >
                            <Settings size={20} />
                        </button>
                        <button
                            onClick={() => { setEditingChallenge(null); setChallengeFormData({ title: '', description: '', type: 'saving', target_amount: '', category: 'Outros', duration_days: 30, points: 100, icon: 'Trophy', target_type: 'expense' }); setIsCreateModalOpen(true); }}
                            className="bg-white text-emerald-600 px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-wider shadow-lg hover:bg-emerald-50 transition-all active:scale-95 flex items-center gap-2"
                        >
                            <PlusCircle size={18} /> Novo Desafio
                        </button>
                    </div>
                </div>
                <div className="absolute top-0 right-0 p-4 opacity-10 -mr-12 -mt-12">
                    <Trophy size={200} />
                </div>
            </div>

            {/* Active Challenges */}
            {challenges.active.length > 0 && (
                <section className="space-y-4">
                    <h3 className="text-lg font-black text-slate-800 dark:text-white flex items-center gap-2">
                        <Zap className="text-yellow-500" size={20} /> Em Andamento
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {challenges.active.map(uc => (
                            <Card key={uc.id} className="p-6 relative overflow-hidden group border-2 border-emerald-500/20">
                                <div className="flex gap-4 relative z-10">
                                    <div className="p-4 bg-slate-100 dark:bg-slate-800 rounded-2xl h-fit">
                                        {getIcon(uc.Challenge.icon)}
                                    </div>
                                    <div className="flex-1 space-y-3">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <h4 className="font-black text-slate-900 dark:text-white">{uc.Challenge.title}</h4>
                                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{uc.Challenge.description}</p>
                                            </div>
                                            <div className="text-[10px] bg-emerald-500 text-white font-black px-2 py-1 rounded-full">
                                                +{uc.Challenge.points} PTS
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                                <span>Progresso</span>
                                                <span>{uc.Challenge.type === 'no_spending' ? 'Faltam ' + Math.ceil((new Date(uc.end_date) - new Date()) / (1000 * 60 * 60 * 24)) + ' dias' : `R$ ${parseFloat(uc.progress).toFixed(2)} / R$ ${parseFloat(uc.Challenge.target_amount).toFixed(2)}`}</span>
                                            </div>
                                            <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-emerald-500 transition-all duration-1000"
                                                    style={{ width: `${Math.min(100, (uc.progress / (uc.Challenge.target_amount || 1)) * 100)}%` }}
                                                />
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-1 text-[10px] text-slate-400 font-bold italic">
                                            <Clock size={12} /> Termina em {formatDisplayDate(uc.end_date)}
                                        </div>
                                    </div>
                                </div>
                            </Card>
                        ))}
                    </div>
                </section>
            )}

            {/* Available Challenges */}
            <section className="space-y-4">
                <h3 className="text-lg font-black text-slate-800 dark:text-white flex items-center gap-2">
                    <Target className="text-emerald-500" size={20} /> Novos Desafios
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {challenges.available.map(c => (
                        <Card key={c.id} className="p-6 flex flex-col justify-between hover:border-emerald-500/50 transition-all group">
                            <div className="space-y-4">
                                <div className="flex justify-between items-start">
                                    <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-2xl w-fit">
                                        {getIcon(c.icon)}
                                    </div>
                                    {c.is_custom && (
                                        <button
                                            onClick={(e) => { e.stopPropagation(); openEdit(c); }}
                                            className="p-2 text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-xl transition-all"
                                        >
                                            <Edit2 size={16} />
                                        </button>
                                    )}
                                </div>
                                <div className="mt-4">
                                    <h4 className="font-black text-slate-900 dark:text-white line-clamp-1">{c.title}</h4>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 line-clamp-2 leading-relaxed">
                                        {c.description}
                                    </p>
                                </div>
                            </div>

                            <div className="mt-6 pt-4 border-t border-slate-50 dark:border-slate-800 space-y-4">
                                <div className="flex justify-between items-center text-[10px] font-black">
                                    <span className="text-slate-400 uppercase tracking-widest">{c.duration_days} DIAS</span>
                                    <span className="text-emerald-500">+{c.points} PONTOS</span>
                                </div>
                                <button
                                    onClick={() => handleStart(c.id)}
                                    className="w-full py-2 bg-slate-900 dark:bg-emerald-500 text-white text-xs font-black rounded-xl hover:scale-[1.02] active:scale-[0.98] transition-all"
                                >
                                    Aceitar Desafio
                                </button>
                            </div>
                        </Card>
                    ))}
                </div>
            </section>

            {/* Completed */}
            {challenges.completed.length > 0 && (
                <section className="space-y-4">
                    <h3 className="text-lg font-black text-slate-800 dark:text-white flex items-center gap-2 opacity-50">
                        <CheckCircle2 className="text-slate-400" size={20} /> Concluídos
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 opacity-60">
                        {challenges.completed.map(uc => (
                            <div key={uc.id} className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-4 rounded-2xl flex flex-col items-center text-center">
                                <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-full mb-3 shadow-inner">
                                    <CheckCircle2 className="text-emerald-500" size={20} />
                                </div>
                                <h4 className="text-xs font-black text-slate-900 dark:text-white">{uc.Challenge.title}</h4>
                                <span className="text-[10px] text-emerald-500 font-bold mt-1">+{uc.Challenge.points} PTS</span>
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {/* Create/Edit Modal */}
            <Modal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} title={editingChallenge ? 'Editar Desafio' : 'Novo Desafio'}>
                <form onSubmit={handleSaveChallenge} className="space-y-6">
                    <div className="space-y-4">
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 mb-2 uppercase tracking-widest">Título do Desafio</label>
                            <input
                                required
                                value={challengeFormData.title}
                                onChange={e => setChallengeFormData({ ...challengeFormData, title: e.target.value })}
                                placeholder="Ex: Mês sem Fast Food"
                                className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none focus:ring-2 focus:ring-emerald-500 font-bold"
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 mb-2 uppercase tracking-widest">Breve Descrição</label>
                            <textarea
                                required
                                value={challengeFormData.description}
                                onChange={e => setChallengeFormData({ ...challengeFormData, description: e.target.value })}
                                placeholder="O que o casal precisa fazer?"
                                className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none focus:ring-2 focus:ring-emerald-500 font-bold h-24 resize-none"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 mb-2 uppercase tracking-widest">Tipo</label>
                                <select
                                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none focus:ring-2 focus:ring-emerald-500 font-bold"
                                    value={challengeFormData.type}
                                    onChange={e => setChallengeFormData({ ...challengeFormData, type: e.target.value })}
                                >
                                    <option value="saving">Acumular (Guardar)</option>
                                    <option value="category_limit">Teto de Gasto (Limite)</option>
                                    <option value="no_spending">Sem Gastos (Zero)</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 mb-2 uppercase tracking-widest">Duração (Dias)</label>
                                <input
                                    type="number"
                                    value={challengeFormData.duration_days}
                                    onChange={e => setChallengeFormData({ ...challengeFormData, duration_days: e.target.value })}
                                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none focus:ring-2 focus:ring-emerald-500 font-bold"
                                />
                            </div>
                        </div>

                        <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
                            <label className="block text-[10px] font-black text-slate-400 mb-3 uppercase tracking-widest">Baseado em qual movimentação?</label>
                            <div className="grid grid-cols-3 gap-2">
                                {[
                                    { id: 'expense', label: 'Despesa', icon: '💸' },
                                    { id: 'income', label: 'Receita', icon: '💰' },
                                    { id: 'credit', label: 'Crédito', icon: '💳' }
                                ].map((t) => (
                                    <button
                                        key={t.id}
                                        type="button"
                                        onClick={() => setChallengeFormData({ ...challengeFormData, target_type: t.id })}
                                        className={`flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all ${challengeFormData.target_type === t.id
                                            ? 'border-emerald-500 bg-emerald-500/10 text-emerald-600'
                                            : 'border-transparent bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 opacity-60'
                                            }`}
                                    >
                                        <span className="text-lg">{t.icon}</span>
                                        <span className="text-[10px] font-black uppercase">{t.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {challengeFormData.type !== 'no_spending' && (
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 mb-2 uppercase tracking-widest">Valor Alvo (R$)</label>
                                    <input
                                        type="number"
                                        value={challengeFormData.target_amount}
                                        onChange={e => setChallengeFormData({ ...challengeFormData, target_amount: e.target.value })}
                                        placeholder="0.00"
                                        className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none focus:ring-2 focus:ring-emerald-500 font-bold"
                                    />
                                </div>
                                {challengeFormData.type === 'category_limit' && (
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-400 mb-2 uppercase tracking-widest">Categoria</label>
                                        <input
                                            value={challengeFormData.category}
                                            onChange={e => setChallengeFormData({ ...challengeFormData, category: e.target.value })}
                                            placeholder="Ex: Lazer"
                                            className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none focus:ring-2 focus:ring-emerald-500 font-bold"
                                        />
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 mb-2 uppercase tracking-widest">Pontos (XP)</label>
                                <input
                                    type="number"
                                    value={challengeFormData.points}
                                    onChange={e => setChallengeFormData({ ...challengeFormData, points: e.target.value })}
                                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none focus:ring-2 focus:ring-emerald-500 font-bold"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 mb-2 uppercase tracking-widest">Ícone</label>
                                <select
                                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none focus:ring-2 focus:ring-emerald-500 font-bold"
                                    value={challengeFormData.icon}
                                    onChange={e => setChallengeFormData({ ...challengeFormData, icon: e.target.value })}
                                >
                                    <option value="Trophy">🏆 Troféu</option>
                                    <option value="Zap">⚡ Energia</option>
                                    <option value="UtensilsCrossed">🍴 Alimentação</option>
                                    <option value="PiggyBank">🐷 Poupança</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <button className="w-full py-4 bg-emerald-500 text-white font-black rounded-2xl shadow-xl shadow-emerald-500/20 active:scale-95 transition-all">
                        {editingChallenge ? 'SALVAR ALTERAÇÕES' : 'CRIAR DESAFIO'}
                    </button>
                </form>
            </Modal>

            {/* Config Modal */}
            <Modal isOpen={isConfigModalOpen} onClose={() => setIsConfigModalOpen(false)} title="Configurações de Alertas">
                <form onSubmit={handleSaveConfig} className="space-y-6">
                    <div className="space-y-6">
                        <div className="bg-blue-50 dark:bg-blue-900/10 p-4 rounded-2xl border border-blue-100 dark:border-blue-800/20 flex gap-4">
                            <div className="p-3 bg-white dark:bg-slate-800 rounded-xl shadow-sm text-blue-500">
                                <Bell size={24} />
                            </div>
                            <div>
                                <h4 className="text-sm font-black text-blue-900 dark:text-blue-100 uppercase tracking-wider">Alertas de Gastos</h4>
                                <p className="text-[10px] text-blue-600/70 font-bold leading-tight mt-1">Defina quando o casal deve ser notificado imediatamente sobre um gasto atípico.</p>
                            </div>
                        </div>

                        <div>
                            <label className="block text-[10px] font-black text-slate-400 mb-2 uppercase tracking-widest">Limite para Notificação (R$)</label>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-slate-400 italic">R$</span>
                                <input
                                    type="number"
                                    value={config.large_transaction_limit}
                                    onChange={e => setConfig({ ...config, large_transaction_limit: e.target.value })}
                                    className="w-full pl-12 pr-4 py-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none focus:ring-2 focus:ring-emerald-500 font-black text-lg"
                                />
                            </div>
                        </div>

                        <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                            <h4 className="text-[10px] font-black text-slate-400 mb-4 uppercase tracking-widest">Relatório Semanal Duoo</h4>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-500 mb-2">Dia da Semana</label>
                                    <select
                                        className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none focus:ring-2 focus:ring-emerald-500 font-bold"
                                        value={config.weekly_report_day}
                                        onChange={e => setConfig({ ...config, weekly_report_day: parseInt(e.target.value) })}
                                    >
                                        <option value={0}>Domingo</option>
                                        <option value={1}>Segunda</option>
                                        <option value={5}>Sexta</option>
                                        <option value={6}>Sábado</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-500 mb-2">Horário</label>
                                    <input
                                        type="number"
                                        min="0"
                                        max="23"
                                        value={config.weekly_report_hour}
                                        onChange={e => setConfig({ ...config, weekly_report_hour: parseInt(e.target.value) })}
                                        className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none focus:ring-2 focus:ring-emerald-500 font-bold"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl">
                            <div className="flex items-center gap-3">
                                <Bell size={18} className={config.notifications_enabled ? "text-emerald-500" : "text-slate-400"} />
                                <span className="text-sm font-black text-slate-700 dark:text-slate-200">Notificações Push</span>
                            </div>
                            <button
                                type="button"
                                onClick={() => setConfig({ ...config, notifications_enabled: !config.notifications_enabled })}
                                className={`w-12 h-6 rounded-full transition-all relative ${config.notifications_enabled ? 'bg-emerald-500' : 'bg-slate-300'}`}
                            >
                                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${config.notifications_enabled ? 'right-1' : 'left-1'}`} />
                            </button>
                        </div>
                    </div>

                    <button className="w-full py-4 bg-slate-900 dark:bg-emerald-500 text-white font-black rounded-2xl shadow-xl active:scale-95 transition-all">
                        SALVAR CONFIGURAÇÕES
                    </button>
                </form>
            </Modal>

            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
        </div>
    );
};

export default Challenges;
