import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Calculator, ShoppingCart, CheckCircle, TrendingUp, History, AlertTriangle, Play, RefreshCw, Save } from 'lucide-react';
import api from '../services/api';
import Card from '../components/ui/Card';

const Simulation = () => {
    const { viewMode } = useOutletContext();
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState({ currentBalance: 0, averageSavings: 0, history: [] });

    // Form State
    const [item, setItem] = useState('');
    const [amount, setAmount] = useState('');
    const [installments, setInstallments] = useState(1);

    // Result State
    const [simulated, setSimulated] = useState(false);
    const [projection, setProjection] = useState([]);
    const [riskAnalysis, setRiskAnalysis] = useState(null); // 'safe', 'warning', 'danger'

    useEffect(() => {
        fetchSimulationData();
    }, [viewMode]);

    // Reactive Simulation
    useEffect(() => {
        if (amount && !isNaN(parseFloat(amount))) {
            handleSimulate();
        } else {
            setSimulated(false);
            setProjection([]);
            setRiskAnalysis(null);
        }
    }, [amount, installments, data.averageSavings]);

    const fetchSimulationData = async () => {
        setLoading(true);
        try {
            const res = await api.get('/simulation', { params: { viewMode } });
            setData(res.data);
        } catch (error) {
            console.error('Failed to fetch simulation data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSimulate = () => {
        if (!amount || isNaN(parseFloat(amount))) return;

        const purchaseAmount = parseFloat(amount);
        const monthlyInstallment = purchaseAmount / installments;
        const avgSavings = parseFloat(data.averageSavings);
        const startBalance = parseFloat(data.currentBalance);

        const newProjection = [];
        let minBalance = startBalance;

        for (let i = 1; i <= 6; i++) {
            // Balance logic: Start + (Savings * Months) - (Paid Installments)
            // Installments paid so far: min(i, installments) * monthlyInstallment
            const totalSavings = avgSavings * i;
            const totalPaid = Math.min(i, installments) * monthlyInstallment;

            const projectedBalance = startBalance + totalSavings - totalPaid;

            if (projectedBalance < minBalance) minBalance = projectedBalance;

            newProjection.push({
                month: `Mês ${i}`,
                balance: projectedBalance,
                installment: i <= installments ? monthlyInstallment : 0
            });
        }

        setProjection(newProjection);

        // Risk Analysis Logic
        if (minBalance < 0) {
            setRiskAnalysis('danger');
        } else if (monthlyInstallment > (avgSavings * 0.8)) {
            // If installment consumes more than 80% of average savings
            setRiskAnalysis('warning');
        } else {
            setRiskAnalysis('safe');
        }

        setSimulated(true);
    };

    const handleSave = async () => {
        if (!item || !simulated) return;
        try {
            await api.post('/simulation', {
                item_name: item,
                amount: parseFloat(amount),
                installments
            });
            // Refresh history
            fetchSimulationData();
            setItem('');
            setAmount('');
            setInstallments(1);
            alert('Simulação registrada com sucesso!');
        } catch (error) {
            console.error('Failed to save simulation:', error);
        }
    };

    const handleReset = () => {
        setItem('');
        setAmount('');
        setInstallments(1);
        setSimulated(false);
        setRiskAnalysis(null);
        setProjection([]);
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
            <div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">Simulador De Compra</h3>
                <p className="text-slate-500 dark:text-slate-400 mt-1">Bem-vindos de volta.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Form */}
                <Card className="p-6 h-full flex flex-col">
                    <h4 className="font-bold text-lg text-slate-800 dark:text-slate-100 mb-4">Planejar Nova Compra</h4>
                    <p className="text-sm text-slate-500 mb-6">Simule o impacto de uma compra futura no seu orçamento.</p>

                    <div className="space-y-4 flex-1">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">O que você quer comprar?</label>
                            <input
                                type="text"
                                value={item}
                                onChange={(e) => setItem(e.target.value)}
                                placeholder="Ex: Sofá novo, Viagem..."
                                className="w-full px-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all font-medium"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Qual o valor total? (R$)</label>
                            <input
                                type="number"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                placeholder="0.00"
                                className="w-full px-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all font-medium"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1" >Parcelado em quantos meses?</label>
                            <select
                                value={installments}
                                onChange={(e) => setInstallments(parseInt(e.target.value))}
                                className="w-full px-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all font-medium appearance-none"
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
                    </div>

                    <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800">
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-sm text-slate-500">Saldo Atual:</span>
                            <span className="font-bold text-slate-900 dark:text-white">R$ {parseFloat(data.currentBalance).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                        </div>
                        <div className="flex justify-between items-center mb-6">
                            <span className="text-sm text-slate-500">Economia Média Mensal:</span>
                            <span className={`font-bold ${data.averageSavings >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                {data.averageSavings >= 0 ? '+' : ''} R$ {parseFloat(data.averageSavings).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </span>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={handleSave}
                                disabled={!simulated || !item}
                                className={`flex-1 font-medium py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2 ${simulated && item
                                        ? 'bg-emerald-500 text-white hover:bg-emerald-600 shadow-lg shadow-emerald-500/20'
                                        : 'bg-slate-100 text-slate-400 cursor-not-allowed dark:bg-slate-800'
                                    }`}
                            >
                                <ShoppingCart size={18} /> Registrar Compra
                            </button>
                            <button
                                onClick={handleReset}
                                className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center justify-center gap-2"
                            >
                                <RefreshCw size={18} /> Nova Análise
                            </button>
                        </div>
                    </div>
                </Card>

                {/* Right Column: Risk Analysis */}
                <div className="flex flex-col h-full">
                    <h4 className="font-bold text-lg text-slate-800 dark:text-slate-100 mb-4">Análise de Risco</h4>

                    <div className="flex-1 bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 p-6">
                        {!simulated ? (
                            <div className="h-full flex flex-col items-center justify-center border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl p-8 text-center opacity-50">
                                <Calculator size={48} className="text-slate-400 mb-4" />
                                <p className="text-slate-500 font-medium max-w-[200px]">Preencha os dados ao lado para simular o impacto financeiro.</p>
                            </div>
                        ) : (
                            <div className="space-y-6 animate-in fade-in zoom-in duration-300">
                                {/* Status Card */}
                                <div className={`p-6 rounded-2xl flex items-start gap-4 ${riskAnalysis === 'safe' ? 'bg-emerald-50 dark:bg-emerald-900/10' :
                                        riskAnalysis === 'warning' ? 'bg-amber-50 dark:bg-amber-900/10' :
                                            'bg-rose-50 dark:bg-rose-900/10'
                                    }`}>
                                    <div className={`p-3 rounded-full shrink-0 ${riskAnalysis === 'safe' ? 'bg-emerald-100/50 dark:bg-emerald-800/30 text-emerald-600 dark:text-emerald-400' :
                                            riskAnalysis === 'warning' ? 'bg-amber-100/50 dark:bg-amber-800/30 text-amber-600 dark:text-amber-400' :
                                                'bg-rose-100/50 dark:bg-rose-800/30 text-rose-600 dark:text-rose-400'
                                        }`}>
                                        {riskAnalysis === 'safe' ? <CheckCircle size={28} /> : <AlertTriangle size={28} />}
                                    </div>
                                    <div>
                                        <h4 className={`font-bold text-lg mb-1 ${riskAnalysis === 'safe' ? 'text-emerald-700 dark:text-emerald-300' :
                                                riskAnalysis === 'warning' ? 'text-amber-700 dark:text-amber-300' :
                                                    'text-rose-700 dark:text-rose-300'
                                            }`}>
                                            {riskAnalysis === 'safe' ? 'Compra Segura!' :
                                                riskAnalysis === 'warning' ? 'Atenção ao Orçamento' :
                                                    'Alto Risco Financeiro'}
                                        </h4>
                                        <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                                            {riskAnalysis === 'safe' ? `Com base na sua economia mensal, você conseguirá pagar esta compra sem ficar no negativo.` :
                                                riskAnalysis === 'warning' ? 'Esta compra comprometerá grande parte da sua economia mensal. Considere aumentar as parcelas.' :
                                                    'Esta compra fará seu saldo ficar negativo baseado na projeção atual. Não recomendada.'}
                                        </p>
                                    </div>
                                </div>

                                {/* Chart Card */}
                                <div className="bg-white dark:bg-slate-900">
                                    <h5 className="font-bold text-slate-800 dark:text-slate-100 mb-6">Projeção do Saldo (Próximos 6 meses)</h5>
                                    <div className="h-64 w-full">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={projection} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                                                <XAxis
                                                    dataKey="month"
                                                    axisLine={false}
                                                    tickLine={false}
                                                    tick={{ fill: '#94A3B8', fontSize: 11 }}
                                                    dy={10}
                                                />
                                                <YAxis
                                                    axisLine={false}
                                                    tickLine={false}
                                                    tick={{ fill: '#94A3B8', fontSize: 11 }}
                                                    tickFormatter={(value) => `${value / 1000}k`}
                                                />
                                                <Tooltip
                                                    cursor={{ fill: '#F1F5F9' }}
                                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', padding: '12px' }}
                                                    formatter={(value) => [`R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 'Saldo Projetado']}
                                                />
                                                <Bar dataKey="balance" radius={[6, 6, 0, 0]} barSize={40}>
                                                    {projection.map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={entry.balance >= 0 ? '#10B981' : '#EF4444'} />
                                                    ))}
                                                </Bar>
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                    <p className="text-xs text-center text-slate-400 mt-4 border-t border-slate-100 dark:border-slate-800 pt-4 border-dashed">
                                        Considerando parcela de R$ {(parseFloat(amount) / installments).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} e economia média de R$ {parseFloat(data.averageSavings).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* History Table */}
            <Card className="p-6">
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-600 dark:text-slate-400">
                        <History size={20} />
                    </div>
                    <h4 className="font-bold text-lg text-slate-800 dark:text-slate-100">Histórico de Simulações Confirmadas</h4>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b border-slate-100 dark:border-slate-800">
                                <th className="pb-3 text-xs font-bold text-slate-400 uppercase tracking-wider">Data</th>
                                <th className="pb-3 text-xs font-bold text-slate-400 uppercase tracking-wider">Item</th>
                                <th className="pb-3 text-xs font-bold text-slate-400 uppercase tracking-wider text-center">Parcelas</th>
                                <th className="pb-3 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Valor Total</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 text-slate-600 dark:text-slate-400">
                            {data.history.length > 0 ? (
                                data.history.map((sim) => (
                                    <tr key={sim.id} className="group hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                        <td className="py-3 text-sm">
                                            {new Date(sim.date).toLocaleDateString('pt-BR')}
                                        </td>
                                        <td className="py-3 text-sm font-medium text-slate-900 dark:text-white">
                                            {sim.item_name}
                                        </td>
                                        <td className="py-3 text-sm text-center">
                                            <span className="bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded text-xs font-semibold">
                                                {sim.installments}x
                                            </span>
                                        </td>
                                        <td className="py-3 text-sm text-right font-medium">
                                            R$ {parseFloat(sim.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="4" className="py-8 text-center text-slate-400 text-sm">
                                        Nenhuma simulação registrada no histórico.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
};

export default Simulation;
