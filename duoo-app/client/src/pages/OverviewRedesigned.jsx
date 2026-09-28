import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useOutletContext } from 'react-router-dom';
import {
    AlertTriangle,
    ArrowDownCircle,
    ArrowDown,
    ArrowUpCircle,
    ArrowUp,
    ChevronRight,
    Coffee,
    CreditCard,
    Home,
    PlusCircle,
    ShoppingBag,
    Target,
    Wallet,
    X,
    Zap,
} from 'lucide-react';
import PageSkeleton from '../components/ui/PageSkeleton';
import Card from '../components/ui/Card';
import Modal from '../components/ui/Modal';
import PartnerSummaryCard from '../components/PartnerSummaryCard';
import ProgressBar from '../components/ui/ProgressBar';
import Toast from '../components/ui/Toast';
import api from '../services/api';
import { formatShortDisplayDate } from '../utils/dateUtils';
import { formatCurrencyInput, formatCurrencyValue, parseCurrencyInput } from '../utils/currency';

const formatCurrency = (value) => `R$ ${Number(value || 0).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
})}`;

const clampPercentage = (value) => Math.min(100, Math.max(0, Number(value || 0)));

const metricToneClasses = {
    rose: 'bg-rose-50 text-rose-600 dark:bg-rose-950/30 dark:text-rose-400',
    amber: 'bg-amber-50 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400',
    blue: 'bg-blue-50 text-blue-600 dark:bg-blue-950/30 dark:text-blue-400',
    emerald: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400',
};

const OverviewRedesigned = () => {
    const { viewMode } = useOutletContext();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState(null);
    const [goals, setGoals] = useState([]);
    const [showTipModal, setShowTipModal] = useState(false);
    const [showSavingsSuggestionModal, setShowSavingsSuggestionModal] = useState(false);
    const [selectedGoal, setSelectedGoal] = useState(null);
    const [allocationAmount, setAllocationAmount] = useState('');
    const [wallets, setWallets] = useState([]);
    const [selectedWallet, setSelectedWallet] = useState('');
    const [toast, setToast] = useState(null);
    const [healthScore, setHealthScore] = useState(null);
    const [showAlert, setShowAlert] = useState(true);

    const fetchWallets = useCallback(async () => {
        try {
            const response = await api.get('/wallets');
            setWallets(response.data);
            if (response.data.length > 0) setSelectedWallet(response.data[0].id);
        } catch (error) {
            console.error('Failed to fetch wallets:', error);
        }
    }, []);

    const fetchDashboardData = useCallback(async () => {
        setLoading(true);
        try {
            const [dashboardResponse, goalsResponse, healthResponse] = await Promise.all([
                api.get('/dashboard', { params: { viewMode } }),
                api.get('/goals', { params: { viewMode } }),
                api.get('/stats/health', { params: { viewMode } }),
            ]);
            setData(dashboardResponse.data);
            setGoals(goalsResponse.data);
            setHealthScore(healthResponse.data);
        } catch (error) {
            console.error('Failed to fetch dashboard data:', error);
        } finally {
            setLoading(false);
        }
    }, [viewMode]);

    useEffect(() => {
        fetchDashboardData();
        fetchWallets();
    }, [fetchDashboardData, fetchWallets]);

    useEffect(() => {
        const handleRefresh = () => {
            fetchDashboardData();
            fetchWallets();
        };
        window.addEventListener('refresh-data', handleRefresh);
        return () => window.removeEventListener('refresh-data', handleRefresh);
    }, [fetchDashboardData, fetchWallets]);

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

    const tip = useMemo(() => {
        if (!data || !goals.length || Number(data.saved) <= 0) return null;
        const goal = goals
            .filter((item) => Number(item.current_amount) < Number(item.target_amount))
            .sort((a, b) => (Number(a.current_amount) / Number(a.target_amount)) - (Number(b.current_amount) / Number(b.target_amount)))[0];
        return goal ? {
            amount: Number(data.saved),
            goal,
            message: `Vocês economizaram ${formatCurrency(data.saved)} este mês. Que tal destinar esse valor para a meta “${goal.title}”?`,
        } : null;
    }, [data, goals]);

    useEffect(() => {
        if (!tip) return;
        const dismissalKey = `duoo:savings-tip-dismissed:${tip.goal.id}:${new Date().toISOString().slice(0, 7)}`;
        if (sessionStorage.getItem(dismissalKey) !== 'true') setShowSavingsSuggestionModal(true);
    }, [tip]);

    const handleDismissSavingsSuggestion = () => {
        if (tip) {
            const dismissalKey = `duoo:savings-tip-dismissed:${tip.goal.id}:${new Date().toISOString().slice(0, 7)}`;
            sessionStorage.setItem(dismissalKey, 'true');
        }
        setShowSavingsSuggestionModal(false);
    };

    const handleOpenAllocation = () => {
        if (!tip) return;
        setSelectedGoal(tip.goal.id);
        setAllocationAmount(formatCurrencyValue(tip.amount));
        setShowSavingsSuggestionModal(false);
        setShowTipModal(true);
    };

    const handleAllocateToGoal = async () => {
        if (!selectedGoal || !allocationAmount || parseCurrencyInput(allocationAmount) <= 0) {
            setToast({ message: 'Selecione uma meta e informe um valor válido', type: 'error' });
            return;
        }
        try {
            await api.post(`/goals/${selectedGoal}/progress`, { amount: parseCurrencyInput(allocationAmount), wallet_id: selectedWallet });
            setToast({ message: 'Valor destinado com sucesso!', type: 'success' });
            setShowTipModal(false);
            setAllocationAmount('');
            fetchDashboardData();
        } catch (error) {
            console.error('Failed to allocate to goal:', error);
            setToast({ message: error.response?.data?.error || 'Erro ao destinar valor', type: 'error' });
        }
    };

    if (loading) return <PageSkeleton />;
    if (!data) return <div className="rounded-2xl bg-white p-6 text-sm text-slate-500">Erro ao carregar dados.</div>;

    const { balance, balanceVariation, spent, saved, invested, creditCard, nextInvoiceDay, expensesByCategory, transactions, daysSinceLastTransaction } = data;
    const metrics = [
        { label: 'Gasto do mês', value: spent, icon: ArrowDownCircle, tone: 'rose' },
        { label: 'Fatura atual', value: creditCard, icon: CreditCard, tone: 'amber', detail: nextInvoiceDay ? `Vence dia ${nextInvoiceDay}` : 'Sem vencimento' },
        { label: 'Economizado', value: saved, icon: ArrowUpCircle, tone: 'blue' },
        { label: 'Guardado em metas', value: invested, icon: Target, tone: 'emerald' },
    ];

    return (
        <div className="duoo-page-enter space-y-6 pb-4 md:space-y-8">
            {showAlert && daysSinceLastTransaction > 1 && <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-950 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-100">
                <AlertTriangle className="mt-0.5 shrink-0 text-amber-600" size={19} />
                <div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-3"><h4 className="text-sm font-semibold">A captura está há {daysSinceLastTransaction} dias sem novidades</h4><button onClick={() => setShowAlert(false)} className="text-amber-600" aria-label="Fechar aviso"><X size={16} /></button></div><p className="mt-1 text-xs leading-relaxed text-amber-800/80 dark:text-amber-200/80">Confirme se as notificações do banco continuam permitidas no celular.</p><button onClick={() => document.querySelector('.nav-add-btn')?.click()} className="mt-3 text-xs font-semibold text-amber-700 underline underline-offset-4 dark:text-amber-200">Adicionar transação manualmente</button></div>
            </div>}
            <Modal isOpen={showSavingsSuggestionModal && !!tip} onClose={handleDismissSavingsSuggestion} title="Uma ideia para o casal"><div className="space-y-5"><div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400"><Target size={26} /></div><div><p className="text-base leading-relaxed text-slate-600 dark:text-slate-300">{tip?.message}</p><p className="mt-2 text-sm text-slate-400">Uma pequena decisão hoje pode aproximar vocês dos seus planos.</p></div><div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"><button onClick={handleDismissSavingsSuggestion} className="rounded-xl px-4 py-3 text-sm font-semibold text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800">Talvez mais tarde</button><button onClick={handleOpenAllocation} className="rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-emerald-700">Destinar agora</button></div></div></Modal>

            <section className="overflow-hidden rounded-[28px] bg-emerald-600 p-6 text-white shadow-sm md:p-8"><div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-100">Saldo conjunto do casal</p><h1 className="mt-3 text-4xl font-semibold tracking-tight md:text-5xl">{formatCurrency(balance)}</h1><p className="mt-3 text-sm text-emerald-100">{viewMode === 'joint' ? 'Visão compartilhada' : 'Visão individual'} · atualizado hoje</p></div><div className="flex items-center gap-3 rounded-2xl bg-white/10 px-4 py-3 text-sm text-emerald-50">{balanceVariation >= 0 ? <ArrowUp size={17} /> : <ArrowDown size={17} />}<span><strong>{Math.abs(Number(balanceVariation || 0)).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%</strong> no mês</span></div></div></section>

            <section className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">{metrics.map((metric) => { const MetricIcon = metric.icon; return <article key={metric.label} className="rounded-2xl border border-slate-200/80 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 md:p-5"><div className={`mb-5 flex h-9 w-9 items-center justify-center rounded-xl ${metricToneClasses[metric.tone]}`}><MetricIcon size={18} /></div><p className="text-xs font-medium text-slate-500">{metric.label}</p><p className="mt-1 truncate text-lg font-semibold tracking-tight text-slate-950 dark:text-white md:text-xl">{formatCurrency(metric.value)}</p>{metric.detail && <p className="mt-1 text-[11px] text-slate-400">{metric.detail}</p>}</article>; })}</section>

            <section className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(320px,1fr)]"><Card className="rounded-3xl border-slate-200/80 shadow-none dark:border-slate-800"><div className="mb-6 flex items-start justify-between gap-4"><div><h2 className="text-lg font-semibold">Gastos do casal</h2><p className="mt-1 text-sm text-slate-500">Distribuição por categoria neste mês</p></div><Link to="/dashboard/forecast" className="text-sm font-medium text-emerald-600">Ver relatório</Link></div>{expensesByCategory?.length ? <div className="space-y-5">{expensesByCategory.slice(0, 5).map((item) => <div key={item.category}><div className="mb-2 flex items-center justify-between gap-3 text-sm"><div className="flex min-w-0 items-center gap-2"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">{getCategoryIcon(item.category)}</span><span className="truncate font-medium">{item.category}</span></div><span className="shrink-0 font-semibold">{formatCurrency(item.amount)}</span></div><div className="flex items-center gap-3"><ProgressBar progress={clampPercentage(item.percentage)} colorClass={item.color} height="h-2" /><span className="w-12 shrink-0 text-right text-xs text-slate-400">{Number(item.percentage || 0).toFixed(0)}%</span></div></div>)}</div> : <div className="rounded-2xl bg-slate-50 py-10 text-center text-sm text-slate-500 dark:bg-slate-800/50">Nenhuma despesa registrada neste mês.</div>}</Card><Card className="rounded-3xl border-slate-200/80 shadow-none dark:border-slate-800"><div className="mb-6 flex items-start justify-between gap-3"><div><h2 className="text-lg font-semibold">Próxima fatura</h2><p className="mt-1 text-sm text-slate-500">Cartões do casal</p></div><CreditCard className="text-amber-500" size={20} /></div><p className="text-3xl font-semibold tracking-tight">{formatCurrency(creditCard)}</p><p className="mt-2 text-sm text-slate-500">{nextInvoiceDay ? `Vencimento no dia ${nextInvoiceDay}` : 'Nenhum vencimento cadastrado'}</p><Link to="/dashboard/investments" className="mt-6 inline-flex items-center gap-1 text-sm font-medium text-emerald-600">Ver cartões <ChevronRight size={16} /></Link></Card></section>

            <section className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(320px,1fr)]"><Card className="rounded-3xl border-slate-200/80 shadow-none dark:border-slate-800"><div className="mb-4 flex items-center justify-between gap-3"><div><h2 className="text-lg font-semibold">Atividade do casal</h2><p className="mt-1 text-sm text-slate-500">Últimos lançamentos identificados</p></div><Link to="/dashboard/transactions" className="text-sm font-medium text-emerald-600">Ver todas</Link></div><div className="divide-y divide-slate-100 dark:divide-slate-800">{transactions?.length ? transactions.slice(0, 5).map(item => { const amount = Number(item.amount || 0); const owner = item.User?.name || item.user?.name || (amount > 0 ? 'Entrada' : 'Casal'); return <div key={item.id} className="flex items-center justify-between gap-4 py-4 first:pt-2"><div className="flex min-w-0 items-center gap-3"><span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${amount > 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'}`}>{amount > 0 ? <ArrowUpCircle size={18} /> : getCategoryIcon(item.category)}</span><div className="min-w-0"><p className="truncate text-sm font-semibold">{item.title}</p><p className="truncate text-xs text-slate-400">{owner} · {item.category} · {formatShortDisplayDate(item.date)}</p></div></div><span className={`shrink-0 text-sm font-semibold ${amount > 0 ? 'text-emerald-600' : 'text-slate-900 dark:text-white'}`}>{amount > 0 ? '+' : '−'} {formatCurrency(Math.abs(amount))}</span></div>; }) : <div className="rounded-2xl bg-slate-50 py-10 text-center text-sm text-slate-500 dark:bg-slate-800/50">Nenhuma transação recente.</div>}</div></Card><div className="space-y-6"><Card className="rounded-3xl border-slate-200/80 shadow-none dark:border-slate-800"><div className="mb-5 flex items-center justify-between gap-3"><div><h2 className="text-lg font-semibold">Metas do casal</h2><p className="mt-1 text-sm text-slate-500">Planos compartilhados</p></div><button onClick={() => navigate('/dashboard/goals')} className="text-emerald-600" aria-label="Adicionar meta"><PlusCircle size={20} /></button></div>{goals.length ? <div className="space-y-5">{goals.slice(0, 3).map(goal => { const progress = clampPercentage((Number(goal.current_amount) / Number(goal.target_amount || 1)) * 100); return <div key={goal.id}><div className="mb-2 flex justify-between gap-3 text-sm"><span className="truncate font-medium">{goal.title}</span><span className="text-slate-500">{progress.toFixed(0)}%</span></div><ProgressBar progress={progress} colorClass="bg-emerald-500" height="h-2" /><div className="mt-2 flex justify-between text-xs text-slate-500"><span>{formatCurrency(goal.current_amount)}</span><span>{formatCurrency(goal.target_amount)}</span></div></div>; })}</div> : <div className="rounded-2xl bg-slate-50 py-8 text-center text-sm text-slate-500 dark:bg-slate-800/50">Nenhuma meta cadastrada.</div>}</Card>{healthScore && <Card className="rounded-3xl border-slate-200/80 shadow-none dark:border-slate-800"><div className="flex items-center justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Saúde financeira</p><p className="mt-1 text-2xl font-semibold">{healthScore.score}<span className="ml-1 text-sm font-normal text-slate-400">/100</span></p><p className="mt-1 text-sm text-slate-500">{healthScore.level}</p></div><div className="flex h-14 w-14 items-center justify-center rounded-full border-4 border-emerald-100 text-sm font-semibold text-emerald-600">{healthScore.score}</div></div></Card>}<PartnerSummaryCard /></div></section>


            <Modal isOpen={showTipModal} onClose={() => setShowTipModal(false)} title="Destinar economia para meta"><div className="space-y-4"><div><label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">Selecione a meta</label><select value={selectedGoal || ''} onChange={event => setSelectedGoal(event.target.value)} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-800"><option value="">Escolha uma meta</option>{goals.map(goal => <option key={goal.id} value={goal.id}>{goal.title}</option>)}</select></div><div><label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">Valor a destinar (R$)</label><input type="text" inputMode="decimal" value={allocationAmount} onChange={event => setAllocationAmount(formatCurrencyInput(event.target.value))} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-800" placeholder="0,00" /></div><div><label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">Carteira de origem</label><select value={selectedWallet || ''} onChange={event => setSelectedWallet(event.target.value)} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-800"><option value="">Não debitar de nenhuma carteira</option>{wallets.map(wallet => <option key={wallet.id} value={wallet.id}>{wallet.name}</option>)}</select></div><button onClick={handleAllocateToGoal} className="w-full rounded-xl bg-emerald-500 py-3 font-bold text-white hover:bg-emerald-600">Confirmar destinação</button></div></Modal>
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
        </div>
    );
};

export default OverviewRedesigned;
