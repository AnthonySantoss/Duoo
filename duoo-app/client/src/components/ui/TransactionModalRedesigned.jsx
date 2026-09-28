import React, { useEffect, useState } from 'react';
import { ArrowDownCircle, ArrowUpCircle, CreditCard, Users } from 'lucide-react';
import Modal from './Modal';
import api from '../../services/api';
import { useAchievements } from '../../context/AchievementContext';
import { getLocalDateString } from '../../utils/dateUtils';
import { formatCurrencyInput, formatCurrencyValue, parseCurrencyInput } from '../../utils/currency';

const inputClass = 'w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 dark:border-slate-700 dark:bg-slate-800';
const expenseCategories = ['Alimentação', 'Lazer', 'Moradia', 'Contas', 'Saúde', 'Transporte', 'Educação', 'Outros'];
const incomeCategories = ['Salário', 'Freelance', 'Investimentos', 'Presente', 'Venda', 'Reembolso', 'Outros'];

const TransactionModalRedesigned = ({ isOpen, onClose, transaction = null, onSuccess }) => {
    const { checkAchievements } = useAchievements();
    const [wallets, setWallets] = useState([]);
    const [creditCards, setCreditCards] = useState([]);
    const [eventBuckets, setEventBuckets] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [formData, setFormData] = useState({ title: '', amount: '', category: 'Alimentação', date: getLocalDateString(), type: 'expense', wallet_id: '', credit_card_id: '', goal_id: '', installments: '1', split_with_partner: false, split_amount: '', notes: '' });

    useEffect(() => {
        const loadOptions = async () => {
            try {
                const [walletResponse, cardResponse, goalResponse] = await Promise.all([
                    api.get('/wallets?mine=true'),
                    api.get('/credit-cards?viewMode=user1'),
                    api.get('/goals?viewMode=joint'),
                ]);
                setWallets(walletResponse.data);
                setCreditCards(cardResponse.data);
                setEventBuckets(goalResponse.data.filter((goal) => goal.is_event_bucket));
                setFormData((current) => ({ ...current, wallet_id: current.wallet_id || walletResponse.data[0]?.id || '', credit_card_id: current.credit_card_id || cardResponse.data[0]?.id || '' }));
            } catch (loadError) {
                console.error('Failed to load transaction options:', loadError);
            }
        };
        loadOptions();
    }, []);

    useEffect(() => {
        if (!isOpen) return;
        if (transaction) {
            setFormData({ title: transaction.title, amount: formatCurrencyValue(Math.abs(parseFloat(transaction.amount))), category: transaction.category, date: transaction.date.split('T')[0], type: parseFloat(transaction.amount) < 0 ? 'expense' : 'income', wallet_id: transaction.wallet_id || '', credit_card_id: '', goal_id: transaction.goal_id || '', installments: '1', split_with_partner: !!transaction.split_with_partner, split_amount: transaction.split_amount ? formatCurrencyValue(transaction.split_amount) : '', notes: transaction.notes || '' });
        } else {
            setFormData((current) => ({ title: '', amount: '', category: 'Alimentação', date: getLocalDateString(), type: 'expense', wallet_id: current.wallet_id || wallets[0]?.id || '', credit_card_id: current.credit_card_id || creditCards[0]?.id || '', goal_id: '', installments: '1', split_with_partner: false, split_amount: '', notes: '' }));
        }
        setError('');
    }, [creditCards, isOpen, transaction, wallets]);

    const setType = (type) => setFormData((current) => ({ ...current, type, category: type === 'income' ? 'Salário' : 'Alimentação' }));

    const handleSubmit = async (event) => {
        event.preventDefault();
        setLoading(true);
        setError('');
        const amount = parseCurrencyInput(formData.amount);
        if (!amount || amount <= 0) { setError('Informe um valor maior que zero.'); setLoading(false); return; }

        try {
            if (formData.type === 'credit') {
                if (!formData.credit_card_id) throw new Error('Selecione um cartão de crédito.');
                await api.post(`/credit-cards/${formData.credit_card_id}/purchases`, { description: formData.title, total_amount: amount, installments: Number(formData.installments), purchase_date: formData.date, category: formData.category, notes: formData.notes, goal_id: formData.goal_id ? Number(formData.goal_id) : null });
            } else {
                if (formData.type === 'expense') {
                    const wallet = wallets.find((item) => item.id === Number(formData.wallet_id));
                    if (wallet && amount > Number(wallet.balance)) throw new Error(`Saldo insuficiente. Disponível: R$ ${Number(wallet.balance).toFixed(2)}.`);
                }
                const payload = { title: formData.title, amount: formData.type === 'expense' ? -Math.abs(amount) : Math.abs(amount), category: formData.category, date: formData.date, type: formData.type, wallet_id: Number(formData.wallet_id), split_with_partner: formData.split_with_partner, split_amount: formData.split_amount ? parseCurrencyInput(formData.split_amount) : null, notes: formData.notes, goal_id: formData.goal_id ? Number(formData.goal_id) : null };
                if (transaction) await api.put(`/transactions/${transaction.id}`, payload);
                else await api.post('/transactions', payload);
            }
            onSuccess?.();
            onClose();
            setTimeout(() => { checkAchievements(); window.dispatchEvent(new CustomEvent('refresh-notifications')); window.dispatchEvent(new CustomEvent('refresh-data')); }, 500);
        } catch (submitError) {
            console.error('Failed to save transaction:', submitError);
            setError(submitError.response?.data?.error || submitError.message || 'Erro ao salvar transação.');
        } finally { setLoading(false); }
    };

    const categories = formData.type === 'income' ? incomeCategories : expenseCategories;
    return <Modal isOpen={isOpen} onClose={onClose} title={transaction ? 'Editar transação' : 'Nova transação'}>
        <form onSubmit={handleSubmit} className="space-y-5">
            <div><p className="mb-3 text-sm font-medium text-slate-600 dark:text-slate-300">O que você quer registrar?</p><div className="grid grid-cols-3 gap-2">{[{ value: 'expense', label: 'Despesa', icon: ArrowDownCircle }, { value: 'income', label: 'Receita', icon: ArrowUpCircle }, { value: 'credit', label: 'Cartão', icon: CreditCard }].map((option) => { const TypeIcon = option.icon; return <button key={option.value} type="button" disabled={!!transaction} onClick={() => setType(option.value)} className={`flex flex-col items-center gap-2 rounded-2xl border px-2 py-3 text-xs font-semibold transition ${formData.type === option.value ? 'border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300' : 'border-slate-200 text-slate-500 hover:border-slate-300 dark:border-slate-700'} disabled:cursor-not-allowed disabled:opacity-70`}><TypeIcon size={20} />{option.label}</button>; })}</div></div>
            {error && <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</div>}
            <label className="block"><span className="mb-2 block text-sm font-medium">Descrição</span><input required value={formData.title} onChange={(event) => setFormData({ ...formData, title: event.target.value })} placeholder={formData.type === 'income' ? 'Ex.: salário, freelance...' : 'Ex.: supermercado, aluguel...'} className={inputClass} /></label>
            <div className="grid grid-cols-2 gap-3"><label className="block"><span className="mb-2 block text-sm font-medium">Valor</span><input required inputMode="decimal" value={formData.amount} onChange={(event) => setFormData({ ...formData, amount: formatCurrencyInput(event.target.value) })} placeholder="0,00" className={inputClass} /></label><label className="block"><span className="mb-2 block text-sm font-medium">Data</span><input required type="date" value={formData.date} onChange={(event) => setFormData({ ...formData, date: event.target.value })} className={inputClass} /></label></div>
            <div className="grid grid-cols-2 gap-3"><label className="block"><span className="mb-2 block text-sm font-medium">Categoria</span><select value={formData.category} onChange={(event) => setFormData({ ...formData, category: event.target.value })} className={inputClass}>{categories.map((category) => <option key={category}>{category}</option>)}</select></label><label className="block"><span className="mb-2 block text-sm font-medium">{formData.type === 'credit' ? 'Cartão' : 'Conta / carteira'}</span>{formData.type === 'credit' ? <select required value={formData.credit_card_id} onChange={(event) => setFormData({ ...formData, credit_card_id: event.target.value })} className={inputClass}><option value="">Selecione</option>{creditCards.map((card) => <option key={card.id} value={card.id}>{card.name}</option>)}</select> : <select required value={formData.wallet_id} onChange={(event) => setFormData({ ...formData, wallet_id: event.target.value })} className={inputClass}><option value="">Selecione</option>{wallets.map((wallet) => <option key={wallet.id} value={wallet.id}>{wallet.name}</option>)}</select>}</label></div>
            {formData.type === 'credit' && <label className="block"><span className="mb-2 block text-sm font-medium">Parcelamento</span><select value={formData.installments} onChange={(event) => setFormData({ ...formData, installments: event.target.value })} className={inputClass}>{Array.from({ length: 12 }, (_, index) => <option key={index + 1} value={index + 1}>{index === 0 ? 'À vista' : `${index + 1} parcelas`}</option>)}</select></label>}
            {(formData.type === 'expense' || formData.type === 'credit') && eventBuckets.length > 0 && <label className="block"><span className="mb-2 block text-sm font-medium">Vincular a uma meta ou evento <span className="font-normal text-slate-400">(opcional)</span></span><select value={formData.goal_id} onChange={(event) => setFormData({ ...formData, goal_id: event.target.value })} className={inputClass}><option value="">Nenhum evento</option>{eventBuckets.map((bucket) => <option key={bucket.id} value={bucket.id}>{bucket.title}</option>)}</select></label>}
            {formData.type !== 'credit' && <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/60"><div className="flex items-center justify-between gap-3"><div className="flex items-center gap-2"><Users size={18} className="text-emerald-600" /><div><p className="text-sm font-medium">Dividir com o parceiro</p><p className="text-xs text-slate-500">Aparece no acerto do casal</p></div></div><input type="checkbox" checked={formData.split_with_partner} onChange={(event) => setFormData({ ...formData, split_with_partner: event.target.checked })} className="h-5 w-5 accent-emerald-600" /></div>{formData.split_with_partner && <input inputMode="decimal" value={formData.split_amount} onChange={(event) => setFormData({ ...formData, split_amount: formatCurrencyInput(event.target.value) })} placeholder={`Metade sugerida: ${formatCurrencyValue(parseCurrencyInput(formData.amount) / 2)}`} className={`${inputClass} mt-3`} />}</div>}
            <label className="block"><span className="mb-2 block text-sm font-medium">Observação <span className="font-normal text-slate-400">(opcional)</span></span><textarea rows="2" value={formData.notes} onChange={(event) => setFormData({ ...formData, notes: event.target.value })} placeholder="Adicione um detalhe para vocês dois" className={`${inputClass} resize-none`} /></label>
            <button type="submit" disabled={loading} className="w-full rounded-2xl bg-emerald-600 py-3.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60">{loading ? 'Salvando...' : transaction ? 'Atualizar transação' : 'Salvar transação'}</button>
        </form>
    </Modal>;
};

export default TransactionModalRedesigned;
