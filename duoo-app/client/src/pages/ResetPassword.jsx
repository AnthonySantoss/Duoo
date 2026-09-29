import React, { useMemo, useState } from 'react';
import { ArrowLeft, Check, Lock, X } from 'lucide-react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import api from '../services/api';

const ResetPassword = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const token = searchParams.get('token') || '';
    const [password, setPassword] = useState('');
    const [confirmation, setConfirmation] = useState('');
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const rules = useMemo(() => ({ length: password.length >= 8, strong: /[A-Z]/.test(password) && /[a-z]/.test(password) && /\d/.test(password) && /[!@#$%^&*(),.?":{}|<>]/.test(password) }), [password]);
    const valid = rules.length && rules.strong && password === confirmation;
    const submit = async (event) => { event.preventDefault(); if (!token || !valid) return; setLoading(true); setError(''); try { const response = await api.post('/auth/reset-password', { token, password }); setMessage(response.data.message); setTimeout(() => navigate('/login'), 1600); } catch (requestError) { setError(requestError.response?.data?.error || 'Não foi possível redefinir a senha.'); } finally { setLoading(false); } };
    return <main className="flex min-h-screen items-center justify-center bg-[#f4f7f3] p-5 text-slate-950 dark:bg-slate-950 dark:text-white"><div className="w-full max-w-md rounded-[28px] border border-slate-200/80 bg-white p-7 shadow-xl dark:border-slate-800 dark:bg-slate-900 sm:p-10"><Link to="/login" className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-emerald-600"><ArrowLeft size={16} /> Voltar para o login</Link><h1 className="mt-10 text-3xl font-semibold tracking-tight">Crie uma nova senha.</h1>{message ? <div className="mt-7 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">{message}</div> : !token ? <div className="mt-7 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">Link de recuperação inválido.</div> : <form onSubmit={submit} className="mt-7 space-y-5"><label className="block text-sm font-medium">Nova senha<span className="relative mt-2 block"><Lock className="absolute left-3 top-3.5 text-slate-400" size={18} /><input required type="password" value={password} onChange={(event) => setPassword(event.target.value)} className="w-full rounded-2xl border border-slate-200 bg-white py-3.5 pl-10 pr-4 text-sm outline-none focus:border-emerald-500 dark:border-slate-800 dark:bg-slate-950" /></span></label><label className="block text-sm font-medium">Confirmar senha<input required type="password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-sm outline-none focus:border-emerald-500 dark:border-slate-800 dark:bg-slate-950" /></label><ul className="space-y-2 rounded-2xl bg-slate-100/70 p-4 text-xs dark:bg-slate-950"><li className={rules.length ? 'text-emerald-700' : 'text-slate-500'}>{rules.length ? <Check size={13} className="mr-1 inline" /> : <X size={13} className="mr-1 inline" />}Mínimo de 8 caracteres</li><li className={rules.strong ? 'text-emerald-700' : 'text-slate-500'}>{rules.strong ? <Check size={13} className="mr-1 inline" /> : <X size={13} className="mr-1 inline" />}Maiúscula, minúscula, número e caractere especial</li></ul>{error && <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}<button disabled={loading || !valid} className="w-full rounded-2xl bg-emerald-600 py-3.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60">{loading ? 'Salvando...' : 'Redefinir senha'}</button></form>}</div></main>;
};

export default ResetPassword;
