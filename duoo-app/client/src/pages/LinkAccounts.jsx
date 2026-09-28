import React, { useState, useEffect } from 'react';
import { Link as LinkIcon, CheckCircle2, Settings as SettingsIcon, Unlink, QrCode, Copy } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import Card from '../components/ui/Card';
import ConfirmModal from '../components/ui/ConfirmModal';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import Toast from '../components/ui/Toast';

const LinkAccounts = () => {
    const { user, partner, hasPartner } = useAuth();
    const [partnerCode, setPartnerCode] = useState('');
    const [myCode, setMyCode] = useState('');
    const [loading, setLoading] = useState(false);
    const [toast, setToast] = useState(null);
    const [copied, setCopied] = useState(false);
    const [unlinkConfirmOpen, setUnlinkConfirmOpen] = useState(false);

    useEffect(() => {
        fetchMyCode();
    }, []);

    const fetchMyCode = async () => {
        try {
            const res = await api.get('/partner/code');
            setMyCode(res.data.code);
        } catch (error) {
            console.error('Failed to fetch code:', error);
        }
    };

    const handleCopyCode = () => {
        navigator.clipboard.writeText(myCode);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleLinkPartner = async () => {
        if (!partnerCode.trim()) {
            setToast({ type: 'error', message: 'Por favor, insira o código do parceiro.' });
            return;
        }

        setLoading(true);
        setToast(null);

        try {
            const res = await api.post('/partner/link', { partnerCode: partnerCode.trim() });
            setToast({ type: 'success', message: res.data.message });
            setPartnerCode('');
            // Reload page to update partner info
            setTimeout(() => window.location.reload(), 1500);
        } catch (error) {
            setToast({
                type: 'error',
                message: error.response?.data?.error || 'Erro ao vincular conta.'
            });
        } finally {
            setLoading(false);
        }
    };

    const handleUnlinkPartner = () => {
        setUnlinkConfirmOpen(true);
    };

    const confirmUnlinkPartner = async () => {

        setLoading(true);
        setToast(null);

        try {
            const res = await api.post('/partner/unlink');
            setToast({ type: 'success', message: res.data.message });
            // Reload page to update partner info
            setTimeout(() => window.location.reload(), 1500);
        } catch (error) {
            setToast({
                type: 'error',
                message: error.response?.data?.error || 'Erro ao desvincular conta.'
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-3xl mx-auto space-y-6">
            {hasPartner ? (
                <Card className="text-center py-12">
                    <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
                        <LinkIcon size={40} />
                    </div>
                    <h3 className="text-2xl font-bold mb-2">Contas Vinculadas</h3>
                    <p className="text-slate-500 max-w-md mx-auto mb-8">
                        As finanças de <span className="font-bold text-slate-900 dark:text-white">{user?.name}</span> e <span className="font-bold text-slate-900 dark:text-white">{partner?.name}</span> estão sincronizadas. Ambos podem visualizar e gerenciar o orçamento familiar.
                    </p>

                    <div className="flex items-center justify-center gap-8 mb-10">
                        <div className="flex flex-col items-center gap-3">
                            <div className="w-16 h-16 rounded-full bg-blue-500 flex items-center justify-center text-xl font-bold text-white border-4 border-white shadow-lg">
                                {user?.name?.charAt(0).toUpperCase()}
                            </div>
                            <span className="font-medium">{user?.name}</span>
                        </div>
                        <div className="h-px w-24 bg-slate-200 relative">
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white dark:bg-slate-900 p-2 text-emerald-500 rounded-full border border-slate-100 dark:border-slate-800 shadow-sm">
                                <CheckCircle2 size={16} />
                            </div>
                        </div>
                        <div className="flex flex-col items-center gap-3">
                            <div className="w-16 h-16 rounded-full bg-purple-500 flex items-center justify-center text-xl font-bold text-white border-4 border-white shadow-lg">
                                {partner?.name?.charAt(0).toUpperCase()}
                            </div>
                            <span className="font-medium">{partner?.name}</span>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-1 gap-4 max-w-lg mx-auto">
                        <button
                            onClick={handleUnlinkPartner}
                            disabled={loading}
                            className="flex items-center justify-center gap-2 p-3 rounded-xl border border-rose-200 dark:border-rose-900/30 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/10 font-medium transition-colors disabled:opacity-50"
                        >
                            <Unlink size={18} /> {loading ? 'Desvinculando...' : 'Desvincular'}
                        </button>
                    </div>
                </Card>
            ) : (
                <Card className="text-center py-12">
                    <div className="w-20 h-20 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto mb-6">
                        <LinkIcon size={40} />
                    </div>
                    <h3 className="text-2xl font-bold mb-2">Nenhuma Conta Vinculada</h3>
                    <p className="text-slate-500 max-w-md mx-auto mb-8">
                        Vincule sua conta com a do seu parceiro(a) para gerenciar as finanças juntos.
                    </p>
                </Card>
            )}

            <Card>
                <h4 className="font-bold mb-4 flex items-center gap-2">
                    <QrCode size={20} className="text-slate-400" />
                    Sincronizar com Parceiro
                </h4>

                <div className="flex flex-col gap-6">
                    {/* Área do Meu Código */}
                    <div className="grid gap-6 overflow-hidden rounded-3xl border border-emerald-100 bg-gradient-to-br from-emerald-50 via-white to-teal-50 p-5 dark:border-emerald-900/30 dark:from-emerald-950/30 dark:via-slate-900 dark:to-teal-950/20 sm:grid-cols-[auto_1fr] sm:items-center sm:p-6">
                        <div className="duoo-qr-enter relative mx-auto overflow-hidden rounded-2xl bg-white p-3 shadow-sm ring-1 ring-emerald-100 dark:ring-emerald-900/30">
                            {myCode ? <><QRCodeSVG value={`duoo://partner/${myCode}`} size={156} bgColor="#ffffff" fgColor="#0f172a" level="M" includeMargin /><span className="duoo-qr-scan pointer-events-none absolute left-3 right-3 top-1/2 h-px bg-emerald-500 shadow-[0_0_12px_2px_rgba(16,185,129,0.55)]" /></> : <div className="flex h-[156px] w-[156px] animate-pulse items-center justify-center rounded-xl bg-slate-100 text-xs text-slate-400">Gerando QR</div>}
                        </div>
                        <div className="min-w-0 text-center sm:text-left">
                            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300"><QrCode size={14} /> Compartilhe por QR Code</div>
                            <p className="text-lg font-semibold text-slate-900 dark:text-white">Convide seu parceiro para o Duoo</p>
                            <p className="mt-1 text-sm leading-relaxed text-slate-600 dark:text-slate-400">A outra pessoa pode escanear este código ou copiar o código de acesso abaixo.</p>
                            <div className="mt-4 flex flex-wrap items-center justify-center gap-3 sm:justify-start">
                                <div className="rounded-xl border border-emerald-200 bg-white px-4 py-2 font-mono text-lg font-bold tracking-[0.2em] text-emerald-700 dark:border-emerald-900 dark:bg-slate-900 dark:text-emerald-300">{myCode || '------'}</div>
                                <button onClick={handleCopyCode} className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-white px-3 py-2 text-sm font-medium text-emerald-700 transition-colors hover:bg-emerald-100 dark:border-emerald-900 dark:bg-slate-900 dark:text-emerald-300 dark:hover:bg-emerald-900/40" title={copied ? 'Copiado!' : 'Copiar código'}>{copied ? <CheckCircle2 size={17} /> : <Copy size={17} />}{copied ? 'Copiado' : 'Copiar código'}</button>
                            </div>
                        </div>
                    </div>

                    {!hasPartner && (
                        <>
                            <div className="relative">
                                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-100 dark:border-slate-800"></div></div>
                                <div className="relative flex justify-center text-xs uppercase"><span className="px-3 bg-white dark:bg-slate-900 text-slate-400 font-medium">Ou insira o código dele(a)</span></div>
                            </div>

                            {/* Área de Inserir Código */}
                            <div className="flex flex-col sm:flex-row gap-3">
                                <input
                                    type="text"
                                    value={partnerCode}
                                    onChange={(e) => setPartnerCode(e.target.value.toUpperCase())}
                                    placeholder="Digite o código do parceiro (Ex: A1B2C3)"
                                    className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 uppercase placeholder:normal-case font-medium"
                                    maxLength={6}
                                    disabled={loading}
                                />
                                <button
                                    onClick={handleLinkPartner}
                                    disabled={loading || !partnerCode.trim()}
                                    className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-6 py-3 rounded-xl text-sm font-bold hover:bg-slate-800 dark:hover:bg-slate-200 transition-colors shadow-lg shadow-slate-900/10 dark:shadow-white/5 whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {loading ? 'Vinculando...' : 'Vincular Conta'}
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </Card>
            {toast && (
                <Toast
                    message={toast.message}
                    type={toast.type}
                    onClose={() => setToast(null)}
                />
            )}

            <ConfirmModal
                isOpen={unlinkConfirmOpen}
                onClose={() => setUnlinkConfirmOpen(false)}
                onConfirm={confirmUnlinkPartner}
                title="Desvincular Contas"
                message="Tem certeza que deseja desvincular as contas? Esta ação não pode ser desfeita."
                type="danger"
                confirmText="Desvincular"
                cancelText="Cancelar"
            />
        </div>
    );
};

export default LinkAccounts;
