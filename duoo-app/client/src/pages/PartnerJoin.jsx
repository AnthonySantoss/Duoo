import React, { useEffect, useState } from 'react';
import { CheckCircle2, Link2, LoaderCircle, ShieldCheck } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import Card from '../components/ui/Card';
import Toast from '../components/ui/Toast';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const PartnerJoin = () => {
    const { user, loading: authLoading } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();
    const [status, setStatus] = useState('loading');
    const [message, setMessage] = useState('Validando convite...');
    const [toast, setToast] = useState(null);
    const code = new URLSearchParams(location.search).get('code')?.trim().toUpperCase();

    useEffect(() => {
        if (authLoading) return;
        if (!code || code.length !== 6) {
            setStatus('error');
            setMessage('Esse convite não é válido ou já expirou.');
            return;
        }
        if (!user) {
            localStorage.setItem('duoo:pending-partner-code', code);
            navigate('/login', { replace: true });
            return;
        }

        let cancelled = false;
        api.post('/partner/link', { partnerCode: code })
            .then((response) => {
                if (cancelled) return;
                localStorage.removeItem('duoo:pending-partner-code');
                setStatus('success');
                setMessage(response.data.message || 'Contas vinculadas com sucesso!');
                setTimeout(() => navigate('/dashboard/link-accounts', { replace: true }), 1200);
            })
            .catch((error) => {
                if (cancelled) return;
                setStatus('error');
                setMessage(error.response?.data?.error || 'Não foi possível concluir a vinculação.');
            });
        return () => { cancelled = true; };
    }, [authLoading, code, navigate, user]);

    return <main className="flex min-h-screen items-center justify-center bg-[#f6f8f5] p-5 dark:bg-slate-950"><Card className="w-full max-w-md p-8 text-center sm:p-10"><div className={`mx-auto flex h-16 w-16 items-center justify-center rounded-3xl ${status === 'success' ? 'bg-emerald-100 text-emerald-600' : status === 'error' ? 'bg-rose-100 text-rose-600' : 'bg-emerald-50 text-emerald-600'}`}>{status === 'loading' ? <LoaderCircle className="animate-spin" size={30} /> : status === 'success' ? <CheckCircle2 size={30} /> : <Link2 size={30} />}</div><h1 className="mt-6 text-2xl font-semibold tracking-tight text-slate-950 dark:text-white">{status === 'success' ? 'Convite aceito' : 'Convite do Duoo'}</h1><p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-slate-500 dark:text-slate-400">{message}</p>{status === 'error' && <button onClick={() => navigate('/dashboard/link-accounts')} className="mt-6 rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white">Voltar para contas</button>}<p className="mt-8 flex items-center justify-center gap-2 text-xs text-slate-400"><ShieldCheck size={14} /> Convites vinculam apenas as contas do casal.</p></Card>{toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}</main>;
};

export default PartnerJoin;
