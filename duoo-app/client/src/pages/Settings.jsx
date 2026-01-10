import React, { useState } from 'react';
import { Settings as SettingsIcon, LogOut, Moon, Bell } from 'lucide-react';
import Card from '../components/ui/Card';
import { useAuth } from '../context/AuthContext';

const Settings = () => {
    const { user, logout } = useAuth();

    return (
        <div className="max-w-2xl mx-auto space-y-8">
            <h3 className="text-2xl font-bold">Configurações da Conta</h3>

            <Card className="space-y-6">
                <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-full bg-blue-500 flex items-center justify-center text-2xl font-bold text-white uppercase">{user?.name ? user.name[0] : 'U'}</div>
                    <div>
                        <h4 className="font-bold text-lg">{user?.name || 'Usuário'}</h4>
                        <p className="text-slate-500 text-sm">{user?.email}</p>
                    </div>
                    <button className="ml-auto text-emerald-500 text-sm font-medium hover:underline">Editar Perfil</button>
                </div>

                <div className="pt-6 border-t border-slate-100 dark:border-slate-800 space-y-4">
                    <h5 className="font-bold text-sm text-slate-500 uppercase tracking-wider">Preferências</h5>

                    <div className="flex items-center justify-between py-2">
                        <div className="flex items-center gap-3">
                            <Moon size={18} className="text-slate-400" />
                            <span>Modo Escuro</span>
                        </div>
                        <div className="w-10 h-6 bg-slate-200 rounded-full relative cursor-pointer">
                            <div className="w-4 h-4 bg-white rounded-full absolute top-1 left-1 shadow-sm"></div>
                        </div>
                    </div>

                    <div className="flex items-center justify-between py-2">
                        <div className="flex items-center gap-3">
                            <Bell size={18} className="text-slate-400" />
                            <span>Notificações de Gastos</span>
                        </div>
                        <div className="w-10 h-6 bg-emerald-500 rounded-full relative cursor-pointer">
                            <div className="w-4 h-4 bg-white rounded-full absolute top-1 right-1 shadow-sm"></div>
                        </div>
                    </div>
                </div>

                <div className="pt-6 border-t border-slate-100 dark:border-slate-800">
                    <button
                        onClick={logout}
                        className="w-full flex items-center justify-center gap-2 p-3 text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-xl font-medium transition-colors"
                    >
                        <LogOut size={18} /> Sair da Conta
                    </button>
                </div>
            </Card>
        </div>
    );
};

export default Settings;
