import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Calculator,
    LineChart,
    Landmark,
    CreditCard,
    PieChart,
    Link as LinkIcon,
    Settings,
    LogOut,
    ChevronRight,
    Wallet,
    Building2,
    TrendingUp,
    Trophy
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const MobileMenu = () => {
    const navigate = useNavigate();
    const { logout } = useAuth();

    const menuItems = [
        { title: "Transações", icon: <Wallet className="text-emerald-600" size={24} />, desc: "Histórico completo", path: '/dashboard/transactions' },
        { title: "Banco", icon: <Building2 className="text-indigo-500" size={24} />, desc: "Conectar contas", path: '/dashboard/bank' },
        { title: "Simulador", icon: <Calculator className="text-purple-500" size={24} />, desc: "Planejar compras", path: '/dashboard/simulation' },
        { title: "Estatísticas", icon: <LineChart className="text-blue-500" size={24} />, desc: "Gráficos futuros", path: '/dashboard/forecast' },
        { title: "Carteiras", icon: <Landmark className="text-emerald-500" size={24} />, desc: "Contas e bancos", path: '/dashboard/wallets' },
        { title: "Cartões", icon: <CreditCard className="text-orange-500" size={24} />, desc: "Limites e faturas", path: '/dashboard/investments' },
        { title: "Previsão", icon: <TrendingUp className="text-teal-500" size={24} />, desc: "Economia futura", path: '/dashboard/economy-forecast' },
        { title: "Conquistas", icon: <Trophy className="text-amber-500" size={24} />, desc: "Suas medalhas", path: '/dashboard/achievements' },
        { title: "Vincular", icon: <LinkIcon className="text-slate-500" size={24} />, desc: "Conectar parceiro", path: '/dashboard/link-accounts' },
    ];

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-24">
            <h3 className="font-bold text-xl px-2">Menu Completo</h3>

            <div className="grid grid-cols-2 gap-4">
                {menuItems.map((item, i) => (
                    <div
                        key={i}
                        onClick={() => navigate(item.path)}
                        className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm active:scale-95 transition-transform cursor-pointer"
                    >
                        <div className="w-10 h-10 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center mb-3">
                            {item.icon}
                        </div>
                        <h4 className="font-bold text-sm">{item.title}</h4>
                        <p className="text-xs text-slate-500">{item.desc}</p>
                    </div>
                ))}
            </div>

            <div className="pt-4 space-y-3">
                <button
                    onClick={() => navigate('/dashboard/settings')}
                    className="w-full flex items-center justify-between p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 active:scale-95 transition-transform"
                >
                    <div className="flex items-center gap-3">
                        <Settings className="text-slate-400" size={20} />
                        <span className="font-medium text-sm">Configurações</span>
                    </div>
                    <ChevronRight size={18} className="text-slate-300" />
                </button>

                <button
                    onClick={logout}
                    className="w-full flex items-center justify-between p-4 bg-rose-50 dark:bg-rose-900/10 rounded-2xl border border-rose-100 dark:border-rose-900/20 text-rose-600 active:scale-95 transition-transform"
                >
                    <div className="flex items-center gap-3">
                        <LogOut size={20} />
                        <span className="font-medium text-sm">Sair da Conta</span>
                    </div>
                </button>
            </div>
        </div>
    );
};

export default MobileMenu;
