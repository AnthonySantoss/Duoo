import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Building2, Banknote, History, CheckCircle2, AlertTriangle, Handshake, User as UserIcon, Wallet } from 'lucide-react';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import ProgressBar from '../components/ui/ProgressBar';
import Toast from '../components/ui/Toast';
import Modal from '../components/ui/Modal';
import ConfirmModal from '../components/ui/ConfirmModal';
import api from '../services/api';
import { formatDisplayDate } from '../utils/dateUtils';

const Bank = () => {
    const { viewMode } = useOutletContext();
    const [goals, setGoals] = useState([]);
    const [loans, setLoans] = useState([]);
    const [wallets, setWallets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [toast, setToast] = useState(null);
    const [loanForm, setLoanForm] = useState({
        goalId: '',
        walletId: '',
        amount: '',
        installments: 6,
        interestRate: 2.0 // % mensal default
    });

    // Payment Modal State
    const [paymentModalOpen, setPaymentModalOpen] = useState(false);
    const [selectedLoanForPayment, setSelectedLoanForPayment] = useState(null);
    const [paymentWalletId, setPaymentWalletId] = useState('');

    // Link Transaction Modal State
    const [linkModalOpen, setLinkModalOpen] = useState(false);
    const [compatibleTransactions, setCompatibleTransactions] = useState([]);
    const [withdrawConfirmOpen, setWithdrawConfirmOpen] = useState(false);
    const [selectedTransaction, setSelectedTransaction] = useState(null);
    const [pendingLoanData, setPendingLoanData] = useState(null);

    useEffect(() => {
        fetchData();
    }, [viewMode]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [goalsRes, loansRes, walletsRes] = await Promise.all([
                api.get('/goals', { params: { viewMode } }),
                api.get('/loans'),
                api.get('/wallets')
            ]);
            setGoals(goalsRes.data);
            setLoans(loansRes.data);
            setWallets(walletsRes.data);
            if (walletsRes.data.length > 0) {
                setLoanForm(prev => ({ ...prev, walletId: walletsRes.data[0].id }));
                // Default payment wallet to first available
                if (!paymentWalletId) setPaymentWalletId(walletsRes.data[0].id);
            }
        } catch (error) {
            console.error("Failed to fetch bank data", error);
            showToast("Erro ao carregar dados do banco.", "error");
        } finally {
            setLoading(false);
        }
    };

    const showToast = (message, type = 'info') => {
        setToast({ message, type });
    };

    const handleTakeLoan = async () => {
        if (!loanForm.goalId || !loanForm.amount || parseFloat(loanForm.amount) <= 0 || !loanForm.walletId) {
            showToast("Por favor, preencha todos os campos.", "error");
            return;
        }

        const goal = goals.find(g => g.id === parseInt(loanForm.goalId));
        if (!goal) return;

        if (parseFloat(loanForm.amount) > parseFloat(goal.current_amount)) {
            showToast("O valor do empréstimo não pode ser maior que o saldo atual da meta.", "error");
            return;
        }

        // Salvar dados do empréstimo pendente
        setPendingLoanData({
            goal_id: loanForm.goalId,
            wallet_id: loanForm.walletId,
            amount: parseFloat(loanForm.amount),
            installments: parseInt(loanForm.installments),
            interest_rate: parseFloat(loanForm.interestRate)
        });

        // Buscar transações compatíveis
        try {
            const res = await api.get('/loans/search/compatible-transactions', {
                params: {
                    amount: loanForm.amount,
                    days: 7
                }
            });

            setCompatibleTransactions(res.data);

            if (res.data.length > 0) {
                // Tem transações compatíveis - abrir modal de sugestão
                setLinkModalOpen(true);
            } else {
                // Não tem transações - perguntar se já retirou
                setWithdrawConfirmOpen(true);
            }
        } catch (error) {
            console.error('Failed to fetch compatible transactions:', error);
            // Se falhar, criar empréstimo normalmente
            await createLoanWithoutLink();
        }
    };

    const createLoanWithoutLink = async () => {
        try {
            await api.post('/loans', pendingLoanData);
            showToast("Empréstimo realizado com sucesso! O valor foi transferido para sua carteira.", "success");
            setLoanForm(prev => ({ ...prev, goalId: '', amount: '', installments: 6, interestRate: 2.0 }));
            setPendingLoanData(null);
            fetchData();
        } catch (error) {
            console.error("Failed to create loan", error);
            showToast(error.response?.data?.error || "Erro ao criar empréstimo", "error");
        }
    };

    const handleLinkTransaction = async (transaction) => {
        setSelectedTransaction(transaction);

        try {
            // Criar empréstimo
            const loanRes = await api.post('/loans', pendingLoanData);

            // Vincular transação
            await api.put(`/loans/${loanRes.data.id}/link-transaction`, {
                transaction_id: transaction.id
            });

            showToast(`Empréstimo criado e vinculado à transação "${transaction.title}"!`, "success");
            setLinkModalOpen(false);
            setLoanForm(prev => ({ ...prev, goalId: '', amount: '', installments: 6, interestRate: 2.0 }));
            setPendingLoanData(null);
            setSelectedTransaction(null);
            fetchData();
        } catch (error) {
            console.error("Failed to create and link loan", error);
            showToast(error.response?.data?.error || "Erro ao criar empréstimo", "error");
        }
    };

    const handleSkipLink = async () => {
        setLinkModalOpen(false);
        await createLoanWithoutLink();
    };

    const openPaymentModal = (loan) => {
        setSelectedLoanForPayment(loan);
        setPaymentModalOpen(true);
    };

    const confirmPayment = async () => {
        if (!paymentWalletId) {
            showToast('Selecione uma carteira para pagamento', 'error');
            return;
        }

        if (!selectedLoanForPayment) return;

        try {
            await api.post(`/loans/${selectedLoanForPayment.id}/pay`, { wallet_id: paymentWalletId });
            showToast('Parcela paga com sucesso e valor devolvido à meta!', 'success');
            setPaymentModalOpen(false);
            setSelectedLoanForPayment(null);
            fetchData();
        } catch (error) {
            console.error("Failed to pay installment", error);
            showToast(error.response?.data?.error || "Erro ao pagar parcela", "error");
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
            </div>
        );
    }

    const totalAvailableInGoals = goals.reduce((acc, curr) => acc + parseFloat(curr.current_amount || 0), 0);
    const amount = parseFloat(loanForm.amount) || 0;
    const rate = parseFloat(loanForm.interestRate) || 0;
    const installments = parseInt(loanForm.installments) || 1;
    const totalToPay = amount * Math.pow((1 + rate / 100), installments);
    const installmentVal = totalToPay / installments;
    const totalInterest = totalToPay - amount;

    return (
        <div className="space-y-8">
            {toast && (
                <Toast
                    message={toast.message}
                    type={toast.type}
                    onClose={() => setToast(null)}
                />
            )}

            <Modal
                isOpen={paymentModalOpen}
                onClose={() => setPaymentModalOpen(false)}
                title="Confirmar Pagamento de Parcela"
            >
                {selectedLoanForPayment && (
                    <div className="space-y-6">
                        <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700">
                            <p className="text-sm text-slate-500 mb-1">Você está pagando uma parcela do empréstimo:</p>
                            <h4 className="font-bold text-slate-900 dark:text-white">{selectedLoanForPayment.goalTitle}</h4>
                            <div className="mt-4 flex justify-between items-center">
                                <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Valor da Parcela:</span>
                                <span className="text-xl font-bold text-emerald-600">
                                    R$ {parseFloat(selectedLoanForPayment.installmentValue).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                Pagar usando qual carteira?
                            </label>
                            <div className="relative">
                                <Wallet className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                <select
                                    value={paymentWalletId}
                                    onChange={(e) => setPaymentWalletId(e.target.value)}
                                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                                >
                                    {wallets.map(w => (
                                        <option key={w.id} value={w.id}>
                                            {w.name} (Saldo: R$ {parseFloat(w.balance).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="flex gap-3 pt-2">
                            <button
                                onClick={() => setPaymentModalOpen(false)}
                                className="flex-1 py-3 px-4 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={confirmPayment}
                                className="flex-1 py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold transition-colors shadow-lg shadow-emerald-500/20"
                            >
                                Confirmar Pagamento
                            </button>
                        </div>
                    </div>
                )}
            </Modal>

            {/* Modal de Vinculação de Transação */}
            <Modal
                isOpen={linkModalOpen}
                onClose={() => setLinkModalOpen(false)}
                title="🔗 Vincular Transação Bancária"
            >
                <div className="space-y-6">
                    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-900/30 p-4 rounded-xl">
                        <p className="text-sm text-blue-800 dark:text-blue-300">
                            <strong>✨ Encontramos {compatibleTransactions.length} transação(ões) compatível(is)!</strong>
                        </p>
                        <p className="text-xs text-blue-700 dark:text-blue-400 mt-2">
                            Vincular ajuda a rastrear a origem do dinheiro e manter seu controle financeiro organizado.
                        </p>
                    </div>

                    {compatibleTransactions.length > 0 && (
                        <div>
                            <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
                                Selecione a transação correspondente:
                            </h4>
                            <div className="space-y-2 max-h-64 overflow-y-auto">
                                {compatibleTransactions.map(t => (
                                    <button
                                        key={t.id}
                                        onClick={() => handleLinkTransaction(t)}
                                        className="w-full p-4 rounded-xl border-2 border-slate-200 dark:border-slate-700 hover:border-emerald-500 dark:hover:border-emerald-500 bg-white dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-900/10 transition-all text-left group"
                                    >
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1">
                                                <h5 className="font-bold text-slate-900 dark:text-white group-hover:text-emerald-700 dark:group-hover:text-emerald-400">
                                                    {t.title}
                                                </h5>
                                                <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
                                                    <span>{formatDisplayDate(t.date)}</span>
                                                    <span>•</span>
                                                    <span>{t.category}</span>
                                                    {t.wallet && (
                                                        <>
                                                            <span>•</span>
                                                            <span>{t.wallet.bank_name || t.wallet.name}</span>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="text-right ml-4">
                                                <p className="font-bold text-lg text-slate-900 dark:text-white">
                                                    R$ {Math.abs(parseFloat(t.amount)).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                </p>
                                                <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400">
                                                    {t.similarity}% compatível
                                                </span>
                                            </div>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
                        <button
                            onClick={handleSkipLink}
                            className="w-full py-3 px-4 rounded-xl border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-sm"
                        >
                            Nenhuma dessas / Pular vinculação
                        </button>
                        <p className="text-xs text-slate-500 text-center mt-2">
                            Você pode vincular depois se necessário
                        </p>
                    </div>
                </div>
            </Modal>

            {/* Modal de Confirmação de Saque */}
            <ConfirmModal
                isOpen={withdrawConfirmOpen}
                onClose={() => setWithdrawConfirmOpen(false)}
                onConfirm={async () => {
                    setWithdrawConfirmOpen(false);
                    await createLoanWithoutLink();
                }}
                title="💰 Você já retirou o dinheiro?"
                message="Não encontramos transações bancárias compatíveis nos últimos 7 dias. Você já sacou ou transferiu o valor do empréstimo da sua conta bancária?"
                confirmText="Sim, já retirei"
                cancelText="Não, cancelar"
            />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Left Side: Simulator & Action */}
                <div className="space-y-6">
                    <div className="space-y-2">
                        <h3 className="text-lg font-bold flex items-center gap-2 text-slate-900 dark:text-white">
                            <Building2 className="text-emerald-500" /> Banco & Auto-Empréstimo
                        </h3>
                        <p className="text-slate-500 text-sm">Pegue dinheiro das metas e pague juros para si mesmo.</p>
                    </div>

                    <Card>
                        <div className="flex items-center gap-3 mb-6 bg-amber-50 dark:bg-amber-900/10 p-4 rounded-xl border border-amber-100 dark:border-amber-900/20">
                            <div className="p-2 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-lg">
                                <Banknote size={24} />
                            </div>
                            <div>
                                <p className="text-xs font-bold text-amber-700 dark:text-amber-400 uppercase">Capital Disponível em Metas</p>
                                <h3 className="text-2xl font-bold text-amber-900 dark:text-amber-100">
                                    R$ {totalAvailableInGoals.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </h3>
                            </div>
                        </div>

                        <div className="space-y-5">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Retirar de qual Meta?</label>
                                <select
                                    value={loanForm.goalId}
                                    onChange={(e) => setLoanForm({ ...loanForm, goalId: e.target.value })}
                                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                                >
                                    <option value="">Selecione uma meta...</option>
                                    {goals.map(g => (
                                        <option key={g.id} value={g.id}>{g.title} (Disp: R$ {parseFloat(g.current_amount).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Depositar em qual Carteira?</label>
                                <select
                                    value={loanForm.walletId}
                                    onChange={(e) => setLoanForm({ ...loanForm, walletId: e.target.value })}
                                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                                >
                                    <option value="">Selecione uma carteira...</option>
                                    {wallets.map(w => (
                                        <option key={w.id} value={w.id}>{w.name} (Saldo: R$ {parseFloat(w.balance).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})</option>
                                    ))}
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Valor (R$)</label>
                                    <input
                                        type="number"
                                        placeholder="0.00"
                                        value={loanForm.amount}
                                        onChange={(e) => setLoanForm({ ...loanForm, amount: e.target.value })}
                                        className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Parcelas</label>
                                    <select
                                        value={loanForm.installments}
                                        onChange={(e) => setLoanForm({ ...loanForm, installments: parseInt(e.target.value) })}
                                        className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                                    >
                                        {[1, 2, 3, 6, 12, 18, 24, 36].map(n => <option key={n} value={n}>{n}x Meses</option>)}
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Taxa de Juros (% a.m.)</label>
                                <input
                                    type="number"
                                    step="0.1"
                                    value={loanForm.interestRate}
                                    onChange={(e) => setLoanForm({ ...loanForm, interestRate: e.target.value })}
                                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                                />
                                <p className="text-xs text-slate-400 mt-1">Juros voltam para sua meta.</p>
                            </div>

                            {amount > 0 && (
                                <div className="bg-slate-100 dark:bg-slate-800 p-4 rounded-xl text-sm space-y-2 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                                    <div className="flex justify-between font-medium">
                                        <span>Valor Solicitado:</span>
                                        <span>R$ {amount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                    </div>
                                    <div className="flex justify-between font-medium">
                                        <span>Juros Totais:</span>
                                        <span className="text-emerald-600">
                                            R$ {totalInterest.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </span>
                                    </div>
                                    <div className="border-t border-slate-200 dark:border-slate-700 pt-2 flex justify-between font-bold text-lg">
                                        <span>Parcela Mensal:</span>
                                        <span>R$ {installmentVal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                    </div>
                                </div>
                            )}

                            <button
                                onClick={handleTakeLoan}
                                className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3.5 rounded-xl transition-colors shadow-lg shadow-emerald-500/30 flex items-center justify-center gap-2"
                            >
                                <Handshake size={20} /> Pegar Empréstimo
                            </button>
                        </div>
                    </Card>
                </div>

                {/* Right Side: Active Loans */}
                <div className="space-y-6">
                    <div className="flex justify-between items-end">
                        <div className="space-y-2">
                            <h3 className="text-lg font-bold flex items-center gap-2 text-slate-900 dark:text-white">
                                <History className="text-blue-500" /> Meus Empréstimos
                            </h3>
                            <p className="text-slate-500 text-sm">Gerencie pagamentos.</p>
                        </div>
                    </div>

                    {loans.length > 0 ? (
                        <div className="space-y-4">
                            {loans.map(loan => (
                                <Card key={loan.id} className={`border-l-4 ${loan.status === 'paid' ? 'border-l-emerald-500 opacity-70' : 'border-l-blue-500'}`}>
                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <h4 className="font-bold text-lg text-slate-900 dark:text-white">{loan.goalTitle}</h4>
                                            <div className="flex flex-col">
                                                <p className="text-xs text-slate-500">Empréstimo realizado em {formatDisplayDate(loan.date)}</p>
                                                {viewMode === 'joint' && (
                                                    <p className="text-xs font-semibold text-indigo-500 flex items-center gap-1 mt-1">
                                                        <UserIcon size={12} /> {loan.userName}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                        <Badge variant={loan.status === 'paid' ? 'success' : 'blue'}>
                                            {loan.status === 'paid' ? 'Quitado' : 'Aberto'}
                                        </Badge>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4 mb-4">
                                        <div>
                                            <p className="text-xs text-slate-500">Original</p>
                                            <p className="font-medium text-slate-900 dark:text-white">R$ {parseFloat(loan.originalAmount).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-slate-500">Total + Juros</p>
                                            <p className="font-bold text-emerald-600">R$ {parseFloat(loan.totalToPay).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-slate-500">Restante</p>
                                            <p className="font-medium text-rose-500">R$ {parseFloat(loan.remainingAmount).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-slate-500">Parcelas</p>
                                            <p className="font-medium text-slate-900 dark:text-white">{loan.installmentsPaid} / {loan.installmentsTotal}</p>
                                        </div>
                                    </div>

                                    <ProgressBar progress={(loan.installmentsPaid / loan.installmentsTotal) * 100} colorClass="bg-blue-500" />

                                    {loan.status === 'active' && (
                                        <button
                                            onClick={() => openPaymentModal(loan)}
                                            className="mt-4 w-full py-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-300 font-bold text-sm rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors flex items-center justify-center gap-2"
                                        >
                                            Pagar Parcela (R$ {parseFloat(loan.installmentValue).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})
                                        </button>
                                    )}
                                </Card>
                            ))}
                        </div>
                    ) : (
                        <Card className="flex flex-col items-center justify-center py-12 text-center text-slate-400 border-dashed border-2 bg-transparent shadow-none">
                            <Building2 size={48} className="mb-4 opacity-20" />
                            <p>Sem empréstimos ativos.</p>
                        </Card>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Bank;
