import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { AlertTriangle, Calendar, ChevronLeft, ChevronRight, Coffee, Filter, Home, Plus, Search, ShoppingBag, Tag, Trash2, Wallet, X, Zap } from 'lucide-react';
import Card from '../components/ui/Card';
import ConfirmModal from '../components/ui/ConfirmModal';
import Modal from '../components/ui/Modal';
import Toast from '../components/ui/Toast';
import PageSkeleton from '../components/ui/PageSkeleton';
import TransactionModal from '../components/ui/TransactionModalRedesigned';
import api from '../services/api';
import { formatDisplayDate } from '../utils/dateUtils';

const formatCurrency = (value) => `R$ ${Number(value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const categories = ['Alimentação', 'Lazer', 'Moradia', 'Contas', 'Saúde', 'Transporte', 'Educação', 'Salário', 'Freelance', 'Investimentos', 'Presente', 'Venda', 'Reembolso', 'Outros'];

const categoryIcon = (category) => {
    switch (category) {
        case 'Alimentação': return <ShoppingBag size={18} />;
        case 'Moradia': return <Home size={18} />;
        case 'Lazer': return <Coffee size={18} />;
        case 'Contas': return <Zap size={18} />;
        case 'Saúde': return <AlertTriangle size={18} />;
        case 'Transporte': return <Wallet size={18} />;
        default: return <Wallet size={18} />;
    }
};

const TransactionsRedesigned = () => {
    const { viewMode } = useOutletContext();
    const [searchTerm, setSearchTerm] = useState('');
    const [showFilters, setShowFilters] = useState(false);
    const [transactions, setTransactions] = useState([]);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [loading, setLoading] = useState(true);
    const [hasLoaded, setHasLoaded] = useState(false);
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [modalState, setModalState] = useState({ open: false, transaction: null });
    const [toast, setToast] = useState(null);
    const [categoryState, setCategoryState] = useState({ open: false, transaction: null });
    const [deleteState, setDeleteState] = useState({ open: false, id: null });
    const [filters, setFilters] = useState({ year: 'all', category: 'all', type: 'all', minAmount: '', maxAmount: '', startDate: '', endDate: '' });

    const fetchTransactions = useCallback(async () => {
        setLoading(true);
        try {
            const response = await api.get('/transactions', { params: { viewMode, page, limit: 10, search: debouncedSearch, ...filters } });
            setTransactions(response.data.transactions || response.data);
            setTotalPages(response.data.totalPages || 1);
        } catch (error) {
            console.error('Failed to fetch transactions:', error);
            setToast({ message: 'Erro ao carregar transações.', type: 'error' });
        } finally {
            setLoading(false);
            setHasLoaded(true);
        }
    }, [debouncedSearch, filters, page, viewMode]);

    useEffect(() => {
        const timer = setTimeout(() => setDebouncedSearch(searchTerm), 300);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    useEffect(() => {
        const timer = setTimeout(fetchTransactions, 300);
        return () => clearTimeout(timer);
    }, [fetchTransactions]);

    useEffect(() => setPage(1), [filters, searchTerm, viewMode]);

    const hasActiveFilters = filters.year !== 'all' || filters.category !== 'all' || filters.type !== 'all' || filters.minAmount || filters.maxAmount || filters.startDate || filters.endDate || searchTerm;
    const availableYears = useMemo(() => Array.from({ length: 5 }, (_, index) => new Date().getFullYear() - index), []);
    const totals = useMemo(() => transactions.reduce((result, item) => { const value = Number(item.amount || 0); if (value >= 0) result.income += value; else result.expense += Math.abs(value); return result; }, { income: 0, expense: 0 }), [transactions]);

    const clearFilters = () => {
        setFilters({ year: 'all', category: 'all', type: 'all', minAmount: '', maxAmount: '', startDate: '', endDate: '' });
        setSearchTerm('');
        setPage(1);
    };

    const handleDelete = async () => {
        try {
            await api.delete(`/transactions/${deleteState.id}`);
            setDeleteState({ open: false, id: null });
            setToast({ message: 'Transação excluída com sucesso.', type: 'success' });
            fetchTransactions();
        } catch (error) {
            setToast({ message: error.response?.data?.error || 'Erro ao excluir transação.', type: 'error' });
        }
    };

    const handleCorrectCategory = async (category) => {
        try {
            await api.put(`/category/transactions/${categoryState.transaction.id}/correct-category`, { category });
            setCategoryState({ open: false, transaction: null });
            setToast({ message: `Categoria corrigida para “${category}”.`, type: 'success' });
            fetchTransactions();
        } catch (error) {
            setToast({ message: error.response?.data?.error || 'Erro ao corrigir categoria.', type: 'error' });
        }
    };

    if (loading && !hasLoaded) return <PageSkeleton />;

    return <div className="duoo-page-enter space-y-6">
        <section className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-600">Visão do casal</p><h1 className="mt-2 text-3xl font-semibold tracking-tight">Transações</h1><p className="mt-2 text-sm text-slate-500">Acompanhe quem gastou, em qual cartão e com que categoria.</p></div><button onClick={() => setModalState({ open: true, transaction: null })} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700"><Plus size={18} /> Nova transação</button></section>

        <section className="grid grid-cols-2 gap-3 md:grid-cols-3"><div className="rounded-2xl border border-slate-200/80 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"><p className="text-xs text-slate-500">Transações</p><p className="mt-1 text-2xl font-semibold">{transactions.length}</p></div><div className="rounded-2xl border border-slate-200/80 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"><p className="text-xs text-slate-500">Receitas</p><p className="mt-1 text-2xl font-semibold text-emerald-600">{formatCurrency(totals.income)}</p></div><div className="col-span-2 rounded-2xl border border-slate-200/80 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 md:col-span-1"><p className="text-xs text-slate-500">Despesas</p><p className="mt-1 text-2xl font-semibold">{formatCurrency(totals.expense)}</p></div></section>

        <section className="rounded-3xl border border-slate-200/80 bg-white p-3 dark:border-slate-800 dark:bg-slate-900 md:p-4"><div className="flex flex-col gap-3 md:flex-row"><label className="relative flex-1"><Search className="absolute left-3 top-3.5 text-slate-400" size={18} /><input value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="Buscar estabelecimento, categoria ou pessoa" className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 dark:border-slate-800 dark:bg-slate-950" /></label><button onClick={() => setShowFilters((current) => !current)} className={`relative inline-flex items-center justify-center gap-2 rounded-2xl border px-5 py-3 text-sm font-medium ${showFilters ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-200 text-slate-600 dark:border-slate-800 dark:text-slate-300'}`}><Filter size={17} /> Filtros{hasActiveFilters && <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-600 text-[10px] text-white">!</span>}</button></div>
            {showFilters && <div className="mt-4 grid grid-cols-1 gap-3 border-t border-slate-100 pt-4 dark:border-slate-800 sm:grid-cols-2 lg:grid-cols-4"><label className="text-xs font-medium text-slate-500">Ano<select value={filters.year} onChange={(event) => setFilters({ ...filters, year: event.target.value })} className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm dark:border-slate-800 dark:bg-slate-950"><option value="all">Todos os anos</option>{availableYears.map(year => <option key={year} value={year}>{year}</option>)}</select></label><label className="text-xs font-medium text-slate-500">Categoria<select value={filters.category} onChange={(event) => setFilters({ ...filters, category: event.target.value })} className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm dark:border-slate-800 dark:bg-slate-950"><option value="all">Todas</option>{categories.map(category => <option key={category}>{category}</option>)}</select></label><label className="text-xs font-medium text-slate-500">Tipo<select value={filters.type} onChange={(event) => setFilters({ ...filters, type: event.target.value })} className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm dark:border-slate-800 dark:bg-slate-950"><option value="all">Todos</option><option value="income">Receitas</option><option value="expense">Despesas</option></select></label><label className="text-xs font-medium text-slate-500">Data inicial<input type="date" value={filters.startDate} onChange={(event) => setFilters({ ...filters, startDate: event.target.value })} className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm dark:border-slate-800 dark:bg-slate-950" /></label><label className="text-xs font-medium text-slate-500">Data final<input type="date" value={filters.endDate} onChange={(event) => setFilters({ ...filters, endDate: event.target.value })} className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm dark:border-slate-800 dark:bg-slate-950" /></label><label className="text-xs font-medium text-slate-500">Valor mínimo<input type="number" step="0.01" value={filters.minAmount} onChange={(event) => setFilters({ ...filters, minAmount: event.target.value })} className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm dark:border-slate-800 dark:bg-slate-950" /></label><label className="text-xs font-medium text-slate-500">Valor máximo<input type="number" step="0.01" value={filters.maxAmount} onChange={(event) => setFilters({ ...filters, maxAmount: event.target.value })} className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm dark:border-slate-800 dark:bg-slate-950" /></label><div className="flex items-end"><button onClick={clearFilters} className="inline-flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"><X size={15} /> Limpar filtros</button></div></div>}
        </section>

        <section className="space-y-3">{transactions.length ? transactions.map(item => { const amount = Number(item.amount || 0); const owner = item.User?.name || item.user?.name || (amount > 0 ? 'Entrada' : 'Casal'); return <article key={item.id} className="flex flex-col gap-4 rounded-3xl border border-slate-200/80 bg-white p-4 transition hover:border-emerald-200 dark:border-slate-800 dark:bg-slate-900 md:flex-row md:items-center md:justify-between md:p-5"><div className="flex min-w-0 items-center gap-3"><span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-lg ${amount > 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'}`}>{categoryIcon(item.category)}</span><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h2 className="truncate text-sm font-semibold">{item.title}</h2>{item.isCreditCard && <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700">Cartão</span>}</div><p className="mt-1 truncate text-xs text-slate-500">{owner} · {item.category} · {formatDisplayDate(item.date)}{item.Wallet?.name ? ` · ${item.Wallet.name}` : ''}</p></div></div><div className="flex items-center justify-between gap-4 md:justify-end"><span className={`text-base font-semibold ${amount > 0 ? 'text-emerald-600' : ''}`}>{amount > 0 ? '+' : '−'} {formatCurrency(Math.abs(amount))}</span><div className="flex items-center gap-1"><button onClick={() => setCategoryState({ open: true, transaction: item })} className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-emerald-600" title="Corrigir categoria"><Tag size={17} /></button><button onClick={() => setModalState({ open: true, transaction: item })} className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-blue-600" title="Editar transação"><Calendar size={17} /></button><button onClick={() => setDeleteState({ open: true, id: item.id })} className="rounded-xl p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600" title="Excluir transação"><Trash2 size={17} /></button></div></div></article> }) : <Card className="rounded-3xl border-dashed py-16 text-center shadow-none"><div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">↕</div><h2 className="mt-4 text-lg font-semibold">Nenhuma transação encontrada</h2><p className="mx-auto mt-2 max-w-sm text-sm text-slate-500">Ajuste os filtros ou adicione o primeiro lançamento do casal.</p><button onClick={() => setModalState({ open: true, transaction: null })} className="mt-5 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white">Adicionar transação</button></Card>}</section>

        {totalPages > 1 && <div className="flex items-center justify-center gap-4"><button onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={page === 1} className="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-2 text-sm disabled:opacity-40 dark:border-slate-800"><ChevronLeft size={16} /> Anterior</button><span className="text-sm text-slate-500">Página {page} de {totalPages}</span><button onClick={() => setPage((current) => Math.min(totalPages, current + 1))} disabled={page === totalPages} className="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-2 text-sm disabled:opacity-40 dark:border-slate-800">Próxima <ChevronRight size={16} /></button></div>}

        <TransactionModal isOpen={modalState.open} transaction={modalState.transaction} onClose={() => setModalState({ open: false, transaction: null })} onSuccess={fetchTransactions} />
        <Modal isOpen={categoryState.open} onClose={() => setCategoryState({ open: false, transaction: null })} title="Corrigir categoria">{categoryState.transaction && <div className="space-y-4"><div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-800"><p className="text-sm font-semibold">{categoryState.transaction.title}</p><p className="mt-1 text-xs text-slate-500">Categoria atual: {categoryState.transaction.category}</p></div><div className="grid grid-cols-2 gap-2">{categories.slice(0, 8).map(category => <button key={category} disabled={category === categoryState.transaction.category} onClick={() => handleCorrectCategory(category)} className="rounded-xl border border-slate-200 px-3 py-2.5 text-left text-sm transition hover:border-emerald-300 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700">{category}</button>)}</div></div>}</Modal>
        <ConfirmModal isOpen={deleteState.open} onClose={() => setDeleteState({ open: false, id: null })} onConfirm={handleDelete} title="Excluir transação" message="Tem certeza que deseja excluir esta transação? Esta ação não pode ser desfeita." type="danger" confirmText="Excluir" cancelText="Cancelar" />
        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>;
};

export default TransactionsRedesigned;
