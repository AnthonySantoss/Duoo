import React, { useEffect, useState, useMemo } from 'react';
import { useOutletContext, useNavigate, Link } from 'react-router-dom';
import { Wallet, ArrowDownCircle, CreditCard, ArrowUpCircle, TrendingUp, ChevronRight, PlusCircle, ShoppingBag, Home, Coffee, Zap, AlertTriangle, FileText, Target, Calculator, Menu as MenuIcon, ArrowUp, ArrowDown } from 'lucide-react';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import ProgressBar from '../components/ui/ProgressBar';
import Modal from '../components/ui/Modal';
import api from '../services/api';
import Toast from '../components/ui/Toast';

const Overview = () => {
    const { viewMode } = useOutletContext();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState(null);
    const [goals, setGoals] = useState([]);
    const [showTipModal, setShowTipModal] = useState(false);
    const [selectedGoal, setSelectedGoal] = useState(null);
    const [allocationAmount, setAllocationAmount] = useState('');
    const [wallets, setWallets] = useState([]);
    const [selectedWallet, setSelectedWallet] = useState('');
    const [toast, setToast] = useState(null);

    useEffect(() => {
        const fetchDashboardData = async () => {
            setLoading(true);
            try {
                const response = await api.get(`/dashboard`, {
                    params: { viewMode }
                });
                setData(response.data);

                // Fetch goals
                const goalsResponse = await api.get('/goals', {
                    params: { viewMode }
                });
                setGoals(goalsResponse.data);
            } catch (error) {
                console.error("Failed to fetch dashboard data:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchDashboardData();
        fetchWallets();
    }, [viewMode]);

    const fetchWallets = async () => {
        try {
            const res = await api.get('/wallets');
            setWallets(res.data);
            if (res.data.length > 0) {
                setSelectedWallet(res.data[0].id);
            }
        } catch (error) {
            console.error('Failed to fetch wallets:', error);
        }
    };

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

    const handleAllocateToGoal = async () => {
        if (!selectedGoal || !allocationAmount || parseFloat(allocationAmount) <= 0) {
            setToast({ message: 'Selecione uma meta e informe um valor válido', type: 'error' });
            return;
        }

        try {
            await api.post(`/goals/${selectedGoal}/progress`, {
                amount: parseFloat(allocationAmount),
                wallet_id: selectedWallet
            });

            setToast({ message: 'Valor destinado com sucesso!', type: 'success' });
            setShowTipModal(false);
            setAllocationAmount('');

            // Refresh data
            const response = await api.get(`/dashboard`, {
                params: { viewMode }
            });
            setData(response.data);

            const goalsResponse = await api.get('/goals', {
                params: { viewMode }
            });
            setGoals(goalsResponse.data);
        } catch (error) {
            console.error('Failed to allocate to goal:', error);
            setToast({ message: error.response?.data?.error || 'Erro ao destinar valor', type: 'error' });
        }
    };

    // Calculate tip
    const tip = useMemo(() => {
        if (!data) return null;

        const { saved } = data;
        const savingsAmount = parseFloat(saved);

        if (savingsAmount > 0 && goals.length > 0) {
            // Find goal with lowest progress percentage
            const goalWithLowestProgress = goals
                .filter(g => parseFloat(g.current_amount) < parseFloat(g.target_amount))
                .sort((a, b) => {
                    const progressA = (parseFloat(a.current_amount) / parseFloat(a.target_amount)) * 100;
                    const progressB = (parseFloat(b.current_amount) / parseFloat(b.target_amount)) * 100;
                    return progressA - progressB;
                })[0];

            if (goalWithLowestProgress) {
                return {
                    amount: savingsAmount,
                    goal: goalWithLowestProgress,
                    message: `Você economizou R$ ${savingsAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} este mês! Que tal destinar para a meta "${goalWithLowestProgress.title}"?`
                };
            }
        }

        return null;
    }, [data, goals]);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
            </div>
        );
    }

    if (!data) return <div>Erro ao carregar dados.</div>;

    const { balance, balanceVariation, spent, saved, invested, creditCard, nextInvoiceDay, expensesByCategory, transactions } = data;

    return (

        <div className="space-y-6 md:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">

            {/* --- MOBILE VIEW --- */}
            <div className="md:hidden space-y-6">
                {/* Horizontal Scroll Cards */}
                <div className="horizontal-cards scrollbar-hide">
                    {/* Saldo Disponível */}
                    <div className="balance-card snap-center">
                        <div className="balance-card-blob"></div>
                        <div className="balance-card-header">
                            <div className="balance-card-icon"><Wallet size={20} /></div>
                            <span className="balance-card-badge flex items-center gap-1">
                                {balanceVariation >= 0 ? <ArrowUp size={12} strokeWidth={3} /> : <ArrowDown size={12} strokeWidth={3} />}
                                {balanceVariation ? Math.abs(balanceVariation).toFixed(1) : '0.0'}%
                            </span>
                        </div>
                        <div className="balance-card-info">
                            <p className="balance-card-label">Saldo Disponível</p>
                            <h3 className="balance-card-amount">R$ {parseFloat(balance).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h3>
                        </div>
                    </div>

                    {/* Gastos Mês */}
                    <div className="stat-card snap-center">
                        <div className="stat-card-icon expense"><ArrowDownCircle size={20} /></div>
                        <div className="mt-auto">
                            <p className="stat-card-label">Gastos Mês</p>
                            <h3 className="stat-card-value">R$ {parseFloat(spent).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3>
                        </div>
                    </div>

                    {/* Fatura Atual */}
                    <div className="stat-card snap-center">
                        <div className="stat-card-icon credit"><CreditCard size={20} /></div>
                        <div className="mt-auto">
                            <p className="stat-card-label">Fatura Atual</p>
                            <h3 className="stat-card-value">R$ {parseFloat(creditCard).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3>
                        </div>
                    </div>

                    {/* Economizado */}
                    <div className="stat-card snap-center">
                        <div className="stat-card-icon" style={{ backgroundColor: '#dbeafe', color: '#2563eb' }}><ArrowUpCircle size={20} /></div>
                        <div className="mt-auto">
                            <p className="stat-card-label">Economizado</p>
                            <h3 className="stat-card-value">R$ {parseFloat(saved).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3>
                        </div>
                    </div>

                    {/* Total Guardado/Investido */}
                    <div className="stat-card snap-center">
                        <div className="stat-card-icon" style={{ backgroundColor: '#e0e7ff', color: '#4f46e5' }}><TrendingUp size={20} /></div>
                        <div className="mt-auto">
                            <p className="stat-card-label">Total Guardado</p>
                            <h3 className="stat-card-value">R$ {parseFloat(invested).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3>
                        </div>
                    </div>

                </div>



                {/* Categories Mobile */}
                <div className="space-y-4">
                    <div className="section-header">
                        <h3 className="section-title">Gastos por Categoria</h3>
                        <Link to="/dashboard/transactions" className="section-link">Ver todos</Link>
                    </div>
                    <div className="category-list">
                        {expensesByCategory && expensesByCategory.slice(0, 4).map((item, idx) => (
                            <div key={item.category} className="category-item">
                                <div className={`category-icon ${item.color.replace('bg-', 'bg-opacity-10 text-')}`}>
                                    {getCategoryIcon(item.category)}
                                </div>
                                <div className="category-info">
                                    <div className="category-header">
                                        <span className="category-name">{item.category}</span>
                                        <span className="category-amount">R$ {parseFloat(item.amount).toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</span>
                                    </div>
                                    <div className="progress-bar-container h-1.5">
                                        <div className={`progress-bar-fill ${item.color}`} style={{ width: `${item.percentage}%` }}></div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Recent Transactions Mobile */}
                <div className="space-y-4 pb-4">
                    <h3 className="section-title">Transações Recentes</h3>
                    <div className="transaction-list">
                        {transactions && transactions.length > 0 ? transactions.slice(0, 4).map(item => (
                            <div key={item.id} className="transaction-item">
                                <div className="transaction-left">
                                    <div className={`transaction-icon ${parseFloat(item.amount) > 0 ? 'income' : 'expense'}`}>
                                        {getCategoryIcon(item.category)}
                                    </div>
                                    <div>
                                        <p className="transaction-title">{item.title}</p>
                                        <p className="transaction-date">{new Date(item.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}</p>
                                    </div>
                                </div>
                                <span className={`transaction-amount ${parseFloat(item.amount) > 0 ? 'income' : 'expense'}`}>
                                    {parseFloat(item.amount) > 0 ? '+' : ''} R$ {Math.abs(parseFloat(item.amount)).toFixed(2)}
                                </span>
                            </div>
                        )) : (
                            <p className="text-center text-slate-500 text-sm py-4">Nenhuma transação recente</p>
                        )}
                    </div>
                </div>
            </div>

            {/* --- DESKTOP VIEW --- */}
            <div className="hidden md:block space-y-8">
                {/* Stats Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
                    <Card>
                        <div className="flex justify-between items-start mb-4">
                            <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg"><Wallet size={20} /></div>
                            <Badge variant={balanceVariation >= 0 ? "success" : "danger"}>
                                {balanceVariation > 0 ? '+' : ''}{balanceVariation ? balanceVariation.toFixed(1) : '0.0'}%
                            </Badge>
                        </div>
                        <p className="text-slate-500 text-sm">Saldo Disponível</p>
                        <h3 className="text-2xl font-bold">R$ {parseFloat(balance).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h3>
                    </Card>

                    <Card>
                        <div className="flex justify-between items-start mb-4">
                            <div className="p-2 bg-rose-100 text-rose-600 rounded-lg"><ArrowDownCircle size={20} /></div>
                        </div>
                        <p className="text-slate-500 text-sm">Gastos no Mês</p>
                        <h3 className="text-2xl font-bold">R$ {parseFloat(spent).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h3>
                    </Card>

                    <Card>
                        <div className="flex justify-between items-start mb-4">
                            <div className="p-2 bg-orange-100 text-orange-600 rounded-lg"><CreditCard size={20} /></div>
                            {nextInvoiceDay && (
                                <Badge variant="warning">Vence dia {nextInvoiceDay}</Badge>
                            )}
                        </div>
                        <p className="text-slate-500 text-sm">Fatura Cartão</p>
                        <h3 className="text-2xl font-bold">R$ {parseFloat(creditCard).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h3>
                    </Card>

                    <Card>
                        <div className="flex justify-between items-start mb-4">
                            <div className="p-2 bg-blue-100 text-blue-600 rounded-lg"><ArrowUpCircle size={20} /></div>
                        </div>
                        <p className="text-slate-500 text-sm">Economizado</p>
                        <h3 className="text-2xl font-bold">R$ {parseFloat(saved).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h3>
                    </Card>

                    <Card>
                        <div className="flex justify-between items-start mb-4">
                            <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg"><TrendingUp size={20} /></div>
                        </div>
                        <p className="text-slate-500 text-sm">Total Guardado</p>
                        <h3 className="text-2xl font-bold">R$ {parseFloat(invested).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h3>
                    </Card>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left Column (Transactions & Charts) */}
                    <div className="lg:col-span-2 space-y-8">
                        {/* Expense Chart Card */}
                        <Card>
                            <div className="flex items-center justify-between mb-6">
                                <h4 className="font-bold text-lg">Despesas por Categoria</h4>
                                <div className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded-md">Este Mês</div>
                            </div>

                            {expensesByCategory && expensesByCategory.length > 0 ? (
                                <div className="space-y-5">
                                    {expensesByCategory.map((item, idx) => (
                                        <div key={item.category}>
                                            <div className="flex justify-between items-center text-sm mb-2">
                                                <div className="flex items-center gap-2">
                                                    <div className={`p-1.5 rounded-md ${item.color.replace('bg-', 'bg-opacity-20 text-')}`}>
                                                        {getCategoryIcon(item.category)}
                                                    </div>
                                                    <span className="font-medium text-slate-700 dark:text-slate-300">{item.category}</span>
                                                </div>
                                                <div className="text-right">
                                                    <span className="font-bold block">R$ {parseFloat(item.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <ProgressBar progress={item.percentage} colorClass={item.color} height="h-2" />
                                                <span className="text-xs text-slate-500 w-12 text-right">{item.percentage.toFixed(1)}%</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="py-8 text-center text-slate-500 text-sm">
                                    Nenhuma despesa registrada para este filtro.
                                </div>
                            )}
                        </Card>

                        {/* Recent Transactions */}
                        <Card>
                            <div className="flex items-center justify-between mb-6">
                                <h4 className="font-bold text-lg">Transações Recentes</h4>
                                <button
                                    onClick={() => navigate('/dashboard/transactions')}
                                    className="text-emerald-500 text-sm font-medium flex items-center gap-1 hover:text-emerald-600 transition-colors"
                                >
                                    Ver tudo <ChevronRight size={16} />
                                </button>
                            </div>
                            <div className="space-y-4">
                                {transactions && transactions.length > 0 ? transactions.map(item => (
                                    <div key={item.id} className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors group">
                                        <div className="flex items-center gap-4">
                                            <div className={`p-2 rounded-full ${parseFloat(item.amount) > 0 ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-600'}`}>
                                                {parseFloat(item.amount) > 0 ? <PlusCircle size={20} /> : <ArrowDownCircle size={20} />}
                                            </div>
                                            <div>
                                                <p className="font-semibold text-sm">{item.title}</p>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs text-slate-400">{item.category}</span>
                                                    <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                                                    <span className="text-xs text-slate-400">{new Date(item.date).toLocaleDateString('pt-BR')}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <span className={`font-bold ${parseFloat(item.amount) > 0 ? 'text-emerald-600' : 'text-slate-900 dark:text-white'}`}>
                                            {parseFloat(item.amount) > 0 ? '+' : ''}R$ {Math.abs(parseFloat(item.amount)).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </span>
                                    </div>
                                )) : (
                                    <div className="py-8 text-center text-slate-500 text-sm">
                                        Nenhuma transação recente
                                    </div>
                                )}
                            </div>
                        </Card>
                    </div>

                    {/* Right Column (Goals & Tips) */}
                    <div className="space-y-8">
                        <Card>
                            <div className="flex items-center justify-between mb-6">
                                <h4 className="font-bold text-lg">Metas de Poupança</h4>
                                <button
                                    onClick={() => navigate('/dashboard/goals')}
                                    className="p-1 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors"
                                >
                                    <PlusCircle size={18} />
                                </button>
                            </div>
                            <div className="space-y-4">
                                {goals.length > 0 ? (
                                    goals.slice(0, 3).map(goal => {
                                        const progress = (parseFloat(goal.current_amount) / parseFloat(goal.target_amount)) * 100;
                                        return (
                                            <div key={goal.id} className="space-y-2">
                                                <div className="flex justify-between text-sm">
                                                    <span className="font-medium">{goal.title}</span>
                                                    <span className="text-slate-500">{progress.toFixed(0)}%</span>
                                                </div>
                                                <ProgressBar progress={progress} colorClass="bg-emerald-500" />
                                                <div className="flex justify-between text-xs text-slate-500">
                                                    <span>R$ {parseFloat(goal.current_amount).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                                    <span>R$ {parseFloat(goal.target_amount).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                                </div>
                                            </div>
                                        );
                                    })
                                ) : (
                                    <div className="text-xs text-slate-500 text-center py-4">
                                        Nenhuma meta cadastrada
                                    </div>
                                )}
                                {goals.length > 3 && (
                                    <button
                                        onClick={() => navigate('/dashboard/goals')}
                                        className="text-emerald-500 text-xs font-medium w-full text-center pt-2"
                                    >
                                        Ver todas as metas
                                    </button>
                                )}
                            </div>
                        </Card>

                        {tip && (
                            <Card className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white border-none shadow-emerald-200">
                                <h4 className="font-bold mb-2">Dica de Casal 💡</h4>
                                <p className="text-emerald-50 text-sm leading-relaxed">
                                    {tip.message}
                                </p>
                                <button
                                    onClick={() => {
                                        setSelectedGoal(tip.goal.id);
                                        setAllocationAmount(tip.amount.toString());
                                        setShowTipModal(true);
                                    }}
                                    className="mt-4 bg-white/20 hover:bg-white/30 transition-colors px-4 py-2 rounded-lg text-sm font-semibold w-full"
                                >
                                    Destinar agora
                                </button>
                            </Card>
                        )}
                    </div>
                </div>
            </div>

            {/* Allocation Modal */}
            <Modal isOpen={showTipModal} onClose={() => setShowTipModal(false)} title="Destinar Economia para Meta">
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Selecione a Meta</label>
                        <select
                            value={selectedGoal || ''}
                            onChange={e => setSelectedGoal(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        >
                            <option value="">Escolha uma meta</option>
                            {goals.map(goal => (
                                <option key={goal.id} value={goal.id}>{goal.title}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Valor a Destinar (R$)</label>
                        <input
                            type="number"
                            step="0.01"
                            value={allocationAmount}
                            onChange={e => setAllocationAmount(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            placeholder="0.00"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Carteira de Origem</label>
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
                    </div>

                    <button
                        onClick={handleAllocateToGoal}
                        className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3 rounded-xl transition-colors shadow-lg shadow-emerald-500/30"
                    >
                        Confirmar Destinação
                    </button>
                </div>
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

export default Overview;
