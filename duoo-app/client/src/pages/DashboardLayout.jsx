import React, { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Wallet, Target, Calculator, LineChart, FileText, Landmark, CreditCard, Settings, Users, User, LogOut, TrendingUp, Building2, Trophy, Bell, RefreshCw, Menu as MenuIcon, PlusCircle, Home, ArrowRightLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useAchievements } from '../context/AchievementContext';
import AchievementModal from '../components/ui/AchievementModal';
import NotificationDropdown from '../components/ui/NotificationDropdown';
import TransactionModal from '../components/ui/TransactionModal';


const DashboardLayout = () => {
    const { user, partner, hasPartner, logout } = useAuth();
    const { pendingAchievement, dismissAchievement } = useAchievements();
    const location = useLocation();
    const [viewMode, setViewMode] = useState('joint');
    const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);


    const isActive = (path) => {
        if (path === '/dashboard') {
            return location.pathname === '/dashboard';
        }
        return location.pathname === path || location.pathname.startsWith(`${path}/`);
    };

    const navItems = [
        { path: '/dashboard', icon: <LayoutDashboard size={20} />, label: 'Dashboard' },
        { path: '/dashboard/transactions', icon: <ArrowRightLeft size={20} />, label: 'Transações' },
        { path: '/dashboard/bank', icon: <Building2 size={20} />, label: 'Banco' },
        { path: '/dashboard/goals', icon: <Target size={20} />, label: 'Objetivos' },
        { path: '/dashboard/simulation', icon: <Calculator size={20} />, label: 'Simulador' },
        { path: '/dashboard/forecast', icon: <LineChart size={20} />, label: 'Estatísticas' },
        { path: '/dashboard/statement', icon: <FileText size={20} />, label: 'Extrato' },
        { path: '/dashboard/wallets', icon: <Landmark size={20} />, label: 'Carteiras' },
        { path: '/dashboard/investments', icon: <CreditCard size={20} />, label: 'Cartões de Crédito' },
        { path: '/dashboard/economy-forecast', icon: <TrendingUp size={20} />, label: 'Previsão' },
        { path: '/dashboard/achievements', icon: <Trophy size={20} />, label: 'Conquistas' },
    ];

    return (
        <div className="flex h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans">
            {/* Sidebar */}
            <aside className="w-64 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hidden md:flex flex-col">
                <div className="p-6">
                    <div className="flex items-center gap-3 mb-8">
                        <div className="bg-emerald-50 p-2.5 rounded-xl text-emerald-600 shadow-sm border border-emerald-100">
                            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="9" cy="12" r="6" />
                                <circle cx="15" cy="12" r="6" />
                            </svg>
                        </div>
                        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Duoo</h1>
                    </div>
                    <nav className="space-y-1">
                        {navItems.map((item) => (
                            <Link
                                key={item.path}
                                to={item.path}
                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${isActive(item.path) ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                            >
                                {item.icon} <span className="font-medium">{item.label}</span>
                            </Link>
                        ))}
                    </nav>
                </div>
                <div className="mt-auto p-6 border-t border-slate-100 dark:border-slate-800">
                    <Link
                        to="/dashboard/link-accounts"
                        className={`w-full flex items-center gap-3 mb-4 p-2 -mx-2 rounded-xl transition-colors text-left group ${isActive('/dashboard/link-accounts') ? 'bg-emerald-50 dark:bg-emerald-500/10' : 'hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                    >
                        <div className="flex -space-x-2">
                            <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-xs font-bold text-white border-2 border-white dark:border-slate-900">
                                {user?.name?.charAt(0).toUpperCase() || 'U'}
                            </div>
                            {hasPartner ? (
                                <div className="w-8 h-8 rounded-full bg-purple-500 flex items-center justify-center text-xs font-bold text-white border-2 border-white dark:border-slate-900">
                                    {partner?.name?.charAt(0).toUpperCase() || 'P'}
                                </div>
                            ) : (
                                <div className="w-8 h-8 rounded-full bg-slate-300 dark:bg-slate-700 flex items-center justify-center text-xs font-bold text-white border-2 border-white dark:border-slate-900">
                                    +
                                </div>
                            )}
                        </div>
                        <div className="flex flex-col">
                            <span className={`text-sm font-semibold transition-colors ${isActive('/dashboard/link-accounts') ? 'text-emerald-700 dark:text-emerald-400' : 'group-hover:text-emerald-600'}`}>Conta Familiar</span>
                            <span className="text-xs text-slate-500">Gerenciar Vínculo</span>
                        </div>
                    </Link>

                    <Link to="/dashboard/settings" className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors mb-4">
                        <Settings size={16} /> Configurações
                    </Link>
                    <button onClick={logout} className="flex items-center gap-2 text-sm text-slate-500 hover:text-rose-600 transition-colors">
                        <LogOut size={16} /> Sair
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto">
                {/* Header Mobile */}
                <header className="app-header md:hidden">
                    <div className="header-top">
                        <div className="header-user-info">
                            <div className="header-avatar-container">
                                <div className="header-avatar">
                                    {viewMode === 'joint' ? <Users size={18} /> : viewMode === 'user1' ? (user?.name?.charAt(0) || 'A') : (partner?.name?.charAt(0) || 'B')}
                                </div>
                                <div className="header-status-indicator"></div>
                            </div>
                            <div>
                                <p className="header-greeting">Olá,</p>
                                <h2 className="header-username">{viewMode === 'joint' ? `${user?.name?.split(' ')[0]} & ${partner?.name?.split(' ')[0]}` : viewMode === 'user1' ? user?.name : partner?.name}</h2>
                            </div>
                        </div>
                        <div className="header-actions">
                            <button
                                onClick={() => setViewMode(prev => prev === 'joint' ? 'user1' : prev === 'user1' ? 'user2' : 'joint')}
                                className="header-action-btn"
                            >
                                <RefreshCw size={18} />
                            </button>
                            <NotificationDropdown />
                        </div>
                    </div>
                </header>

                <header className="hidden md:flex sticky top-0 z-10 bg-slate-50/80 dark:bg-slate-950/80 backdrop-blur-md px-8 py-6 flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h2 className="text-2xl font-bold capitalize">
                            {navItems.find(i => isActive(i.path))?.label || 'Visão Geral'}
                        </h2>
                        {location.pathname === '/dashboard' && (
                            <p className="text-slate-500 text-sm italic">
                                {hasPartner
                                    ? `Bem-vindos, ${user?.name || 'Usuário'} & ${partner?.name || 'Parceiro'}!`
                                    : `Bem-vindo, ${user?.name || 'Usuário'}.`
                                }
                            </p>
                        )}
                    </div>

                    {hasPartner ? (
                        <div className="flex items-center gap-3 bg-white dark:bg-slate-900 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                            <button onClick={() => setViewMode('joint')} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${viewMode === 'joint' ? 'bg-emerald-500 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}>
                                <Users size={16} /> Conjunto
                            </button>
                            <button onClick={() => setViewMode('user1')} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${viewMode === 'user1' ? 'bg-blue-500 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}>
                                <User size={16} /> {user?.name || 'Você'}
                            </button>
                            <button onClick={() => setViewMode('user2')} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${viewMode === 'user2' ? 'bg-purple-500 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}>
                                <User size={16} /> {partner?.name || 'Parceiro'}
                            </button>
                        </div>
                    ) : (
                        <div className="flex items-center gap-3 bg-white dark:bg-slate-900 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                            <button className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-emerald-500 text-white shadow-md">
                                <User size={16} /> {user?.name || 'Você'}
                            </button>
                        </div>
                    )}
                </header>

                <div className="px-6 pb-24 md:px-8 md:pb-12 scrollbar-hide">
                    <Outlet context={{ viewMode }} />
                </div>

                {/* Bottom Navigation Mobile */}
                <nav className="bottom-nav md:hidden">
                    <Link
                        to="/dashboard"
                        className={`nav-btn ${isActive('/dashboard') && !isActive('/dashboard/') ? 'active' : ''}`}
                    >
                        <LayoutDashboard size={24} strokeWidth={isActive('/dashboard') && !isActive('/dashboard/') ? 2.5 : 2} />
                        <span className="nav-btn-indicator"></span>
                    </Link>

                    <Link
                        to="/dashboard/transactions"
                        className={`nav-btn ${isActive('/dashboard/transactions') ? 'active' : ''}`}
                    >
                        <ArrowRightLeft size={24} strokeWidth={isActive('/dashboard/transactions') ? 2.5 : 2} />
                        <span className="nav-btn-indicator"></span>
                    </Link>

                    <button
                        className="nav-add-btn group"
                        onClick={() => setIsTransactionModalOpen(true)}
                    >
                        <div className="nav-add-btn-inner">
                            <PlusCircle size={28} className="nav-add-icon" />
                        </div>
                        <div className="nav-add-label">
                            Lançar
                        </div>
                    </button>

                    <Link
                        to="/dashboard/goals"
                        className={`nav-btn ${isActive('/dashboard/goals') ? 'active' : ''}`}
                    >
                        <Target size={24} strokeWidth={isActive('/dashboard/goals') ? 2.5 : 2} />
                        <span className="nav-btn-indicator"></span>
                    </Link>

                    <Link
                        to="/dashboard/menu"
                        className={`nav-btn ${isActive('/dashboard/menu') ? 'active' : ''}`}
                    >
                        <MenuIcon size={24} strokeWidth={isActive('/dashboard/menu') ? 2.5 : 2} />
                        <span className="nav-btn-indicator"></span>
                    </Link>
                </nav>
            </main>

            {/* Global Achievement Modal */}
            <AchievementModal
                achievement={pendingAchievement}
                onClose={dismissAchievement}
            />

            {/* Transaction Modal */}
            <TransactionModal
                isOpen={isTransactionModalOpen}
                onClose={() => setIsTransactionModalOpen(false)}
                onSuccess={() => {
                    // Refresh data if needed - currently relies on page reload or local updates
                    // Future improvement: use a global transaction context
                }}
            />
        </div>
    );
};

export default DashboardLayout;
