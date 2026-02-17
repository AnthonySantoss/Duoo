import React, { useState, useEffect, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Calculator, ShoppingCart, CheckCircle2, AlertTriangle, RefreshCw, Receipt, History as HistoryIcon, Home, Car } from 'lucide-react';
import api from '../services/api';
import Card from '../components/ui/Card';
import Toast from '../components/ui/Toast';

const Simulation = () => {
    // Context
    const outletContext = useOutletContext();
    const viewMode = outletContext?.viewMode || 'joint';

    const [loading, setLoading] = useState(true);
    const [mode, setMode] = useState('purchase'); // 'purchase' or 'patrimony'
    const [data, setData] = useState({
        currentBalance: 0,
        averageSavings: 0,
        history: []
    });

    // Purchase Form State
    const [item, setItem] = useState('');
    const [amount, setAmount] = useState('');
    const [installments, setInstallments] = useState(1);

    // Patrimony Form State
    const [patrimonyType, setPatrimonyType] = useState('house'); // 'house' or 'car'
    const [patrimonyAmount, setPatrimonyAmount] = useState('');
    const [downPaymentPercent, setDownPaymentPercent] = useState(20);
    const [paymentModel, setPaymentModel] = useState('full'); // 'full' or 'construction'
    const [signalAmount, setSignalAmount] = useState('');
    const [installmentMonths, setInstallmentMonths] = useState(24);
    const [patrimonyInstallment, setPatrimonyInstallment] = useState('');

    const [toast, setToast] = useState(null);

    useEffect(() => {
        fetchSimulationData();
    }, [viewMode]);

    const fetchSimulationData = async () => {
        setLoading(true);
        try {
            const res = await api.get('/simulation', { params: { viewMode } });
            setData({
                currentBalance: parseFloat(res.data.currentBalance || 0),
                averageSavings: parseFloat(res.data.averageSavings || 0),
                history: Array.isArray(res.data.history) ? res.data.history : []
            });
        } catch (error) {
            console.error('Failed to fetch simulation data:', error);
            setData({ currentBalance: 0, averageSavings: 0, history: [] });
        } finally {
            setLoading(false);
        }
    };

    const simulationResult = useMemo(() => {
        if (mode === 'purchase') {
            const cost = parseFloat(amount);
            const months = parseInt(installments) || 1;

            if (!amount || isNaN(cost) || cost <= 0) return null;

            const monthlyCost = cost / months;
            const monthlySurplus = parseFloat(data.averageSavings || 0);
            let startBalance = parseFloat(data.currentBalance || 0);

            const projection = [];
            let isRisk = false;
            let currentLoopBalance = startBalance;
            let balances = [startBalance];

            for (let i = 1; i <= 6; i++) {
                currentLoopBalance += monthlySurplus;
                if (i <= months) {
                    currentLoopBalance -= monthlyCost;
                }
                if (currentLoopBalance < 0) isRisk = true;
                balances.push(currentLoopBalance);
                projection.push({ month: i, balance: currentLoopBalance, isNegative: currentLoopBalance < 0 });
            }

            const minVal = Math.min(...balances, 0);
            const maxVal = Math.max(...balances, 100);
            const padding = (Math.abs(maxVal - minVal) * 0.1) || 100;

            return {
                isRisk,
                projection,
                monthlySurplus,
                monthlyCost,
                minBalance: Math.min(...balances),
                chartMin: minVal - padding,
                chartMax: maxVal + padding,
                totalRange: (maxVal + padding) - (minVal - padding) || 1
            };
        } else {
            // Patrimony logic
            const targetVal = parseFloat(patrimonyAmount);
            if (!patrimonyAmount || isNaN(targetVal) || targetVal <= 0) return null;

            const currentSavings = data.currentBalance;
            const monthlySavings = data.averageSavings > 0 ? data.averageSavings : 0;

            if (paymentModel === 'full') {
                const neededDownPayment = targetVal * (downPaymentPercent / 100);
                const remaining = Math.max(0, neededDownPayment - currentSavings);
                const monthsToReach = monthlySavings > 0 ? Math.ceil(remaining / (monthlySavings * 1.01)) : Infinity;

                return {
                    model: 'full',
                    neededDownPayment,
                    remaining,
                    monthsToReach,
                    totalValue: targetVal,
                    currentSavings
                };
            } else {
                const signal = parseFloat(signalAmount) || 0;
                const monthlyP = parseFloat(patrimonyInstallment) || 0;
                const months = parseInt(installmentMonths) || 1;

                const totalDownPayment = signal + (monthlyP * months);
                const canAffordSignal = currentSavings >= signal;
                const canAffordMonthly = monthlySavings >= monthlyP;
                const totalFinanced = targetVal - totalDownPayment;

                return {
                    model: 'construction',
                    signal,
                    monthlyP,
                    months,
                    totalDownPayment,
                    totalFinanced,
                    canAffordSignal,
                    canAffordMonthly,
                    savingsGap: monthlyP - monthlySavings,
                    currentSavings
                };
            }
        }
    }, [mode, amount, installments, patrimonyAmount, downPaymentPercent, paymentModel, signalAmount, installmentMonths, patrimonyInstallment, data]);

    const handleSave = async () => {
        if (mode === 'purchase') {
            if (!item || !amount) return;
            try {
                await api.post('/simulation', {
                    item_name: item,
                    amount: parseFloat(amount),
                    installments
                });
                await fetchSimulationData();
                setItem('');
                setAmount('');
                setInstallments(1);
                setToast({ message: 'Simulação registrada com sucesso!', type: 'success' });
            } catch (error) {
                setToast({ message: 'Erro ao registrar simulação.', type: 'error' });
            }
        }
    };

    const formatCurrency = (val) => {
        return (parseFloat(val) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center p-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="max-w-4xl mx-auto space-y-6">
                {/* Mode Tabs */}
                <div className="flex bg-slate-100 dark:bg-slate-800 p-1.5 rounded-2xl w-fit mx-auto shadow-inner">
                    <button
                        onClick={() => setMode('purchase')}
                        className={`px-8 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${mode === 'purchase' ? 'bg-white dark:bg-slate-700 text-emerald-600 shadow-lg' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        Compra Única
                    </button>
                    <button
                        onClick={() => setMode('patrimony')}
                        className={`px-8 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${mode === 'patrimony' ? 'bg-white dark:bg-slate-700 text-emerald-600 shadow-lg' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        Sonho (Casa/Carro)
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Form Column */}
                    <div className="space-y-6">
                        {mode === 'purchase' ? (
                            <Card className="p-8 space-y-6">
                                <div className="space-y-1">
                                    <h3 className="font-black text-slate-900 dark:text-white flex items-center gap-2">
                                        <ShoppingCart size={20} className="text-emerald-500" /> Planejar Compra
                                    </h3>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Simule o impacto no seu saldo</p>
                                </div>

                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-400 mb-2 uppercase tracking-widest">O que você quer comprar?</label>
                                        <input
                                            type="text"
                                            value={item}
                                            onChange={(e) => setItem(e.target.value)}
                                            placeholder="Ex: Novo Sofa, Viagem..."
                                            className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-bold dark:text-white"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-400 mb-2 uppercase tracking-widest">Valor Total (R$)</label>
                                        <input
                                            type="number"
                                            value={amount}
                                            onChange={(e) => setAmount(e.target.value)}
                                            placeholder="0.00"
                                            className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-bold dark:text-white"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-400 mb-2 uppercase tracking-widest">Parcelamento</label>
                                        <select
                                            value={installments}
                                            onChange={(e) => setInstallments(parseInt(e.target.value))}
                                            className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-bold dark:text-white"
                                        >
                                            <option value={1}>À vista</option>
                                            {[2, 3, 4, 6, 10, 12, 18, 24, 36].map(v => <option key={v} value={v}>{v}x</option>)}
                                        </select>
                                    </div>
                                </div>

                                <button
                                    onClick={handleSave}
                                    disabled={!item || !amount}
                                    className="w-full py-4 bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-300 text-white font-black rounded-2xl shadow-xl shadow-emerald-500/20 transition-all active:scale-95"
                                >
                                    GERAR SIMULAÇÃO
                                </button>
                            </Card>
                        ) : (
                            <Card className="p-8 space-y-6">
                                <div className="space-y-1">
                                    <h3 className="font-black text-slate-900 dark:text-white flex items-center gap-2">
                                        <Calculator size={20} className="text-emerald-500" /> Simular Conquista
                                    </h3>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Prepare-se para o grande passo</p>
                                </div>

                                <div className="grid grid-cols-2 gap-3 p-1.5 bg-slate-100 dark:bg-slate-800 rounded-2xl">
                                    <button
                                        onClick={() => setPatrimonyType('house')}
                                        className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-black transition-all ${patrimonyType === 'house' ? 'bg-white dark:bg-slate-700 text-emerald-600 shadow-sm' : 'text-slate-500'}`}
                                    >
                                        <Home size={16} /> IMÓVEL
                                    </button>
                                    <button
                                        onClick={() => setPatrimonyType('car')}
                                        className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-black transition-all ${patrimonyType === 'car' ? 'bg-white dark:bg-slate-700 text-emerald-600 shadow-sm' : 'text-slate-500'}`}
                                    >
                                        <Car size={16} /> VEÍCULO
                                    </button>
                                </div>

                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 mb-2 uppercase tracking-widest">Valor do Bem (R$)</label>
                                    <input
                                        type="number"
                                        value={patrimonyAmount}
                                        onChange={(e) => setPatrimonyAmount(e.target.value)}
                                        placeholder="Ex: 500000"
                                        className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-bold dark:text-white"
                                    />
                                </div>

                                <div>
                                    <div className="flex justify-between items-center mb-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Modelo de Pagamento</label>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                                        <button
                                            onClick={() => setPaymentModel('full')}
                                            className={`py-2 px-3 rounded-lg text-xs font-bold transition-all ${paymentModel === 'full' ? 'bg-white dark:bg-slate-700 text-emerald-600 shadow-sm' : 'text-slate-500'}`}
                                        >
                                            À VISTA
                                        </button>
                                        <button
                                            onClick={() => setPaymentModel('construction')}
                                            className={`py-2 px-3 rounded-lg text-xs font-bold transition-all ${paymentModel === 'construction' ? 'bg-white dark:bg-slate-700 text-emerald-600 shadow-sm' : 'text-slate-500'}`}
                                        >
                                            PARCELADO
                                        </button>
                                    </div>
                                </div>

                                {paymentModel === 'full' ? (
                                    <div>
                                        <div className="flex justify-between items-center mb-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Quanto você quer dar de entrada?</label>
                                            <span className="text-xs font-black text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-1 rounded-lg">{downPaymentPercent}%</span>
                                        </div>
                                        <input
                                            type="range"
                                            min="10"
                                            max="100"
                                            step="5"
                                            value={downPaymentPercent}
                                            onChange={(e) => setDownPaymentPercent(parseInt(e.target.value))}
                                            className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                                        />
                                    </div>
                                ) : (
                                    <div className="space-y-4 pt-2">
                                        <div>
                                            <label className="block text-[10px] font-black text-slate-400 mb-2 uppercase tracking-widest">Entrada Imediata (Sinal)</label>
                                            <input
                                                type="number"
                                                value={signalAmount}
                                                onChange={(e) => setSignalAmount(e.target.value)}
                                                placeholder="Ex: 50000"
                                                className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-bold dark:text-white"
                                            />
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-[10px] font-black text-slate-400 mb-2 uppercase tracking-widest">Meses Período Obras</label>
                                                <input
                                                    type="number"
                                                    value={installmentMonths}
                                                    onChange={(e) => setInstallmentMonths(e.target.value)}
                                                    placeholder="Ex: 24"
                                                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-bold dark:text-white"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-black text-slate-400 mb-2 uppercase tracking-widest">Mensalidade (R$)</label>
                                                <input
                                                    type="number"
                                                    value={patrimonyInstallment}
                                                    onChange={(e) => setPatrimonyInstallment(e.target.value)}
                                                    placeholder="Ex: 3000"
                                                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-bold dark:text-white"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <div className="pt-6 border-t border-slate-50 dark:border-slate-800">
                                    <div className="flex justify-between text-xs font-bold">
                                        <span className="text-slate-400">SALDO ATUAL</span>
                                        <span className="text-slate-900 dark:text-white">R$ {formatCurrency(data.currentBalance)}</span>
                                    </div>
                                    <div className="flex justify-between text-xs font-bold mt-3">
                                        <span className="text-slate-400">POUPANÇA MÉDIA</span>
                                        <span className="text-emerald-600">R$ {formatCurrency(data.averageSavings)}/mês</span>
                                    </div>
                                </div>
                            </Card>
                        )}
                    </div>

                    {/* Result Column */}
                    <div className="space-y-6">
                        {simulationResult ? (
                            mode === 'purchase' ? (
                                <div className="space-y-6 animate-in slide-in-from-right-4 duration-500">
                                    <Card className={`p-8 border-l-4 shadow-xl ${simulationResult.isRisk ? 'border-l-rose-500 bg-rose-50/50 dark:bg-rose-900/10' : 'border-l-emerald-500 bg-emerald-50/50 dark:bg-emerald-900/10'}`}>
                                        <div className="flex gap-4">
                                            <div className={`p-3 rounded-2xl ${simulationResult.isRisk ? 'bg-rose-100 text-rose-600' : 'bg-emerald-100 text-emerald-600'}`}>
                                                {simulationResult.isRisk ? <AlertTriangle size={28} /> : <CheckCircle2 size={28} />}
                                            </div>
                                            <div>
                                                <h4 className="font-black text-slate-900 dark:text-white text-lg">{simulationResult.isRisk ? 'Risco de Dívida' : 'Compra Segura'}</h4>
                                                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                                                    {simulationResult.isRisk
                                                        ? `Atenção: Seu saldo poderá ficar negativo em R$ ${formatCurrency(Math.abs(simulationResult.minBalance))}.`
                                                        : `Boa! O impacto nas suas economias é baixo e você se manterá no positivo.`}
                                                </p>
                                            </div>
                                        </div>
                                    </Card>

                                    <Card className="p-8">
                                        <h4 className="text-[10px] font-black text-slate-400 mb-8 uppercase tracking-widest">Projeção do Saldo (6 Meses)</h4>
                                        <div className="relative h-48 flex items-end justify-between px-2">
                                            <div className="absolute top-1/2 left-0 right-0 border-t border-slate-100 dark:border-slate-800 z-0"></div>
                                            {simulationResult.projection.map((p, idx) => (
                                                <div key={idx} className="flex flex-col items-center gap-3 group relative z-10 w-full">
                                                    <div
                                                        className={`w-10 rounded-xl transition-all duration-500 hover:scale-110 shadow-lg ${p.isNegative ? 'bg-rose-500 shadow-rose-200' : 'bg-emerald-500 shadow-emerald-200'}`}
                                                        style={{ height: `${Math.max(10, (Math.abs(p.balance) / simulationResult.totalRange) * 100)}%` }}
                                                    />
                                                    <span className="text-[10px] font-black text-slate-400">M{p.month}</span>
                                                    <div className="absolute -top-12 opacity-0 group-hover:opacity-100 bg-slate-900 text-white text-[10px] font-black px-3 py-1.5 rounded-xl transition-all whitespace-nowrap shadow-2xl scale-90 group-hover:scale-100">
                                                        R$ {formatCurrency(p.balance)}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </Card>
                                </div>
                            ) : (
                                <div className="space-y-6 animate-in slide-in-from-right-4 duration-500 h-full">
                                    {simulationResult.model === 'full' ? (
                                        <Card className="p-8 space-y-8 bg-gradient-to-br from-slate-900 to-slate-800 dark:from-slate-950 dark:to-slate-900 text-white border-none shadow-2xl h-full flex flex-col justify-center">
                                            <div className="text-center space-y-3">
                                                <h4 className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Tempo Estimado para Entrada</h4>
                                                <div className="text-6xl font-black text-white drop-shadow-lg">
                                                    {simulationResult.monthsToReach === Infinity ? '∞' : simulationResult.monthsToReach}
                                                    <span className="text-xl font-bold ml-2 text-emerald-500">meses</span>
                                                </div>
                                                <p className="text-xs text-slate-400 font-medium">Mantendo a economia de R$ {formatCurrency(data.averageSavings)}</p>
                                            </div>

                                            <div className="space-y-5 bg-white/5 p-6 rounded-3xl backdrop-blur-md border border-white/10">
                                                <div className="flex justify-between text-xs font-bold">
                                                    <span className="text-white/60 uppercase">Valor da Entrada</span>
                                                    <span className="text-white">R$ {formatCurrency(simulationResult.neededDownPayment)}</span>
                                                </div>
                                                <div className="flex justify-between text-xs font-bold">
                                                    <span className="text-white/60 uppercase">Quanto falta</span>
                                                    <span className="text-rose-400 font-black">R$ {formatCurrency(simulationResult.remaining)}</span>
                                                </div>
                                                <div className="relative w-full bg-white/10 h-3 rounded-full overflow-hidden">
                                                    <div
                                                        className="absolute inset-y-0 left-0 bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.5)] transition-all duration-1000"
                                                        style={{ width: `${Math.min(100, (data.currentBalance / (simulationResult.neededDownPayment || 1)) * 100)}%` }}
                                                    />
                                                </div>
                                            </div>

                                            <div className="p-5 bg-emerald-500/10 rounded-2xl border border-emerald-500/20 text-center">
                                                <p className="text-xs text-emerald-400 leading-relaxed font-bold">
                                                    💡 Se vocês subirem a economia para <span className="text-white">R$ {formatCurrency(data.averageSavings * 1.5)}</span>, o sonho chega em <span className="text-white underline">{Math.ceil(simulationResult.remaining / (data.averageSavings * 1.5 || 1))} meses</span>!
                                                </p>
                                            </div>
                                        </Card>
                                    ) : (
                                        <Card className="p-8 space-y-6 bg-gradient-to-br from-slate-900 to-slate-800 dark:from-slate-950 dark:to-slate-900 text-white border-none shadow-2xl h-full flex flex-col">
                                            <div className="text-center space-y-1">
                                                <h4 className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Análise de Viabilidade (Obras)</h4>
                                                <div className="text-3xl font-black text-white">Fluxo de Caixa</div>
                                            </div>

                                            <div className="grid grid-cols-2 gap-4">
                                                <div className={`p-4 rounded-2xl border ${simulationResult.canAffordSignal ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-rose-500/10 border-rose-500/20'}`}>
                                                    <p className="text-[10px] font-black text-white/40 uppercase mb-1">Sinal/Ato</p>
                                                    <div className="flex items-center gap-2">
                                                        <span className={`text-sm font-black ${simulationResult.canAffordSignal ? 'text-emerald-400' : 'text-rose-400'}`}>
                                                            {simulationResult.canAffordSignal ? 'POSSÍVEL' : 'INSUFICIENTE'}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className={`p-4 rounded-2xl border ${simulationResult.canAffordMonthly ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-rose-500/10 border-rose-500/20'}`}>
                                                    <p className="text-[10px] font-black text-white/40 uppercase mb-1">Mensais</p>
                                                    <div className="flex items-center gap-2">
                                                        <span className={`text-sm font-black ${simulationResult.canAffordMonthly ? 'text-emerald-400' : 'text-rose-400'}`}>
                                                            {simulationResult.canAffordMonthly ? 'CONFORTÁVEL' : 'PESADO'}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>

                                            {!simulationResult.canAffordMonthly && (
                                                <div className="p-4 bg-rose-500/20 border border-rose-500/30 rounded-2xl">
                                                    <p className="text-[10px] text-rose-300 font-bold leading-relaxed">
                                                        ❌ Suas economias mensais estão <span className="text-white">R$ {formatCurrency(simulationResult.savingsGap)}</span> abaixo do necessário para as parcelas da obra.
                                                    </p>
                                                </div>
                                            )}

                                            <div className="space-y-4 pt-4 border-t border-white/10">
                                                <div className="flex justify-between items-center">
                                                    <span className="text-xs font-bold text-white/60">Entrada Total</span>
                                                    <span className="text-sm font-black text-white">R$ {formatCurrency(simulationResult.totalDownPayment)}</span>
                                                </div>
                                                <div className="flex justify-between items-center">
                                                    <span className="text-xs font-bold text-white/60">Saldo Financiado</span>
                                                    <span className="text-sm font-black text-emerald-400">R$ {formatCurrency(simulationResult.totalFinanced)}</span>
                                                </div>
                                                <p className="text-[9px] text-white/40 italic text-center">* Simulação conservadora sem considerar reajustes de INCC/Cub.</p>
                                            </div>

                                            {simulationResult.canAffordMonthly && (
                                                <div className="mt-auto p-4 bg-emerald-500/20 border border-emerald-500/30 rounded-2xl text-center">
                                                    <p className="text-xs text-emerald-300 font-black">
                                                        🚀 Vocês conseguem manter o fluxo! Sobram R$ {formatCurrency(data.averageSavings - simulationResult.monthlyP)}/mês para lazer.
                                                    </p>
                                                </div>
                                            )}
                                        </Card>
                                    )}
                                </div>
                            )
                        ) : (
                            <div className="h-full min-h-[500px] border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-[2.5rem] flex flex-col items-center justify-center text-slate-400 p-12 text-center space-y-6">
                                <div className="p-6 bg-slate-50 dark:bg-slate-900 rounded-full animate-bounce">
                                    <Calculator size={48} className="opacity-20" />
                                </div>
                                <div className="space-y-2">
                                    <h4 className="font-black text-slate-900 dark:text-white">Aguardando Seus Planos</h4>
                                    <p className="text-sm font-medium">Preencha os dados ao lado para desbloquear a análise preditiva do Duoo.</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
        </div>
    );
};

export default Simulation;
