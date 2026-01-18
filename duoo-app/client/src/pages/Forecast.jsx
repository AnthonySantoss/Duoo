import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { Wallet, TrendingUp, TrendingDown, AlertCircle, ShoppingBag, Zap, Activity, Calendar, Users } from 'lucide-react';
import api from '../services/api';
import Card from '../components/ui/Card';
import ProgressBar from '../components/ui/ProgressBar';

const Forecast = () => {
    const { viewMode } = useOutletContext();
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchStats();
    }, [viewMode]);

    const fetchStats = async () => {
        setLoading(true);
        try {
            const res = await api.get('/stats', { params: { viewMode } });
            setStats(res.data);
        } catch (error) {
            console.error('Failed to fetch stats:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
            </div>
        );
    }

    // Colors for charts
    const COLORS = ['#820AD1', '#0055FF', '#FF7A00', '#00D1FF', '#FF0055'];

    // Helper to get icon based on insight type or title
    const getInsightIcon = (insight) => {
        if (insight.title === 'Maior Impacto') return <ShoppingBag size={16} />;
        if (insight.title === 'Padrão Semanal') return <Calendar size={16} />;
        if (insight.type === 'warning') return <AlertCircle size={16} />;
        if (insight.type === 'info') return <Zap size={16} />;
        return <Activity size={16} />;
    };

    return (
        <div className="space-y-6">
            <div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">Análise Estatística</h3>
                <p className="text-slate-500 dark:text-slate-400 mt-1">Visão completa dos seus hábitos financeiros.</p>
            </div>

            {/* Fluxo de Caixa Chart */}
            <Card className="p-6">
                <div className="flex items-center justify-between mb-6">
                    <h4 className="font-bold text-lg text-slate-800 dark:text-slate-100">Fluxo de Caixa Semestral</h4>
                    <div className="flex gap-4 text-xs font-semibold">
                        <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Receitas
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-slate-300 dark:bg-slate-600"></span> Despesas
                        </div>
                    </div>
                </div>
                <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={stats?.monthly_flow || []}>
                            <defs>
                                <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.1} />
                                    <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                                </linearGradient>
                                <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#CBD5E1" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#CBD5E1" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                            <XAxis
                                dataKey="month"
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: '#94A3B8', fontSize: 12 }}
                                dy={10}
                            />
                            <YAxis
                                hide={true}
                            />
                            <Tooltip
                                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                            />
                            <Area
                                type="monotone"
                                dataKey="income"
                                stroke="#10B981"
                                strokeWidth={3}
                                fillOpacity={1}
                                fill="url(#colorIncome)"
                            />
                            <Area
                                type="monotone"
                                dataKey="expense"
                                stroke="#94A3B8"
                                strokeWidth={3}
                                fillOpacity={1}
                                fill="url(#colorExpense)"
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Onde o dinheiro vai? */}
                <Card className="h-full">
                    <h4 className="font-bold text-lg text-slate-800 dark:text-slate-100 mb-6">Onde o dinheiro vai?</h4>
                    <div className="space-y-6">
                        {stats?.category_breakdown?.slice(0, 5).map((cat, index) => (
                            <div key={index}>
                                <div className="flex justify-between text-xs font-bold mb-1">
                                    <span className="flex items-center gap-2 text-slate-700 dark:text-slate-300 capitalize">
                                        {/* Icons mapping could be better, simplified here */}
                                        <ShoppingBag size={14} className="text-slate-400" />
                                        {cat.category}
                                    </span>
                                    <div className="text-right">
                                        <div className="text-slate-900 dark:text-white">R$ {parseFloat(cat.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                                    </div>
                                </div>
                                <ProgressBar
                                    progress={cat.percentage}
                                    colorClass={index % 2 === 0 ? "bg-rose-200 text-rose-600" : "bg-orange-200 text-orange-600"} // Simplified color logic
                                    height="h-2"
                                />
                                <div className="text-right mt-1">
                                    <span className="text-[10px] text-slate-500">{cat.percentage.toFixed(1)}%</span>
                                </div>
                            </div>
                        ))}
                        {stats?.category_breakdown?.length === 0 && (
                            <p className="text-center text-slate-500 py-4">Nenhuma despesa registrada neste período.</p>
                        )}
                    </div>
                </Card>

                {/* Contribuição + Insights */}
                <div className="space-y-6">
                    {/* Contribuição */}
                    <Card>
                        <div className="flex items-center justify-between mb-4">
                            <h4 className="font-bold text-lg text-slate-800 dark:text-slate-100">Contribuição de Gastos</h4>
                            <button className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400">
                                <Users size={18} />
                            </button>
                        </div>

                        <div className="flex items-center justify-center py-4">
                            <div className="relative w-40 h-40">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={stats?.user_contribution || []}
                                            innerRadius={60}
                                            outerRadius={80}
                                            paddingAngle={5}
                                            dataKey="amount"
                                        >
                                            {stats?.user_contribution?.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={index === 0 ? '#3B82F6' : '#A855F7'} />
                                            ))}
                                        </Pie>
                                    </PieChart>
                                </ResponsiveContainer>
                                <div className="absolute inset-0 flex flex-col items-center justify-center">
                                    <span className="text-[10px] uppercase font-bold text-slate-400">Total</span>
                                    <span className="text-md font-bold text-slate-900 dark:text-white">
                                        R$ {parseFloat(stats?.total_expenses || 0).toLocaleString('pt-BR', { notation: "compact" })}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-3 mt-4">
                            {stats?.user_contribution?.map((user, index) => (
                                <div key={index} className={`p-3 rounded-xl flex justify-between items-center ${index === 0 ? 'bg-blue-50 dark:bg-blue-900/10' : 'bg-purple-50 dark:bg-purple-900/10'}`}>
                                    <div className="flex items-center gap-3">
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs ${index === 0 ? 'bg-blue-500' : 'bg-purple-500'}`}>
                                            {user.name.charAt(0)}
                                        </div>
                                        <div>
                                            <p className="font-bold text-sm text-slate-900 dark:text-white">{user.name}</p>
                                            <p className="text-xs text-slate-500">{user.percentage.toFixed(1)}% do total</p>
                                        </div>
                                    </div>
                                    <span className={`font-bold text-sm ${index === 0 ? 'text-blue-600' : 'text-purple-600'}`}>
                                        R$ {parseFloat(user.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </span>
                                </div>
                            ))}
                        </div>

                        {/* Analysis Warning */}
                        {stats?.user_contribution?.length > 1 && (
                            <div className="mt-4 p-3 bg-orange-50 dark:bg-orange-900/10 rounded-xl flex gap-3">
                                <AlertCircle size={16} className="text-orange-500 mt-0.5 shrink-0" />
                                <div>
                                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200">ANÁLISE DE EQUILÍBRIO</p>
                                    <p className="text-xs text-slate-500 mt-0.5">
                                        {/* Simple mock logic for balance */}
                                        Houve uma diferença de contribuição. Considere um ajuste para equilibrar.
                                    </p>
                                </div>
                            </div>
                        )}
                    </Card>

                    {/* Insights Widget */}
                    <div className="bg-slate-900 dark:bg-black rounded-3xl p-6 text-white shadow-xl shadow-slate-900/10">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center text-indigo-400">
                                <TrendingUp size={20} />
                            </div>
                            <div>
                                <h4 className="font-bold">Insights Inteligentes</h4>
                                <p className="text-xs text-slate-400">Análise baseada nos seus movimentos recentes.</p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            {stats?.insights?.map((insight, index) => (
                                <div key={index} className="p-4 bg-white/5 rounded-2xl border border-white/5 hover:bg-white/10 transition-colors">
                                    <div className="flex gap-3">
                                        <div className={`p-1.5 rounded-lg h-fit ${insight.type === 'warning' ? 'bg-rose-500/20 text-rose-400' : insight.type === 'info' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>
                                            {getInsightIcon(insight)}
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-bold uppercase tracking-wider opacity-70 mb-1">{insight.title}</p>
                                            <p className="text-sm font-medium leading-relaxed">{insight.message}</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {(!stats?.insights || stats.insights.length === 0) && (
                                <p className="text-slate-500 text-sm text-center">Nenhum insight disponível no momento.</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Forecast;
