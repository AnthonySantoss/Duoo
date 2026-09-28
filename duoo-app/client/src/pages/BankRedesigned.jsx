import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Banknote, Building2, CheckCircle2, Handshake, History, Wallet } from 'lucide-react';
import { useOutletContext } from 'react-router-dom';
import Badge from '../components/ui/Badge';
import Card from '../components/ui/Card';
import ConfirmModal from '../components/ui/ConfirmModal';
import Modal from '../components/ui/Modal';
import ProgressBar from '../components/ui/ProgressBar';
import Toast from '../components/ui/Toast';
import api from '../services/api';
import { formatDisplayDate } from '../utils/dateUtils';
import PageSkeleton from '../components/ui/PageSkeleton';

const inputClass = 'w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 dark:border-slate-700 dark:bg-slate-800';
const formatCurrency = (value) => `R$ ${Number(value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const BankRedesigned = () => {
    const { viewMode } = useOutletContext();
    const [goals, setGoals] = useState([]);
    const [loans, setLoans] = useState([]);
    const [wallets, setWallets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [toast, setToast] = useState(null);
    const [loanForm, setLoanForm] = useState({ goalId: '', walletId: '', amount: '', installments: 6, interestRate: 2 });
    const [paymentModalOpen, setPaymentModalOpen] = useState(false);
    const [selectedLoan, setSelectedLoan] = useState(null);
    const [paymentWalletId, setPaymentWalletId] = useState('');
    const [linkModalOpen, setLinkModalOpen] = useState(false);
    const [compatibleTransactions, setCompatibleTransactions] = useState([]);
    const [withdrawConfirmOpen, setWithdrawConfirmOpen] = useState(false);
    const [pendingLoanData, setPendingLoanData] = useState(null);

    const showToast = (message, type = 'info') => setToast({ message, type });
    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [goalsResponse, loansResponse, walletsResponse] = await Promise.all([api.get('/goals', { params: { viewMode } }), api.get('/loans'), api.get('/wallets')]);
            setGoals(goalsResponse.data); setLoans(loansResponse.data); setWallets(walletsResponse.data);
            if (walletsResponse.data.length) { setLoanForm((current) => ({ ...current, walletId: current.walletId || walletsResponse.data[0].id })); setPaymentWalletId((current) => current || walletsResponse.data[0].id); }
        } catch (error) { console.error('Failed to load bank data:', error); showToast('Erro ao carregar dados bancários.', 'error'); } finally { setLoading(false); }
    }, [viewMode]);
    useEffect(() => { fetchData(); }, [fetchData]);

    const createLoanWithoutLink = async () => {
        try { await api.post('/loans', pendingLoanData); showToast('Empréstimo realizado com sucesso.', 'success'); setPendingLoanData(null); setLoanForm((current) => ({ ...current, goalId: '', amount: '' })); fetchData(); } catch (error) { showToast(error.response?.data?.error || 'Erro ao criar empréstimo.', 'error'); }
    };
    const handleTakeLoan = async () => {
        const amount = Number(loanForm.amount); const goal = goals.find((item) => item.id === Number(loanForm.goalId));
        if (!goal || !amount || !loanForm.walletId) return showToast('Preencha a meta, carteira e valor.', 'error');
        if (amount > Number(goal.current_amount)) return showToast('O valor não pode ser maior que o saldo da meta.', 'error');
        const pending = { goal_id: loanForm.goalId, wallet_id: loanForm.walletId, amount, installments: Number(loanForm.installments), interest_rate: Number(loanForm.interestRate) };
        setPendingLoanData(pending);
        try { const response = await api.get('/loans/search/compatible-transactions', { params: { amount, days: 7 } }); setCompatibleTransactions(response.data); if (response.data.length) setLinkModalOpen(true); else setWithdrawConfirmOpen(true); } catch (error) { console.error(error); await createLoanWithoutLink(); }
    };
    const handleLinkTransaction = async (transaction) => {
        try { const loan = await api.post('/loans', pendingLoanData); await api.put(`/loans/${loan.data.id}/link-transaction`, { transaction_id: transaction.id }); showToast('Empréstimo vinculado com sucesso.', 'success'); setLinkModalOpen(false); setPendingLoanData(null); fetchData(); } catch (error) { showToast(error.response?.data?.error || 'Erro ao vincular empréstimo.', 'error'); }
    };
    const confirmPayment = async () => {
        if (!selectedLoan || !paymentWalletId) return showToast('Selecione uma carteira.', 'error');
        try { await api.post(`/loans/${selectedLoan.id}/pay`, { wallet_id: paymentWalletId }); showToast('Parcela paga com sucesso.', 'success'); setPaymentModalOpen(false); setSelectedLoan(null); fetchData(); } catch (error) { showToast(error.response?.data?.error || 'Erro ao pagar parcela.', 'error'); }
    };

    const totals = useMemo(() => ({ goals: goals.reduce((sum, goal) => sum + Number(goal.current_amount || 0), 0), wallets: wallets.reduce((sum, wallet) => sum + Number(wallet.balance || 0), 0), openLoans: loans.filter((loan) => loan.status === 'active').length }), [goals, loans, wallets]);
    const amount = Number(loanForm.amount || 0); const totalToPay = amount * Math.pow(1 + Number(loanForm.interestRate || 0) / 100, Number(loanForm.installments || 1)); const installment = totalToPay / Number(loanForm.installments || 1);

    if (loading) return <PageSkeleton />;
    return <div className="space-y-6 animate-in fade-in duration-300 md:space-y-8">
        <section><p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-600">Visão financeira</p><h1 className="mt-2 text-3xl font-semibold tracking-tight">Banco</h1><p className="mt-2 text-sm text-slate-500">Use uma meta como reserva e acompanhe o empréstimo dentro do casal.</p></section>
        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
        <section className="grid grid-cols-1 gap-3 sm:grid-cols-3"><div className="rounded-2xl border border-slate-200/80 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"><p className="text-xs text-slate-500">Disponível em metas</p><p className="mt-2 text-2xl font-semibold">{formatCurrency(totals.goals)}</p></div><div className="rounded-2xl border border-slate-200/80 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"><p className="text-xs text-slate-500">Saldo em carteiras</p><p className="mt-2 text-2xl font-semibold">{formatCurrency(totals.wallets)}</p></div><div className="rounded-2xl border border-slate-200/80 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"><p className="text-xs text-slate-500">Empréstimos abertos</p><p className="mt-2 text-2xl font-semibold">{totals.openLoans}</p></div></section>

        <section className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(360px,1fr)]"><Card className="rounded-3xl border-slate-200/80 shadow-none dark:border-slate-800"><div className="mb-6 flex items-start gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600"><Banknote size={20} /></span><div><h2 className="text-lg font-semibold">Retirar de uma meta</h2><p className="mt-1 text-sm text-slate-500">O valor volta para a carteira e os juros retornam para a meta.</p></div></div><div className="space-y-4"><label className="block text-sm font-medium">Meta de origem<select value={loanForm.goalId} onChange={(event) => setLoanForm({ ...loanForm, goalId: event.target.value })} className={`${inputClass} mt-2`}><option value="">Selecione uma meta</option>{goals.map((goal) => <option key={goal.id} value={goal.id}>{goal.title} · {formatCurrency(goal.current_amount)}</option>)}</select></label><label className="block text-sm font-medium">Carteira de destino<select value={loanForm.walletId} onChange={(event) => setLoanForm({ ...loanForm, walletId: event.target.value })} className={`${inputClass} mt-2`}><option value="">Selecione uma carteira</option>{wallets.map((wallet) => <option key={wallet.id} value={wallet.id}>{wallet.name} · {formatCurrency(wallet.balance)}</option>)}</select></label><div className="grid grid-cols-2 gap-3"><label className="block text-sm font-medium">Valor<input type="number" min="0" step="0.01" value={loanForm.amount} onChange={(event) => setLoanForm({ ...loanForm, amount: event.target.value })} className={`${inputClass} mt-2`} /></label><label className="block text-sm font-medium">Parcelas<select value={loanForm.installments} onChange={(event) => setLoanForm({ ...loanForm, installments: event.target.value })} className={`${inputClass} mt-2`}>{[1, 2, 3, 6, 12, 18, 24, 36].map((number) => <option key={number} value={number}>{number}x</option>)}</select></label></div><label className="block text-sm font-medium">Juros mensais<input type="number" step="0.1" value={loanForm.interestRate} onChange={(event) => setLoanForm({ ...loanForm, interestRate: event.target.value })} className={`${inputClass} mt-2`} /><span className="mt-1 block text-xs font-normal text-slate-400">Os juros são devolvidos para a meta.</span></label>{amount > 0 && <div className="rounded-2xl bg-slate-50 p-4 text-sm dark:bg-slate-800/60"><div className="flex justify-between"><span>Parcela estimada</span><strong>{formatCurrency(installment)}</strong></div><div className="mt-2 flex justify-between text-slate-500"><span>Total com juros</span><span>{formatCurrency(totalToPay)}</span></div></div>}<button type="button" onClick={handleTakeLoan} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 py-3.5 text-sm font-semibold text-white hover:bg-emerald-700"><Handshake size={18} /> Simular empréstimo</button></div></Card>

            <div className="space-y-4"><div className="flex items-center gap-3"><History className="text-blue-500" size={20} /><div><h2 className="text-lg font-semibold">Empréstimos do casal</h2><p className="text-sm text-slate-500">Acompanhe pagamentos e saldo restante.</p></div></div>{loans.length ? loans.map((loan) => <Card key={loan.id} className="rounded-3xl border-slate-200/80 shadow-none dark:border-slate-800"><div className="flex items-start justify-between gap-3"><div><h3 className="font-semibold">{loan.goalTitle}</h3><p className="mt-1 text-xs text-slate-500">{formatDisplayDate(loan.date)} · {loan.userName || 'Casal'}</p></div><Badge variant={loan.status === 'paid' ? 'success' : 'blue'}>{loan.status === 'paid' ? 'Quitado' : 'Aberto'}</Badge></div><div className="mt-5 grid grid-cols-2 gap-4 text-sm"><div><p className="text-xs text-slate-500">Restante</p><p className="mt-1 font-semibold text-rose-500">{formatCurrency(loan.remainingAmount)}</p></div><div><p className="text-xs text-slate-500">Parcelas</p><p className="mt-1 font-semibold">{loan.installmentsPaid} / {loan.installmentsTotal}</p></div></div><div className="mt-4"><ProgressBar progress={(Number(loan.installmentsPaid) / Number(loan.installmentsTotal || 1)) * 100} colorClass="bg-blue-500" /></div>{loan.status === 'active' && <button type="button" onClick={() => { setSelectedLoan(loan); setPaymentModalOpen(true); }} className="mt-4 w-full rounded-xl bg-blue-50 py-2.5 text-sm font-semibold text-blue-700 dark:bg-blue-950/30 dark:text-blue-300">Pagar parcela · {formatCurrency(loan.installmentValue)}</button>}</Card>) : <Card className="rounded-3xl border-dashed py-14 text-center shadow-none"><Building2 className="mx-auto text-slate-300" size={40} /><p className="mt-3 text-sm text-slate-500">Nenhum empréstimo ativo.</p></Card>}</div></section>

        <Modal isOpen={paymentModalOpen} onClose={() => setPaymentModalOpen(false)} title="Pagar parcela">{selectedLoan && <div className="space-y-4"><div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-800"><p className="text-sm text-slate-500">{selectedLoan.goalTitle}</p><p className="mt-1 text-2xl font-semibold">{formatCurrency(selectedLoan.installmentValue)}</p></div><label className="block text-sm font-medium">Carteira para pagamento<select value={paymentWalletId} onChange={(event) => setPaymentWalletId(event.target.value)} className={`${inputClass} mt-2`}>{wallets.map((wallet) => <option key={wallet.id} value={wallet.id}>{wallet.name} · {formatCurrency(wallet.balance)}</option>)}</select></label><button type="button" onClick={confirmPayment} className="w-full rounded-2xl bg-emerald-600 py-3 font-semibold text-white">Confirmar pagamento</button></div>}</Modal>
        <Modal isOpen={linkModalOpen} onClose={() => setLinkModalOpen(false)} title="Vincular transação"><div className="space-y-4"><p className="rounded-2xl bg-blue-50 p-4 text-sm text-blue-800">Encontramos transações recentes que podem representar a retirada.</p>{compatibleTransactions.map((item) => <button key={item.id} type="button" onClick={() => handleLinkTransaction(item)} className="flex w-full items-center justify-between rounded-2xl border border-slate-200 p-4 text-left hover:border-emerald-400 dark:border-slate-700"><span><strong className="block text-sm">{item.title}</strong><small className="text-xs text-slate-500">{formatDisplayDate(item.date)} · {item.category}</small></span><strong>{formatCurrency(Math.abs(item.amount))}</strong></button>)}<button type="button" onClick={async () => { setLinkModalOpen(false); await createLoanWithoutLink(); }} className="w-full rounded-xl border border-slate-200 py-3 text-sm dark:border-slate-700">Pular vinculação</button></div></Modal>
        <ConfirmModal isOpen={withdrawConfirmOpen} onClose={() => setWithdrawConfirmOpen(false)} onConfirm={async () => { setWithdrawConfirmOpen(false); await createLoanWithoutLink(); }} title="Você já retirou o dinheiro?" message="Não encontramos uma transação compatível nos últimos 7 dias. Confirme para criar o empréstimo mesmo assim." confirmText="Sim, já retirei" cancelText="Cancelar" />
    </div>;
};

export default BankRedesigned;
