import React, { useState, useEffect } from 'react';
import { Settings as SettingsIcon, LogOut, Moon, Sun, Bell, User, Mail, Lock, Trash2, UserPlus, UserMinus, Save, X } from 'lucide-react';
import Card from '../components/ui/Card';
import Modal from '../components/ui/Modal';
import ConfirmModal from '../components/ui/ConfirmModal';
import Toast from '../components/ui/Toast';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const Settings = () => {
    const { user, partner, hasPartner, logout, setUser, setPartner, setHasPartner } = useAuth();

    // Estados
    const [darkMode, setDarkMode] = useState(false);
    const [notifications, setNotifications] = useState(true);
    const [toast, setToast] = useState(null);

    // Modais
    const [editProfileOpen, setEditProfileOpen] = useState(false);
    const [changePasswordOpen, setChangePasswordOpen] = useState(false);
    const [deleteAccountOpen, setDeleteAccountOpen] = useState(false);
    const [partnerModalOpen, setPartnerModalOpen] = useState(false);
    const [removePartnerConfirmOpen, setRemovePartnerConfirmOpen] = useState(false);

    // Forms
    const [profileForm, setProfileForm] = useState({
        name: '',
        email: ''
    });

    const [passwordForm, setPasswordForm] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });

    const [partnerEmail, setPartnerEmail] = useState('');
    const [deleteConfirmation, setDeleteConfirmation] = useState('');

    useEffect(() => {
        // Carregar preferências do localStorage
        const savedDarkMode = localStorage.getItem('darkMode') === 'true';
        const savedNotifications = localStorage.getItem('notifications') !== 'false';

        setDarkMode(savedDarkMode);
        setNotifications(savedNotifications);

        // Aplicar dark mode
        if (savedDarkMode) {
            document.documentElement.classList.add('dark');
        }
    }, []);

    useEffect(() => {
        if (user) {
            setProfileForm({
                name: user.name || '',
                email: user.email || ''
            });
        }
    }, [user]);

    const showToast = (message, type = 'info') => {
        setToast({ message, type });
    };

    const toggleDarkMode = () => {
        const newDarkMode = !darkMode;
        setDarkMode(newDarkMode);
        localStorage.setItem('darkMode', newDarkMode);

        if (newDarkMode) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }

        showToast(newDarkMode ? 'Modo escuro ativado' : 'Modo claro ativado', 'success');
    };

    const toggleNotifications = () => {
        const newNotifications = !notifications;
        setNotifications(newNotifications);
        localStorage.setItem('notifications', newNotifications);
        showToast(newNotifications ? 'Notificações ativadas' : 'Notificações desativadas', 'success');
    };

    const handleUpdateProfile = async (e) => {
        e.preventDefault();

        if (!profileForm.name || !profileForm.email) {
            showToast('Preencha todos os campos', 'error');
            return;
        }

        try {
            const res = await api.put('/auth/profile', profileForm);
            setUser(res.data.user);
            setEditProfileOpen(false);
            showToast('Perfil atualizado com sucesso!', 'success');
        } catch (error) {
            console.error('Failed to update profile:', error);
            showToast(error.response?.data?.error || 'Erro ao atualizar perfil', 'error');
        }
    };

    const handleChangePassword = async (e) => {
        e.preventDefault();

        if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
            showToast('Preencha todos os campos', 'error');
            return;
        }

        if (passwordForm.newPassword !== passwordForm.confirmPassword) {
            showToast('As senhas não coincidem', 'error');
            return;
        }

        if (passwordForm.newPassword.length < 6) {
            showToast('A nova senha deve ter no mínimo 6 caracteres', 'error');
            return;
        }

        try {
            await api.put('/auth/password', {
                currentPassword: passwordForm.currentPassword,
                newPassword: passwordForm.newPassword
            });

            setChangePasswordOpen(false);
            setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
            showToast('Senha alterada com sucesso!', 'success');
        } catch (error) {
            console.error('Failed to change password:', error);
            showToast(error.response?.data?.error || 'Erro ao alterar senha', 'error');
        }
    };

    const handleAddPartner = async (e) => {
        e.preventDefault();

        if (!partnerEmail) {
            showToast('Digite o email do parceiro', 'error');
            return;
        }

        try {
            const res = await api.post('/partner/add', { partnerEmail });
            setPartner(res.data.partner);
            setHasPartner(true);
            setPartnerModalOpen(false);
            setPartnerEmail('');
            showToast('Parceiro adicionado com sucesso!', 'success');
        } catch (error) {
            console.error('Failed to add partner:', error);
            showToast(error.response?.data?.error || 'Erro ao adicionar parceiro', 'error');
        }
    };

    const handleRemovePartner = () => {
        setRemovePartnerConfirmOpen(true);
    };

    const confirmRemovePartner = async () => {

        try {
            await api.delete('/partner/remove');
            setPartner(null);
            setHasPartner(false);
            showToast('Parceiro removido com sucesso', 'success');
        } catch (error) {
            console.error('Failed to remove partner:', error);
            showToast(error.response?.data?.error || 'Erro ao remover parceiro', 'error');
        }
    };

    const handleDeleteAccount = async (e) => {
        e.preventDefault();

        if (deleteConfirmation !== 'DELETAR') {
            showToast('Digite "DELETAR" para confirmar', 'error');
            return;
        }

        try {
            await api.delete('/auth/account');
            showToast('Conta excluída com sucesso', 'success');
            setTimeout(() => {
                logout();
            }, 2000);
        } catch (error) {
            console.error('Failed to delete account:', error);
            showToast(error.response?.data?.error || 'Erro ao excluir conta', 'error');
        }
    };

    return (
        <div className="max-w-2xl mx-auto space-y-8">
            {toast && (
                <Toast
                    message={toast.message}
                    type={toast.type}
                    onClose={() => setToast(null)}
                />
            )}

            <ConfirmModal
                isOpen={removePartnerConfirmOpen}
                onClose={() => setRemovePartnerConfirmOpen(false)}
                onConfirm={confirmRemovePartner}
                title="Remover Parceiro"
                message="Tem certeza que deseja remover o parceiro? Isso afetará metas e transações compartilhadas."
                type="warning"
                confirmText="Remover"
                cancelText="Cancelar"
            />

            <h3 className="text-2xl font-bold text-slate-900 dark:text-white">Configurações da Conta</h3>

            {/* Perfil */}
            <Card className="space-y-6">
                <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-emerald-500 to-blue-500 flex items-center justify-center text-2xl font-bold text-white uppercase shadow-lg">
                        {user?.name ? user.name[0] : 'U'}
                    </div>
                    <div className="flex-1">
                        <h4 className="font-bold text-lg text-slate-900 dark:text-white">{user?.name || 'Usuário'}</h4>
                        <p className="text-slate-500 dark:text-slate-400 text-sm">{user?.email}</p>
                    </div>
                    <button
                        onClick={() => setEditProfileOpen(true)}
                        className="px-4 py-2 text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 rounded-lg text-sm font-medium transition-colors"
                    >
                        Editar Perfil
                    </button>
                </div>

                <div className="pt-6 border-t border-slate-200 dark:border-slate-700">
                    <button
                        onClick={() => setChangePasswordOpen(true)}
                        className="flex items-center gap-2 text-slate-700 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
                    >
                        <Lock size={18} />
                        <span className="font-medium">Alterar Senha</span>
                    </button>
                </div>
            </Card>

            {/* Preferências */}
            <Card className="space-y-6">
                <h5 className="font-bold text-sm text-slate-500 dark:text-slate-400 uppercase tracking-wider">Preferências</h5>

                <div className="flex items-center justify-between py-2">
                    <div className="flex items-center gap-3">
                        {darkMode ? <Moon size={18} className="text-slate-400" /> : <Sun size={18} className="text-slate-400" />}
                        <span className="text-slate-900 dark:text-white font-medium">Modo Escuro</span>
                    </div>
                    <button
                        onClick={toggleDarkMode}
                        className={`w-12 h-6 rounded-full relative transition-colors ${darkMode ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'
                            }`}
                    >
                        <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 shadow-md transition-transform ${darkMode ? 'right-0.5' : 'left-0.5'
                            }`}></div>
                    </button>
                </div>

                <div className="flex items-center justify-between py-2">
                    <div className="flex items-center gap-3">
                        <Bell size={18} className="text-slate-400" />
                        <span className="text-slate-900 dark:text-white font-medium">Notificações de Gastos</span>
                    </div>
                    <button
                        onClick={toggleNotifications}
                        className={`w-12 h-6 rounded-full relative transition-colors ${notifications ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'
                            }`}
                    >
                        <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 shadow-md transition-transform ${notifications ? 'right-0.5' : 'left-0.5'
                            }`}></div>
                    </button>
                </div>
            </Card>

            {/* Parceiro */}
            <Card className="space-y-6">
                <h5 className="font-bold text-sm text-slate-500 dark:text-slate-400 uppercase tracking-wider">Parceiro</h5>

                {hasPartner && partner ? (
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold uppercase">
                                {partner.name ? partner.name[0] : 'P'}
                            </div>
                            <div>
                                <p className="font-bold text-slate-900 dark:text-white">{partner.name}</p>
                                <p className="text-xs text-slate-500 dark:text-slate-400">{partner.email}</p>
                            </div>
                        </div>
                        <button
                            onClick={handleRemovePartner}
                            className="px-4 py-2 text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-900/20 hover:bg-rose-100 dark:hover:bg-rose-900/30 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                        >
                            <UserMinus size={16} />
                            Remover
                        </button>
                    </div>
                ) : (
                    <button
                        onClick={() => setPartnerModalOpen(true)}
                        className="w-full py-3 px-4 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl text-slate-600 dark:text-slate-400 hover:border-emerald-500 dark:hover:border-emerald-500 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors flex items-center justify-center gap-2 font-medium"
                    >
                        <UserPlus size={18} />
                        Adicionar Parceiro
                    </button>
                )}
            </Card>

            {/* Zona de Perigo */}
            <Card className="space-y-6 border-2 border-rose-200 dark:border-rose-900/30">
                <h5 className="font-bold text-sm text-rose-600 dark:text-rose-400 uppercase tracking-wider">Zona de Perigo</h5>

                <button
                    onClick={() => setDeleteAccountOpen(true)}
                    className="w-full flex items-center justify-center gap-2 p-3 text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-900/20 hover:bg-rose-100 dark:hover:bg-rose-900/30 rounded-xl font-medium transition-colors"
                >
                    <Trash2 size={18} />
                    Excluir Conta Permanentemente
                </button>
            </Card>

            {/* Logout */}
            <Card>
                <button
                    onClick={logout}
                    className="w-full flex items-center justify-center gap-2 p-3 text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl font-medium transition-colors"
                >
                    <LogOut size={18} />
                    Sair da Conta
                </button>
            </Card>

            {/* Modal: Editar Perfil */}
            <Modal isOpen={editProfileOpen} onClose={() => setEditProfileOpen(false)} title="Editar Perfil">
                <form onSubmit={handleUpdateProfile} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                            <User size={16} className="inline mr-2" />
                            Nome
                        </label>
                        <input
                            type="text"
                            value={profileForm.name}
                            onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                            className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                            <Mail size={16} className="inline mr-2" />
                            Email
                        </label>
                        <input
                            type="email"
                            value={profileForm.email}
                            onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                            className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            required
                        />
                    </div>

                    <div className="flex gap-3 pt-4">
                        <button
                            type="button"
                            onClick={() => setEditProfileOpen(false)}
                            className="flex-1 py-3 px-4 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            className="flex-1 py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold transition-colors shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2"
                        >
                            <Save size={18} />
                            Salvar
                        </button>
                    </div>
                </form>
            </Modal>

            {/* Modal: Alterar Senha */}
            <Modal isOpen={changePasswordOpen} onClose={() => setChangePasswordOpen(false)} title="Alterar Senha">
                <form onSubmit={handleChangePassword} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                            Senha Atual
                        </label>
                        <input
                            type="password"
                            value={passwordForm.currentPassword}
                            onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                            className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                            Nova Senha
                        </label>
                        <input
                            type="password"
                            value={passwordForm.newPassword}
                            onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                            className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            required
                            minLength={6}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                            Confirmar Nova Senha
                        </label>
                        <input
                            type="password"
                            value={passwordForm.confirmPassword}
                            onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                            className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            required
                            minLength={6}
                        />
                    </div>

                    <div className="flex gap-3 pt-4">
                        <button
                            type="button"
                            onClick={() => setChangePasswordOpen(false)}
                            className="flex-1 py-3 px-4 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            className="flex-1 py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold transition-colors shadow-lg shadow-emerald-500/20"
                        >
                            Alterar Senha
                        </button>
                    </div>
                </form>
            </Modal>

            {/* Modal: Adicionar Parceiro */}
            <Modal isOpen={partnerModalOpen} onClose={() => setPartnerModalOpen(false)} title="Adicionar Parceiro">
                <form onSubmit={handleAddPartner} className="space-y-4">
                    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-900/30 p-4 rounded-xl">
                        <p className="text-sm text-blue-800 dark:text-blue-300">
                            Adicione um parceiro para compartilhar metas e gerenciar finanças juntos.
                        </p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                            Email do Parceiro
                        </label>
                        <input
                            type="email"
                            value={partnerEmail}
                            onChange={(e) => setPartnerEmail(e.target.value)}
                            placeholder="parceiro@email.com"
                            className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            required
                        />
                    </div>

                    <div className="flex gap-3 pt-4">
                        <button
                            type="button"
                            onClick={() => setPartnerModalOpen(false)}
                            className="flex-1 py-3 px-4 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            className="flex-1 py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold transition-colors shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2"
                        >
                            <UserPlus size={18} />
                            Adicionar
                        </button>
                    </div>
                </form>
            </Modal>

            {/* Modal: Excluir Conta */}
            <Modal isOpen={deleteAccountOpen} onClose={() => setDeleteAccountOpen(false)} title="⚠️ Excluir Conta">
                <form onSubmit={handleDeleteAccount} className="space-y-4">
                    <div className="bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-900/30 p-4 rounded-xl">
                        <p className="text-sm text-rose-800 dark:text-rose-300 font-bold mb-2">
                            ⚠️ ATENÇÃO: Esta ação é irreversível!
                        </p>
                        <p className="text-sm text-rose-700 dark:text-rose-400">
                            Todos os seus dados, incluindo transações, metas, carteiras e histórico serão permanentemente excluídos.
                        </p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                            Digite <strong>DELETAR</strong> para confirmar:
                        </label>
                        <input
                            type="text"
                            value={deleteConfirmation}
                            onChange={(e) => setDeleteConfirmation(e.target.value)}
                            placeholder="DELETAR"
                            className="w-full px-4 py-3 rounded-xl border border-rose-300 dark:border-rose-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500"
                            required
                        />
                    </div>

                    <div className="flex gap-3 pt-4">
                        <button
                            type="button"
                            onClick={() => {
                                setDeleteAccountOpen(false);
                                setDeleteConfirmation('');
                            }}
                            className="flex-1 py-3 px-4 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            className="flex-1 py-3 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold transition-colors shadow-lg shadow-rose-500/20 flex items-center justify-center gap-2"
                        >
                            <Trash2 size={18} />
                            Excluir Conta
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default Settings;
