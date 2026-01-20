import React, { useState, useMemo, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Search, Filter, PlusCircle, ShoppingBag, Home, Coffee, Zap, AlertTriangle, Wallet, Trash2, Edit, X, Calendar, DollarSign, Tag, ChevronLeft, ChevronRight } from 'lucide-react';
import Card from '../components/ui/Card';
import Modal from '../components/ui/Modal';
import ConfirmModal from '../components/ui/ConfirmModal';
import api from '../services/api';
import Toast from '../components/ui/Toast';

const Transactions = () => {
    const { viewMode } = useOutletContext();
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [showFilters, setShowFilters] = useState(false);
    const [transactions, setTransactions] = useState([]);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalItems, setTotalItems] = useState(0);
    const [wallets, setWallets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editingTransaction, setEditingTransaction] = useState(null);
    const [toast, setToast] = useState(null);

    // Filtros avançados
    const [filters, setFilters] = useState({
        year: 'all',
        category: 'all',
        type: 'all',
        minAmount: '',
        maxAmount: '',
        startDate: '',
        endDate: ''
    });

    // Correção de categoria
    const [categoryModalOpen, setCategoryModalOpen] = useState(false);
    const [transactionToCorrect, setTransactionToCorrect] = useState(null);

    // Confirmação de exclusão
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [transactionToDelete, setTransactionToDelete] = useState(null);

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
        const delayDebounceFn = setTimeout(() => {
            fetchTransactions();
        }, 300);

        return () => clearTimeout(delayDebounceFn);
    }, [viewMode, page, searchTerm, filters]);

    useEffect(() => {
        fetchWallets();
    }, []);

    // Resetar para página 1 quando filtros mudam
    useEffect(() => {
        setPage(1);
    }, [viewMode, searchTerm, filters]);

    const fetchTransactions = async () => {
        setLoading(true);
        try {
            const params = {
                viewMode,
                page,
                limit: 10,
                search: searchTerm,
                ...filters
            };

            const res = await api.get('/transactions', { params });

            // Backend agora retorna { transactions, totalPages, totalItems, currentPage }
            if (res.data.transactions) {
                setTransactions(res.data.transactions);
                setTotalPages(res.data.totalPages);
                setTotalItems(res.data.totalItems);
            } else {
                // Fallback para formato antigo caso backend não tenha atualizado
                setTransactions(res.data);
            }

        } catch (error) {
            console.error('Failed to fetch transactions:', error);
            setToast({ message: 'Erro ao carregar transações', type: 'error' });
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

    const clearFilters = () => {
        setFilters({
            year: 'all',
            category: 'all',
            type: 'all',
            minAmount: '',
            maxAmount: '',
            startDate: '',
            endDate: ''
        });
        setSearchTerm('');
        setPage(1);
    };



    // Gerar lista de anos disponíveis (últimos 5 anos)
    const availableYears = useMemo(() => {
        const currentYear = new Date().getFullYear();
        const years = [];
        for (let i = 0; i < 5; i++) {
            years.push(currentYear - i);
        }
        return years;
    }, []);

    // Categorias disponíveis
    const categories = [
        'Alimentação', 'Lazer', 'Moradia', 'Contas', 'Saúde',
        'Transporte', 'Educação', 'Salário', 'Freelance',
        'Investimentos', 'Presente', 'Venda', 'Reembolso', 'Outros'
    ];

    const hasActiveFilters =
        filters.year !== 'all' ||
        filters.category !== 'all' ||
        filters.type !== 'all' ||
        filters.minAmount ||
        filters.maxAmount ||
        filters.startDate ||
        filters.endDate ||
        searchTerm;

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

    const handleDelete = (id) => {
        setTransactionToDelete(id);
        setDeleteConfirmOpen(true);
    };

    const confirmDelete = async () => {
        if (!transactionToDelete) return;

        try {
            await api.delete(`/transactions/${transactionToDelete}`);
            fetchTransactions();
            setToast({ message: 'Transação excluída com sucesso', type: 'success' });
        } catch (error) {
            console.error('Failed to delete transaction:', error);
            setToast({ message: error.response?.data?.error || 'Erro ao excluir transação', type: 'error' });
        } finally {
            setTransactionToDelete(null);
        }
    };

    const handleOpenCategoryModal = (transaction) => {
        setTransactionToCorrect(transaction);
        setCategoryModalOpen(true);
    };

    const handleCorrectCategory = async (newCategory) => {
        if (!transactionToCorrect) return;

        try {
            await api.put(`/category/transactions/${transactionToCorrect.id}/correct-category`, {
                category: newCategory
            });

            setToast({
                message: `Categoria corrigida para "${newCategory}"! O sistema aprenderá com esta correção.`,
                type: 'success'
            });

            setCategoryModalOpen(false);
            setTransactionToCorrect(null);
            fetchTransactions();
        } catch (error) {
            console.error('Failed to correct category:', error);
            setToast({ message: error.response?.data?.error || 'Erro ao corrigir categoria', type: 'error' });
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
            {/* Barra de busca e ações */}
            <div className="flex flex-col gap-4">
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
                            onClick={() => setShowFilters(!showFilters)}
                            className={`flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-bold transition-colors shadow-sm relative ${showFilters
                                ? 'bg-blue-500 text-white hover:bg-blue-600'
                                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
                                }`}
                        >
                            <Filter size={18} />
                            Filtros
                            {hasActiveFilters && (
                                <span className="absolute -top-1 -right-1 bg-emerald-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold">
                                    {[
                                        filters.year !== 'all',
                                        filters.category !== 'all',
                                        filters.type !== 'all',
                                        filters.minAmount,
                                        filters.maxAmount,
                                        filters.startDate,
                                        filters.endDate,
                                        searchTerm
                                    ].filter(Boolean).length}
                                </span>
                            )}
                        </button>
                        <button
                            onClick={() => handleOpenModal()}
                            className="flex items-center justify-center gap-2 px-6 py-3 bg-emerald-500 text-white rounded-xl text-sm font-bold hover:bg-emerald-600 transition-colors shadow-lg shadow-emerald-500/30"
                        >
                            <PlusCircle size={18} /> Nova
                        </button>
                    </div>
                </div>

                {/* Painel de Filtros */}
                {showFilters && (
                    <Card className="p-6 space-y-4 bg-slate-50 dark:bg-slate-800/50 border-2 border-blue-200 dark:border-blue-900/30">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                <Filter size={18} className="text-blue-500" />
                                Filtros Avançados
                            </h3>
                            {hasActiveFilters && (
                                <button
                                    onClick={clearFilters}
                                    className="flex items-center gap-2 px-3 py-1.5 text-sm text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-colors"
                                >
                                    <X size={14} />
                                    Limpar Filtros
                                </button>
                            )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            {/* Filtro de Ano */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
                                    <Calendar size={14} />
                                    Período (Ano)
                                </label>
                                <select
                                    value={filters.year}
                                    onChange={(e) => setFilters({ ...filters, year: e.target.value })}
                                    className="w-full px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                >
                                    <option value="all">Todos os anos</option>
                                    {availableYears.map(year => (
                                        <option key={year} value={year}>{year}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Filtro de Categoria */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
                                    <Tag size={14} />
                                    Categoria
                                </label>
                                <select
                                    value={filters.category}
                                    onChange={(e) => setFilters({ ...filters, category: e.target.value })}
                                    className="w-full px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                >
                                    <option value="all">Todas as categorias</option>
                                    {categories.map(cat => (
                                        <option key={cat} value={cat}>{cat}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Filtro de Tipo */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
                                    <DollarSign size={14} />
                                    Tipo
                                </label>
                                <select
                                    value={filters.type}
                                    onChange={(e) => setFilters({ ...filters, type: e.target.value })}
                                    className="w-full px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                >
                                    <option value="all">Todos os tipos</option>
                                    <option value="income">Receitas</option>
                                    <option value="expense">Despesas</option>
                                </select>
                            </div>

                            {/* Valor Mínimo */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                    Valor Mínimo (R$)
                                </label>
                                <input
                                    type="number"
                                    placeholder="0.00"
                                    step="0.01"
                                    value={filters.minAmount}
                                    onChange={(e) => setFilters({ ...filters, minAmount: e.target.value })}
                                    className="w-full px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                />
                            </div>

                            {/* Valor Máximo */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                    Valor Máximo (R$)
                                </label>
                                <input
                                    type="number"
                                    placeholder="0.00"
                                    step="0.01"
                                    value={filters.maxAmount}
                                    onChange={(e) => setFilters({ ...filters, maxAmount: e.target.value })}
                                    className="w-full px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                />
                            </div>

                            {/* Data Inicial */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                    Data Inicial
                                </label>
                                <input
                                    type="date"
                                    value={filters.startDate}
                                    onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                                    className="w-full px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                />
                            </div>

                            {/* Data Final */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                    Data Final
                                </label>
                                <input
                                    type="date"
                                    value={filters.endDate}
                                    onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                                    className="w-full px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                />
                            </div>
                        </div>

                        {/* Resumo dos filtros ativos */}
                        {hasActiveFilters && (
                            <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
                                <p className="text-sm text-slate-600 dark:text-slate-400">
                                    <strong>{transactions.length}</strong> transação(ões) encontrada(s) com os filtros aplicados
                                </p>
                            </div>
                        )}
                    </Card>
                )}
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
                                    {parseFloat(item.amount) > 0 ? '+' : ''} R$ {Math.abs(parseFloat(item.amount)).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                        onClick={() => handleOpenCategoryModal(item)}
                                        className="p-2 hover:bg-purple-50 dark:hover:bg-purple-900/20 text-purple-600 rounded-lg transition-colors"
                                        title="Corrigir Categoria"
                                    >
                                        <Tag size={18} />
                                    </button>
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

            {/* Paginação */}
            {totalPages > 1 && (
                <div className="flex justify-center items-center gap-4 mt-6">
                    <button
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        disabled={page === 1}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        <ChevronLeft size={20} />
                        Anterior
                    </button>

                    <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
                        Página {page} de {totalPages}
                    </span>

                    <button
                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                        disabled={page === totalPages}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        Próxima
                        <ChevronRight size={20} />
                    </button>
                </div>
            )}


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

            {/* Modal de Correção de Categoria */}
            <Modal
                isOpen={categoryModalOpen}
                onClose={() => setCategoryModalOpen(false)}
                title="Corrigir Categoria"
            >
                {transactionToCorrect && (
                    <div className="space-y-4">
                        <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                            <p className="text-sm text-slate-500 mb-1">Transação:</p>
                            <h4 className="font-bold text-slate-900 dark:text-white">{transactionToCorrect.title}</h4>
                            <p className="text-sm text-slate-500 mt-2">
                                Categoria atual: <span className="font-semibold text-slate-700 dark:text-slate-300">{transactionToCorrect.category}</span>
                            </p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
                                Selecione a categoria correta:
                            </label>
                            <div className="grid grid-cols-2 gap-2">
                                {categories.map(cat => (
                                    <button
                                        key={cat}
                                        onClick={() => handleCorrectCategory(cat)}
                                        className={`px-4 py-3 rounded-lg text-sm font-medium transition-all ${cat === transactionToCorrect.category
                                            ? 'bg-slate-200 dark:bg-slate-700 text-slate-500 cursor-not-allowed'
                                            : 'bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-900/40 border border-purple-200 dark:border-purple-900/30'
                                            }`}
                                        disabled={cat === transactionToCorrect.category}
                                    >
                                        {cat}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-900/30 p-4 rounded-xl">
                            <p className="text-xs text-blue-800 dark:text-blue-300">
                                <strong>💡 Dica:</strong> Ao corrigir a categoria, o sistema aprenderá e aplicará automaticamente esta correção em transações futuras similares!
                            </p>
                        </div>
                    </div>
                )}
            </Modal>

            <ConfirmModal
                isOpen={deleteConfirmOpen}
                onClose={() => setDeleteConfirmOpen(false)}
                onConfirm={confirmDelete}
                title="Excluir Transação"
                message="Tem certeza que deseja excluir esta transação? Esta ação não pode ser desfeita."
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

export default Transactions;
