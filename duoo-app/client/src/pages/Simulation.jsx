import React, { useState, useEffect, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Calculator, ShoppingCart, CheckCircle2, AlertTriangle, RefreshCw, Receipt, History as HistoryIcon } from 'lucide-react';
import api from '../services/api';
import Card from '../components/ui/Card';
import Toast from '../components/ui/Toast';

const Simulation = () => {
    // Context
    const outletContext = useOutletContext();
    const viewMode = outletContext?.viewMode || 'joint';

    const [loading, setLoading] = useState(true);
    const [data, setData] = useState({
        currentBalance: 0,
        averageSavings: 0,
        history: []
    });

    // Form State
    const [item, setItem] = useState('');
    const [amount, setAmount] = useState('');
    const [installments, setInstallments] = useState(1);
    const [toast, setToast] = useState(null);

    useEffect(() => {
        fetchSimulationData();
    }, [viewMode]);

    const fetchSimulationData = async () => {
        setLoading(true);
        try {
            console.log('Fetching simulation data for viewMode:', viewMode);
            const res = await api.get('/simulation', { params: { viewMode } });
            console.log('Simulation data received:', res.data);

            // Ensure data types are numbers
            setData({
                currentBalance: parseFloat(res.data.currentBalance || 0),
                averageSavings: parseFloat(res.data.averageSavings || 0),
                history: Array.isArray(res.data.history) ? res.data.history : []
            });
        } catch (error) {
            console.error('Failed to fetch simulation data:', error);
            // Non-blocking error, set defaults
            setData({ currentBalance: 0, averageSavings: 0, history: [] });
        } finally {
            setLoading(false);
        }
    };

    const simulationResult = useMemo(() => {
        const cost = parseFloat(amount);
        const months = parseInt(installments) || 1;

        // Validações básicas antes de calcular
        if (!amount || isNaN(cost) || cost <= 0) return null;

        const monthlyCost = cost / months;
        const monthlySurplus = parseFloat(data.averageSavings || 0);
        let startBalance = parseFloat(data.currentBalance || 0);

        const projection = [];
        let isRisk = false;

        let currentLoopBalance = startBalance;
        let balances = [startBalance];

        for (let i = 1; i <= 6; i++) {
            // Lógica: Saldo Anterior + Economia Mensal - Parcela (se houver)
            currentLoopBalance += monthlySurplus;
            if (i <= months) {
                currentLoopBalance -= monthlyCost;
            }

            if (currentLoopBalance < 0) isRisk = true;

            balances.push(currentLoopBalance);

            projection.push({
                month: i,
                balance: currentLoopBalance,
                isNegative: currentLoopBalance < 0
            });
        }

        const minVal = Math.min(...balances, 0);
        const maxVal = Math.max(...balances, 0);
        const padding = (Math.abs(maxVal - minVal) * 0.1) || 100; // Evitar range zero
        const chartMin = minVal - padding;
        const chartMax = maxVal + padding;
        const totalRange = chartMax - chartMin || 1; // Evitar divisão por zero

        return {
            isRisk,
            projection,
            monthlySurplus,
            monthlyCost,
            minBalance: Math.min(...balances),
            chartMin,
            chartMax,
            totalRange
        };
    }, [amount, installments, data]);

    const handleSave = async () => {
        if (!item || !amount) return;
        try {
            await api.post('/simulation', {
                item_name: item,
                amount: parseFloat(amount),
                installments
            });
            await fetchSimulationData(); // Refresh data to update history
            handleReset();
            setToast({ message: 'Simulação registrada com sucesso!', type: 'success' });
        } catch (error) {
            console.error('Failed to save simulation:', error);
            setToast({ message: 'Erro ao registrar simulação. Tente novamente.', type: 'error' });
        }
    };

    const handleReset = () => {
        setItem('');
        setAmount('');
        setInstallments(1);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center p-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
            </div>
        );
    }

    // Helper para formatação de moeda
    const formatCurrency = (val) => {
        return (parseFloat(val) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="max-w-4xl mx-auto space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Form Column */}
                    <div className="space-y-6">
                        <div className="space-y-2">
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Planejar Nova Compra</h3>
                            <p className="text-slate-500 text-sm">Simule o impacto de uma compra futura no seu orçamento.</p>
                        </div>

                        <Card className="space-y-5 p-6 h-fit">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">O que você quer comprar?</label>
                                <input
                                    type="text"
                                    value={item}
                                    onChange={(e) => setItem(e.target.value)}
                                    placeholder="Ex: Sofá novo, Viagem..."
                                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium dark:text-white transition-all"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Qual o valor total? (R$)</label>
                                <input
                                    type="number"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    placeholder="0.00"
                                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium dark:text-white transition-all"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Parcelado em quantos meses?</label>
                                <select
                                    value={installments}
                                    onChange={(e) => setInstallments(parseInt(e.target.value))}
                                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium dark:text-white transition-all appearance-none"
                                >
                                    <option value={1}>1x (À vista)</option>
                                    {[...Array(11)].map((_, i) => (
                                        <option key={i + 2} value={i + 2}>{i + 2}x</option>
                                    ))}
                                    <option value={18}>18x</option>
                                    <option value={24}>24x</option>
                                    <option value={36}>36x</option>
                                </select>
                            </div>

                            <div className="pt-6 border-t border-slate-100 dark:border-slate-800 space-y-4">
                                <div className="flex justify-between text-sm items-center">
                                    <span className="text-slate-500">Saldo Atual:</span>
                                    <span className="font-bold text-slate-900 dark:text-white text-lg">R$ {formatCurrency(data.currentBalance)}</span>
                                </div>
                                <div className="flex justify-between text-sm items-center">
                                    <span className="text-slate-500">Economia Média Mensal:</span>
                                    <span className={`font-bold ${data.averageSavings >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                        {data.averageSavings >= 0 ? '+' : ''} R$ {formatCurrency(data.averageSavings)}
                                    </span>
                                </div>

                                <div className="flex gap-3 mt-6">
                                    <button
                                        onClick={handleSave}
                                        disabled={!item || !amount || !simulationResult}
                                        className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold text-white transition-all ${(!item || !amount) ? 'bg-slate-300 dark:bg-slate-700 cursor-not-allowed' : 'bg-emerald-500 hover:bg-emerald-600 shadow-lg shadow-emerald-500/20 active:scale-95'}`}
                                    >
                                        <ShoppingCart size={18} /> Registrar Compra
                                    </button>
                                    <button
                                        onClick={handleReset}
                                        className="flex items-center justify-center gap-2 px-4 py-3 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors active:scale-95"
                                        title="Limpar campos"
                                    >
                                        <RefreshCw size={18} />
                                    </button>
                                </div>
                            </div>
                        </Card>
                    </div>

                    {/* Result Column */}
                    <div className="space-y-6">
                        <div className="space-y-2">
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Análise de Risco</h3>
                            <p className="text-slate-500 text-sm opacity-0">Placeholder</p> {/* Spacer to align headers */}
                        </div>

                        {simulationResult ? (
                            <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
                                <Card className={`border-l-4 p-6 ${simulationResult.isRisk ? 'border-l-rose-500 bg-rose-50/50 dark:bg-rose-900/10' : 'border-l-emerald-500 bg-emerald-50/50 dark:bg-emerald-900/10'}`}>
                                    <div className="flex items-start gap-4">
                                        <div className={`p-3 rounded-full shrink-0 ${simulationResult.isRisk ? 'bg-rose-100 text-rose-600' : 'bg-emerald-100 text-emerald-600'}`}>
                                            {simulationResult.isRisk ? <AlertTriangle size={24} /> : <CheckCircle2 size={24} />}
                                        </div>
                                        <div>
                                            <h4 className={`font-bold text-lg ${simulationResult.isRisk ? 'text-rose-700 dark:text-rose-300' : 'text-emerald-700 dark:text-emerald-300'}`}>
                                                {simulationResult.isRisk ? 'Cuidado! Risco de Dívida' : 'Compra Segura!'}
                                            </h4>
                                            <p className="text-slate-600 dark:text-slate-400 text-sm mt-1 leading-relaxed">
                                                {simulationResult.isRisk
                                                    ? `Esta compra pode deixar sua conta no vermelho. O saldo mínimo projetado é de R$ ${formatCurrency(simulationResult.minBalance)}.`
                                                    : `Com base na sua economia mensal, você conseguirá pagar esta compra sem ficar no negativo.`}
                                            </p>
                                        </div>
                                    </div>
                                </Card>

                                <Card className="p-6">
                                    <h4 className="font-bold text-sm mb-6 text-slate-800 dark:text-slate-200">Projeção do Saldo (Próximos 6 meses)</h4>

                                    <div className="relative h-64 w-full mt-4">
                                        {(() => {
                                            const zeroPos = ((0 - simulationResult.chartMin) / simulationResult.totalRange) * 100;
                                            return (
                                                <div
                                                    className="absolute w-full border-t-2 border-slate-300 dark:border-slate-600 border-dashed z-0 flex items-center transition-all duration-500"
                                                    style={{ bottom: `${Math.max(0, Math.min(100, zeroPos))}%` }}
                                                >
                                                    <span className="absolute right-0 -top-6 text-[10px] font-bold text-slate-400 bg-white dark:bg-slate-900 px-1">R$ 0</span>
                                                </div>
                                            );
                                        })()}

                                        <div className="absolute inset-0 flex items-end justify-between gap-2 px-2 z-10">
                                            {simulationResult.projection.map((monthData, idx) => {
                                                const height = (Math.abs(monthData.balance) / simulationResult.totalRange) * 100;
                                                const zeroPos = ((0 - simulationResult.chartMin) / simulationResult.totalRange) * 100;
                                                const bottomPos = monthData.balance >= 0 ? zeroPos : zeroPos - height;

                                                return (
                                                    <div key={idx} className="relative w-full h-full flex flex-col justify-end group">
                                                        <div
                                                            className={`absolute w-full rounded-md transition-all duration-500 mx-auto left-0 right-0 max-w-[40px] ${monthData.isNegative ? 'bg-rose-500 shadow-rose-200' : 'bg-emerald-500 shadow-emerald-200'} shadow-sm`}
                                                            style={{
                                                                height: `${Math.max(height, 2)}%`, // Mínimo de 2% para visibilidade
                                                                bottom: `${Math.max(0, Math.min(98, bottomPos))}%`
                                                            }}
                                                        >
                                                            <div className={`absolute left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] py-1 px-2 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none z-20 shadow-lg ${monthData.balance >= 0 ? '-top-10' : '-bottom-10'}`}>
                                                                R$ {formatCurrency(monthData.balance)}
                                                                <div className={`absolute left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-800 rotate-45 ${monthData.balance >= 0 ? '-bottom-1' : '-top-1'}`}></div>
                                                            </div>
                                                        </div>

                                                        <div className="absolute -bottom-6 w-full text-center">
                                                            <span className="text-[10px] text-slate-400 font-medium whitespace-nowrap">Mês {monthData.month}</span>
                                                        </div>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    </div>

                                    <div className="mt-8 pt-4 border-t border-slate-50 dark:border-slate-800 text-xs text-slate-500 text-center">
                                        Considerando parcela de <span className="font-bold text-slate-700 dark:text-slate-300">R$ {formatCurrency(simulationResult.monthlyCost)}</span> e economia mensal de <span className="font-bold text-slate-700 dark:text-slate-300">R$ {formatCurrency(simulationResult.monthlySurplus)}</span>
                                    </div>
                                </Card>
                            </div>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center p-8 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl text-slate-400 min-h-[400px]">
                                <Calculator size={48} className="mb-4 opacity-50" />
                                <p className="text-center font-medium max-w-[200px]">Preencha os dados ao lado para simular o impacto financeiro.</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* History Table */}
                <Card className="p-6">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2.5 bg-slate-100 dark:bg-slate-800 rounded-xl text-slate-600 dark:text-slate-400">
                            <Receipt size={20} />
                        </div>
                        <div>
                            <h3 className="font-bold text-lg text-slate-900 dark:text-white">Histórico de Simulações</h3>
                            <p className="text-xs text-slate-500">Compras planejadas anteriormente.</p>
                        </div>
                    </div>

                    <div className="overflow-x-auto rounded-xl border border-slate-100 dark:border-slate-800">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-slate-500 uppercase bg-slate-50/80 dark:bg-slate-800/50">
                                <tr>
                                    <th className="px-6 py-4 font-bold">Data</th>
                                    <th className="px-6 py-4 font-bold">Item</th>
                                    <th className="px-6 py-4 font-bold text-center">Parcelas</th>
                                    <th className="px-6 py-4 font-bold text-right">Valor Total</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-900">
                                {data.history.length > 0 ? (
                                    data.history.map((sim) => (
                                        <tr key={sim.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
                                            <td className="px-6 py-4">{new Date(sim.date).toLocaleDateString('pt-BR')}</td>
                                            <td className="px-6 py-4 font-medium text-slate-900 dark:text-white group-hover:text-emerald-600 transition-colors">{sim.item_name}</td>
                                            <td className="px-6 py-4 text-center">
                                                <span className="px-2 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-xs font-semibold">{sim.installments}x</span>
                                            </td>
                                            <td className="px-6 py-4 text-right font-bold text-slate-900 dark:text-white">
                                                R$ {parseFloat(sim.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="4" className="px-6 py-12 text-center text-slate-400">
                                            <div className="flex flex-col items-center gap-2">
                                                <HistoryIcon size={24} className="opacity-20" />
                                                <span>Nenhuma simulação registrada no histórico.</span>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </Card>
            </div>
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

export default Simulation;
