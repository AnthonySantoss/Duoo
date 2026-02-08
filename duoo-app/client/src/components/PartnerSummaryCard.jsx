import React, { useState, useEffect } from 'react';
import { Users, ArrowRightLeft, TrendingDown, TrendingUp, HandCoins } from 'lucide-react';
import Card from './ui/Card';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const PartnerSummaryCard = () => {
    const { user } = useAuth();
    const [summary, setSummary] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchSummary();

        const handleRefresh = () => fetchSummary();
        window.addEventListener('refresh-data', handleRefresh);
        return () => window.removeEventListener('refresh-data', handleRefresh);
    }, []);

    const fetchSummary = async () => {
        try {
            const res = await api.get('/partner/summary');
            setSummary(res.data);
        } catch (error) {
            console.error('Failed to fetch partner summary:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading || !summary || !summary.linked) return null;

    const { userNetBalance, partnerName } = summary;
    const isUserOwed = userNetBalance > 0;
    const isBalanced = Math.abs(userNetBalance) < 0.01;

    return (
        <Card className="bg-white dark:bg-slate-900 border-none shadow-xl overflow-hidden relative group">


            <div className="flex items-center justify-between mb-6 relative z-10">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-xl group-hover:scale-110 transition-transform">
                        <Users size={20} />
                    </div>
                    <div>
                        <h4 className="font-bold text-slate-900 dark:text-white leading-tight">Ajuste de Dupla</h4>
                        <div className="flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                            <p className="text-[9px] text-slate-500 uppercase font-black tracking-widest">Couple Sync</p>
                        </div>
                    </div>
                </div>
                <div className="flex -space-x-2">
                    <div className="w-8 h-8 rounded-full bg-slate-200 border-2 border-white dark:border-slate-900 flex items-center justify-center text-[10px] font-bold" title={user?.name}>
                        {(user?.name || 'U').charAt(0).toUpperCase()}
                    </div>
                    <div className={`w-8 h-8 rounded-full border-2 border-white dark:border-slate-900 flex items-center justify-center text-[10px] font-bold text-white ${isBalanced ? 'bg-slate-400' : (isUserOwed ? 'bg-emerald-500' : 'bg-rose-500')
                        }`} title={partnerName}>
                        {partnerName?.charAt(0) || 'P'}
                    </div>
                </div>
            </div>

            <div className="space-y-4 relative z-10">
                <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/50 transition-all hover:bg-slate-100 dark:hover:bg-slate-800/60">
                    <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg transition-all ${isBalanced
                            ? 'bg-slate-100 text-slate-400'
                            : (isUserOwed ? 'bg-emerald-500 text-white rotate-3 group-hover:rotate-0' : 'bg-rose-500 text-white -rotate-3 group-hover:rotate-0')
                            }`}>
                            {isBalanced ? <ArrowRightLeft size={24} /> : (isUserOwed ? <TrendingUp size={24} /> : <TrendingDown size={24} />)}
                        </div>
                        <div>
                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tight">Status com {partnerName}</p>
                            <p className={`text-sm font-black ${isBalanced ? 'text-slate-600' : (isUserOwed ? 'text-emerald-600' : 'text-rose-600')}`}>
                                {isBalanced ? 'Contas Equilibradas!' : (isUserOwed ? 'Você recebe' : 'Você deve')}
                            </p>
                        </div>
                    </div>
                    <div className="text-right">
                        <p className={`text-lg font-black tracking-tighter ${isBalanced ? 'text-slate-400' : (isUserOwed ? 'text-emerald-600' : 'text-rose-600')}`}>
                            R$ {Math.abs(userNetBalance).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </p>
                    </div>
                </div>

                {!isBalanced && (
                    <div className="p-3 bg-amber-50/50 dark:bg-amber-900/10 border border-amber-100/50 dark:border-amber-900/20 rounded-xl flex items-center gap-3">
                        <div className="bg-amber-100 dark:bg-amber-900/30 p-1.5 rounded-lg text-amber-600">
                            <HandCoins size={16} />
                        </div>
                        <p className="text-[10px] text-amber-900/70 dark:text-amber-300 font-medium leading-tight">
                            {isUserOwed
                                ? `Acerto sugerido: ${partnerName} te envia R$ ${Math.abs(userNetBalance).toFixed(2)}`
                                : `Acerto sugerido: Envie R$ ${Math.abs(userNetBalance).toFixed(2)} para ${partnerName}`
                            }
                        </p>
                    </div>
                )}
            </div>
        </Card>
    );
};

export default PartnerSummaryCard;
