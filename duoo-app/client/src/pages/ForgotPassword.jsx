import React, { useState } from 'react';
import { ArrowLeft, Mail, Send } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../services/api';

const ForgotPassword = () => {
    const [email, setEmail] = useState('');
    const [sent, setSent] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const submit = async (event) => {
        event.preventDefault(); setLoading(true); setError('');
        try { await api.post('/auth/forgot-password', { email }); setSent(true); }
        catch (requestError) { setError(requestError.response?.data?.error || 'Não foi possível solicitar a recuperação agora.'); }
        finally { setLoading(false); }
    };
    return <main className="flex min-h-[100dvh] items-start justify-center overflow-y-auto bg-[#f4f7f3] p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-[calc(1rem+env(safe-area-inset-top))] text-slate-950 dark:bg-slate-950 dark:text-white sm:items-center sm:p-5"><div className="my-auto w-full max-w-md rounded-[28px] border border-slate-200/80 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900 sm:p-10"><Link to="/login" className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-slate-500 hover:text-emerald-600"><ArrowLeft size={16} /> Voltar para o login</Link><div className="mt-7 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700"><Send size={24} /></div><h1 className="mt-6 text-3xl font-semibold tracking-tight">Recupere seu acesso.</h1><p className="mt-3 text-sm leading-relaxed text-slate-500">Informe seu e-mail e enviaremos um link para criar uma nova senha.</p>{sent ? <div className="mt-7 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm leading-relaxed text-emerald-800">Se o e-mail estiver cadastrado, você receberá as instruções em alguns instantes.</div> : <form onSubmit={submit} className="mt-7 space-y-5"><label className="block text-sm font-medium">E-mail<span className="relative mt-2 block"><Mail className="absolute left-3 top-3.5 text-slate-400" size={18} /><input required name="email" autoComplete="email" inputMode="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="voce@exemplo.com" className="w-full rounded-2xl border border-slate-200 bg-white py-3.5 pl-10 pr-4 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 dark:border-slate-800 dark:bg-slate-950" /></span></label>{error && <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}<button disabled={loading} className="min-h-11 w-full rounded-2xl bg-emerald-600 py-3.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60">{loading ? 'Enviando...' : 'Enviar link de recuperação'}</button></form>}</div></main>;
};

export default ForgotPassword;
