import React, { useState, useMemo } from 'react';
import { Coins, Target } from 'lucide-react';
import Card from '../components/ui/Card';

const EconomyForecast = () => {
    // State
    const [forecastAmount, setForecastAmount] = useState('10');
    const [forecastFreq, setForecastFreq] = useState('daily'); // 'daily' or 'monthly'
    const [forecastRate, setForecastRate] = useState('0.85');

    // Calculation Logic
    const forecastResults = useMemo(() => {
        const amount = parseFloat(forecastAmount) || 0;
        const rate = (parseFloat(forecastRate) || 0) / 100;
        const monthlyContribution = forecastFreq === 'daily' ? amount * 30 : amount;
        const years = [1, 5, 10, 20];

        return years.map(year => {
            const months = year * 12;
            let total = 0;
            let invested = monthlyContribution * months;

            if (rate === 0) {
                total = invested;
            } else {
                // Compound Interest with Monthly Contribution: FV = PMT * (((1 + r)^n - 1) / r)
                total = monthlyContribution * ((Math.pow(1 + rate, months) - 1) / rate);
            }

            return {
                year,
                total,
                invested,
                interest: total - invested
            };
        });
    }, [forecastAmount, forecastFreq, forecastRate]);

    return (
        <div className="space-y-6">

            <div className="max-w-5xl mx-auto space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

                    {/* Simulator Input Column */}
                    <div className="lg:col-span-4 space-y-6">
                        <div className="space-y-2">
                            <h3 className="text-lg font-bold flex items-center gap-2 text-slate-800 dark:text-slate-100">
                                <Coins className="text-emerald-500" size={24} />
                                Simulador de Futuro
                            </h3>
                            <p className="text-slate-500 text-sm">Descubra o poder dos juros compostos com pequenos aportes.</p>
                        </div>

                        <Card className="space-y-6 p-6">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Quanto você quer guardar?</label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-medium">R$</span>
                                    <input
                                        type="number"
                                        value={forecastAmount}
                                        onChange={(e) => setForecastAmount(e.target.value)}
                                        className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-bold text-lg dark:text-white"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">Com qual frequência?</label>
                                <div className="grid grid-cols-2 gap-2 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                                    <button
                                        onClick={() => setForecastFreq('daily')}
                                        className={`py-2 rounded-lg text-sm font-medium transition-all ${forecastFreq === 'daily' ? 'bg-white dark:bg-slate-700 text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'}`}
                                    >
                                        Por Dia
                                    </button>
                                    <button
                                        onClick={() => setForecastFreq('monthly')}
                                        className={`py-2 rounded-lg text-sm font-medium transition-all ${forecastFreq === 'monthly' ? 'bg-white dark:bg-slate-700 text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'}`}
                                    >
                                        Por Mês
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Rentabilidade Mensal (%)</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={forecastRate}
                                    onChange={(e) => setForecastRate(e.target.value)}
                                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium dark:text-white"
                                />
                                <p className="text-xs text-slate-400 mt-2">
                                    Ex: Poupança ~0.5%, CDI ~0.8-1.0%
                                </p>
                            </div>

                            <div className="bg-emerald-50 dark:bg-emerald-900/20 p-4 rounded-xl border border-emerald-100 dark:border-emerald-900/30">
                                <p className="text-sm text-emerald-800 dark:text-emerald-300 font-medium text-center">
                                    Você guardará aproximadamente <br />
                                    <span className="text-2xl font-bold">R$ {parseFloat(forecastFreq === 'daily' ? forecastAmount * 30 : forecastAmount * 1).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span> <span className="text-xs opacity-75">/mês</span>
                                </p>
                            </div>
                        </Card>
                    </div>

                    {/* Results Column */}
                    <div className="lg:col-span-8 space-y-6">
                        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">Evolução do Patrimônio</h3>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {forecastResults.map((res) => (
                                <Card key={res.year} className="flex flex-col justify-between relative overflow-hidden group hover:border-emerald-300 transition-colors p-6">
                                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity text-slate-400 dark:text-slate-500">
                                        <Coins size={60} />
                                    </div>

                                    <div className="mb-4">
                                        <p className="text-slate-500 dark:text-slate-400 font-medium text-sm mb-1">{res.year} {res.year === 1 ? 'Ano' : 'Anos'}</p>
                                        <h4 className="text-3xl font-bold text-slate-900 dark:text-white">
                                            R$ {res.total.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
                                        </h4>
                                    </div>

                                    <div className="space-y-2">
                                        <div className="flex justify-between text-xs font-medium">
                                            <span className="text-slate-500">Valor Investido</span>
                                            <span className="text-slate-700 dark:text-slate-300">R$ {res.invested.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</span>
                                        </div>
                                        <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden flex">
                                            <div className="bg-slate-300 dark:bg-slate-600 h-full" style={{ width: `${(res.invested / res.total) * 100}%` }}></div>
                                            <div className="bg-emerald-500 h-full" style={{ width: `${(res.interest / res.total) * 100}%` }}></div>
                                        </div>
                                        <div className="flex justify-between text-xs font-medium">
                                            <span className="text-emerald-600">Juros ganhos</span>
                                            <span className="text-emerald-600">+ R$ {res.interest.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</span>
                                        </div>
                                    </div>
                                </Card>
                            ))}
                        </div>

                        <div className="bg-slate-900 text-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-emerald-500 rounded-full text-white shrink-0">
                                    <Target size={24} />
                                </div>
                                <div className="flex-1">
                                    <h4 className="font-bold text-lg">Poder do Longo Prazo</h4>
                                    <p className="text-slate-300 text-sm mt-1">
                                        Em 20 anos, seus juros (R$ {forecastResults[3].interest.toLocaleString('pt-BR', { maximumFractionDigits: 0 })})
                                        serão quase <span className="text-emerald-400 font-bold">{(forecastResults[3].interest / forecastResults[3].invested).toFixed(1)}x</span> o valor que você tirou do bolso!
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EconomyForecast;
