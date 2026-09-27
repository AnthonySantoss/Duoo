import React, { useEffect, useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import Chart from 'react-apexcharts';
import { Activity, AlertCircle, ArrowDownRight, ArrowUpRight, Calendar, ShoppingBag, Sparkles, Users, Wallet } from 'lucide-react';
import api from '../services/api';
import Card from '../components/ui/Card';

const money = (value) => `R$ ${(Number(value) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const palette = ['#10b981', '#2563eb', '#f59e0b', '#8b5cf6', '#f43f5e', '#06b6d4'];

const ForecastRedesigned = () => {
    const { viewMode } = useOutletContext() || {};
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let active = true;
        setLoading(true);
        api.get('/stats', { params: { viewMode: viewMode || 'joint' } })
            .then(({ data }) => active && setStats(data))
            .catch((error) => console.error('Failed to fetch stats:', error))
            .finally(() => active && setLoading(false));
        return () => { active = false; };
    }, [viewMode]);

    const flow = stats?.monthly_flow || [];
    const categories = stats?.category_breakdown || [];
    const contribution = stats?.user_contribution || [];
    const totals = useMemo(() => {
        const income = flow.reduce((sum, item) => sum + Number(item.income || 0), 0);
        const expense = flow.reduce((sum, item) => sum + Number(item.expense || 0), 0) || Number(stats?.total_expenses || 0);
        return { income, expense, result: income - expense };
    }, [flow, stats]);

    const flowOptions = {
        chart: { toolbar: { show: false }, fontFamily: 'Inter, sans-serif', zoom: { enabled: false } },
        colors: ['#10b981', '#94a3b8'],
        stroke: { curve: 'smooth', width: 3 },
        fill: { type: 'gradient', gradient: { opacityFrom: 0.25, opacityTo: 0.02 } },
        dataLabels: { enabled: false },
        grid: { borderColor: '#e2e8f0', strokeDashArray: 4 },
        xaxis: { categories: flow.map((item) => item.month), labels: { style: { colors: '#94a3b8' } }, axisBorder: { show: false }, axisTicks: { show: false } },
        yaxis: { labels: { formatter: (value) => `R$ ${Math.round(value / 1000)}k`, style: { colors: '#94a3b8' } } },
        tooltip: { y: { formatter: (value) => money(value) } },
        legend: { show: false }
    };
    const categoryOptions = {
        chart: { toolbar: { show: false } }, colors: palette, labels: categories.map((item) => item.category),
        legend: { show: false }, dataLabels: { enabled: false }, stroke: { width: 3, colors: ['#fff'] },
        plotOptions: { pie: { donut: { size: '72%', labels: { show: true, total: { show: true, label: 'Total', formatter: () => money(totals.expense) } } } } },
        tooltip: { y: { formatter: (value) => money(value) } }
    };
    const contributionOptions = { chart: { toolbar: { show: false } }, colors: ['#2563eb', '#8b5cf6'], labels: contribution.map((item) => item.name || item.user || 'Pessoa'), legend: { show: false }, dataLabels: { enabled: false }, stroke: { width: 3, colors: ['#fff'] }, plotOptions: { pie: { donut: { size: '70%' } } }, tooltip: { y: { formatter: (value) => money(value) } } };

    if (loading) return <div className="flex h-64 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-b-2 border-emerald-500" /></div>;

    return (
        <div className="space-y-6 pb-8">
            <header className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
                <div><p className="mb-1 text-sm font-semibold text-emerald-600">Visão do casal</p><h1 className="text-2xl font-semibold tracking-tight text-slate-950 dark:text-white">Estatísticas</h1><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Entendam juntos para onde o dinheiro está indo.</p></div>
                <div className="flex items-center gap-2 rounded-full bg-white px-3 py-2 text-xs font-medium text-slate-500 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800"><Calendar size={15} /> Últimos 6 meses</div>
            </header>

            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                {[['Gastos no período', totals.expense, ArrowDownRight, 'text-rose-500'], ['Receitas no período', totals.income, ArrowUpRight, 'text-emerald-500'], ['Resultado', totals.result, Wallet, totals.result >= 0 ? 'text-emerald-500' : 'text-rose-500'], ['Maior categoria', categories[0]?.category || 'Sem dados', ShoppingBag, 'text-blue-500']].map(([label, value, Icon, color]) => <Card key={label} className="p-4 sm:p-5"><div className="mb-4 flex items-center justify-between"><span className="text-xs font-medium text-slate-500">{label}</span><Icon size={17} className={color} /></div><p className="truncate text-lg font-semibold text-slate-950 dark:text-white">{typeof value === 'number' ? money(value) : value}</p></Card>)}
            </div>

            <Card className="p-4 sm:p-6"><div className="mb-6 flex items-center justify-between"><div><h2 className="text-base font-semibold text-slate-950 dark:text-white">Fluxo de caixa</h2><p className="mt-1 text-xs text-slate-500">Receitas e despesas mês a mês</p></div><div className="flex gap-4 text-xs text-slate-500"><span><i className="mr-1 inline-block h-2 w-2 rounded-full bg-emerald-500" />Receitas</span><span><i className="mr-1 inline-block h-2 w-2 rounded-full bg-slate-400" />Despesas</span></div></div>{flow.length ? <Chart options={flowOptions} series={[{ name: 'Receitas', data: flow.map((item) => Number(item.income || 0)) }, { name: 'Despesas', data: flow.map((item) => Number(item.expense || 0)) }]} type="area" height={300} /> : <EmptyState text="Ainda não há dados suficientes para o fluxo de caixa." />}</Card>

            <div className="grid gap-6 lg:grid-cols-[1.1fr_.9fr]">
                <Card className="p-4 sm:p-6"><div className="mb-6"><h2 className="text-base font-semibold text-slate-950 dark:text-white">Onde o dinheiro vai</h2><p className="mt-1 text-xs text-slate-500">Categorias que mais impactaram o período</p></div>{categories.length ? <div className="grid items-center gap-6 sm:grid-cols-[180px_1fr]"><Chart options={categoryOptions} series={categories.map((item) => Number(item.amount || 0))} type="donut" height={190} /><div className="space-y-3">{categories.slice(0, 6).map((item, index) => <div key={`${item.category}-${index}`} className="flex items-center justify-between gap-3 text-sm"><span className="flex min-w-0 items-center gap-2 text-slate-600 dark:text-slate-300"><i className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: palette[index % palette.length] }} /> <span className="truncate capitalize">{item.category}</span></span><span className="font-semibold text-slate-900 dark:text-white">{money(item.amount)}</span></div>)}</div></div> : <EmptyState text="Registre algumas despesas para visualizar as categorias." />}</Card>
                <Card className="p-4 sm:p-6"><div className="mb-6 flex items-start justify-between"><div><h2 className="text-base font-semibold text-slate-950 dark:text-white">Participação do casal</h2><p className="mt-1 text-xs text-slate-500">Distribuição das despesas conjuntas</p></div><Users size={18} className="text-slate-400" /></div>{contribution.length ? <div className="grid items-center gap-5 sm:grid-cols-[150px_1fr]"><Chart options={contributionOptions} series={contribution.map((item) => Number(item.amount || 0))} type="donut" height={160} /><div className="space-y-4">{contribution.map((item, index) => <div key={item.name || index}><div className="mb-1 flex justify-between text-xs"><span className="text-slate-500">{item.name || item.user || `Pessoa ${index + 1}`}</span><strong className="text-slate-900 dark:text-white">{money(item.amount)}</strong></div><div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"><div className="h-full rounded-full" style={{ width: `${Number(item.percentage || 0)}%`, backgroundColor: contributionOptions.colors[index] }} /></div></div>)}</div></div> : <EmptyState text="A participação aparece quando houver despesas no período." />}</Card>
            </div>

            {!!stats?.insights?.length && <Card className="border-emerald-100 bg-emerald-50/60 p-4 dark:border-emerald-900/40 dark:bg-emerald-950/20 sm:p-6"><div className="mb-4 flex items-center gap-2"><Sparkles size={18} className="text-emerald-600" /><h2 className="text-base font-semibold text-slate-950 dark:text-white">Leituras do Duoo</h2></div><div className="grid gap-3 md:grid-cols-2">{stats.insights.map((insight, index) => <div key={index} className="rounded-2xl bg-white/80 p-4 dark:bg-slate-900/70"><div className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-white">{insight.type === 'warning' ? <AlertCircle size={16} className="text-amber-500" /> : <Activity size={16} className="text-emerald-500" />}{insight.title}</div><p className="text-sm leading-relaxed text-slate-500">{insight.message}</p></div>)}</div></Card>}
        </div>
    );
};

const EmptyState = ({ text }) => <div className="flex min-h-[180px] items-center justify-center text-center text-sm text-slate-400">{text}</div>;
export default ForecastRedesigned;
