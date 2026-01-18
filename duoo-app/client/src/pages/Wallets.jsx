import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { PlusCircle, Landmark, Wallet as WalletIcon, Edit, Trash2 } from 'lucide-react';
import Card from '../components/ui/Card';
import Modal from '../components/ui/Modal';
import ConfirmModal from '../components/ui/ConfirmModal';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

import Toast from '../components/ui/Toast';

const Wallets = () => {
    const { viewMode } = useOutletContext();
    const { user, partner } = useAuth();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [wallets, setWallets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editingWallet, setEditingWallet] = useState(null);
    const [toast, setToast] = useState(null);
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [walletToDelete, setWalletToDelete] = useState(null);

    const [formData, setFormData] = useState({
        name: '',
        type: 'digital',
        provider: 'nubank',
        balance: ''
    });

    useEffect(() => {
        fetchWallets();
    }, []);

    const fetchWallets = async () => {
        setLoading(true);
        try {
            const res = await api.get('/wallets');
            setWallets(res.data);
        } catch (error) {
            console.error('Failed to fetch wallets:', error);
        } finally {
            setLoading(false);
        }
    };

    const getProviderColor = (provider) => {
        switch (provider) {
            case 'nubank': return 'bg-[#820AD1] text-white';
            case 'inter': return 'bg-[#FF7A00] text-white';
            case 'itau': return 'bg-[#EC7000] text-white';
            case 'bradesco': return 'bg-[#CC092F] text-white';
            case 'xp': return 'bg-black text-white';
            default: return 'bg-slate-800 text-white';
        }
    };

    const getOwnerLabel = (wallet) => {
        if (!wallet.User) return 'Desconhecido';
        if (wallet.User.id === user?.id) return user?.name || 'Você';
        if (partner && wallet.User.id === partner.id) return partner.name;
        return wallet.User.name;
    };

    const getOwnerColor = (wallet) => {
        if (!wallet.User) return 'bg-slate-100 text-slate-700';
        if (wallet.User.id === user?.id) return 'bg-blue-100 text-blue-700';
        if (partner && wallet.User.id === partner.id) return 'bg-purple-100 text-purple-700';
        return 'bg-slate-100 text-slate-700';
    };

    const handleOpenModal = (wallet = null) => {
        if (wallet) {
            setEditingWallet(wallet);
            setFormData({
                name: wallet.name,
                type: wallet.type,
                provider: wallet.provider || 'nubank',
                balance: wallet.balance.toString()
            });
        } else {
            setEditingWallet(null);
            setFormData({
                name: '',
                type: 'digital',
                provider: 'nubank',
                balance: ''
            });
        }
        setIsModalOpen(true);
    };

    const handleSave = async (e) => {
        e.preventDefault();

        const payload = {
            name: formData.name,
            type: formData.type,
            provider: formData.type === 'digital' ? formData.provider : null,
            balance: parseFloat(formData.balance) || 0
        };

        try {
            if (editingWallet) {
                await api.put(`/wallets/${editingWallet.id}`, payload);
            } else {
                await api.post('/wallets', payload);
            }

            setIsModalOpen(false);
            fetchWallets();
            setFormData({ name: '', type: 'digital', provider: 'nubank', balance: '' });
        } catch (error) {
            console.error('Failed to save wallet:', error);
            setToast({ message: error.response?.data?.error || 'Erro ao salvar carteira', type: 'error' });
        }
    };

    const handleDelete = (id) => {
        setWalletToDelete(id);
        setDeleteConfirmOpen(true);
    };

    const confirmDelete = async () => {
        if (!walletToDelete) return;
        try {
            await api.delete(`/wallets/${walletToDelete}`);
            fetchWallets();
            setToast({ message: 'Carteira excluída com sucesso', type: 'success' });
        } catch (error) {
            console.error('Failed to delete wallet:', error);
            setToast({ message: error.response?.data?.error || 'Erro ao excluir carteira', type: 'error' });
        } finally {
            setWalletToDelete(null);
        }
    };

    const filteredWallets = wallets.filter(w => {
        if (viewMode === 'joint') return true;
        if (viewMode === 'user1') return w.User?.id === user?.id;
        if (viewMode === 'user2') return partner && w.User?.id === partner.id;
        return true;
    });

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold">Gerenciar Carteiras</h3>
                <button
                    onClick={() => handleOpenModal()}
                    className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-lg font-bold text-sm hover:bg-emerald-600 transition-colors"
                >
                    <PlusCircle size={16} /> Adicionar
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {filteredWallets.map((wallet) => (
                    <div key={wallet.id} className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-100 dark:border-slate-800 shadow-sm relative overflow-hidden group">
                        {wallet.type === 'digital' && (
                            <div className={`absolute top-0 right-0 w-24 h-24 transform translate-x-8 -translate-y-8 rounded-full opacity-10 ${getProviderColor(wallet.provider).split(' ')[0]}`}></div>
                        )}

                        <div className="flex justify-between items-start mb-4 relative z-10">
                            <div className={`p-3 rounded-xl ${wallet.type === 'digital' ? getProviderColor(wallet.provider) : 'bg-emerald-100 text-emerald-600'}`}>
                                {wallet.type === 'digital' ? <Landmark size={24} /> : <WalletIcon size={24} />}
                            </div>
                            <div className="flex items-center gap-2">
                                <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${getOwnerColor(wallet)}`}>
                                    {getOwnerLabel(wallet)}
                                </span>
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                        onClick={() => handleOpenModal(wallet)}
                                        className="p-1.5 hover:bg-blue-50 dark:hover:bg-blue-900/20 text-blue-600 rounded-lg transition-colors"
                                        title="Editar"
                                    >
                                        <Edit size={14} />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(wallet.id)}
                                        className="p-1.5 hover:bg-rose-50 dark:hover:bg-rose-900/20 text-rose-600 rounded-lg transition-colors"
                                        title="Excluir"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            </div>
                        </div>
                        <h4 className="font-bold text-lg mb-1">{wallet.name}</h4>
                        <p className="text-2xl font-bold text-slate-700 dark:text-slate-200">
                            R$ {parseFloat(wallet.balance).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                    </div>
                ))}

                {/* Empty state clickable */}
                <button
                    onClick={() => handleOpenModal()}
                    className="border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl p-6 flex flex-col items-center justify-center text-slate-400 hover:text-emerald-500 hover:border-emerald-500 transition-all min-h-[180px]"
                >
                    <PlusCircle size={32} className="mb-2" />
                    <span className="font-bold">Adicionar Outra</span>
                </button>
            </div>

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingWallet ? "Editar Carteira" : "Nova Carteira"}>
                <form onSubmit={handleSave} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Nome da Carteira</label>
                        <input
                            type="text"
                            required
                            placeholder="Ex: Conta Nubank"
                            value={formData.name}
                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                            className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Tipo</label>
                        <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                            <button
                                type="button"
                                onClick={() => setFormData({ ...formData, type: 'digital' })}
                                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${formData.type === 'digital' ? 'bg-white dark:bg-slate-700 text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                Digital (Banco)
                            </button>
                            <button
                                type="button"
                                onClick={() => setFormData({ ...formData, type: 'physical' })}
                                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${formData.type === 'physical' ? 'bg-white dark:bg-slate-700 text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                Física
                            </button>
                        </div>
                    </div>

                    {formData.type === 'digital' && (
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Instituição</label>
                            <select
                                value={formData.provider}
                                onChange={(e) => setFormData({ ...formData, provider: e.target.value })}
                                className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            >
                                <option value="nubank">Nubank</option>
                                <option value="inter">Banco Inter</option>
                                <option value="itau">Itaú</option>
                                <option value="bradesco">Bradesco</option>
                                <option value="xp">XP Investimentos</option>
                                <option value="other">Outro</option>
                            </select>
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                            {editingWallet ? 'Saldo Atual (R$)' : 'Saldo Inicial (R$)'}
                        </label>
                        <input
                            type="number"
                            required
                            step="0.01"
                            placeholder="0.00"
                            value={formData.balance}
                            onChange={e => setFormData({ ...formData, balance: e.target.value })}
                            className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                    </div>

                    <button type="submit" className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3 rounded-xl transition-colors shadow-lg shadow-emerald-500/30">
                        {editingWallet ? 'Atualizar Carteira' : 'Criar Carteira'}
                    </button>
                </form>
            </Modal>

            <ConfirmModal
                isOpen={deleteConfirmOpen}
                onClose={() => setDeleteConfirmOpen(false)}
                onConfirm={confirmDelete}
                title="Excluir Carteira"
                message="Tem certeza que deseja excluir esta carteira? Esta ação não pode ser desfeita."
                type="danger"
                confirmText="Excluir"
                cancelText="Cancelar"
            />

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

export default Wallets;
