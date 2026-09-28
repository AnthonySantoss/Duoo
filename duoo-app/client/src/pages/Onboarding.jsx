import React, { useState } from 'react';
import { ArrowUpRight, Bell, Check, ChevronLeft, ChevronRight, Heart, LockKeyhole, Smartphone, Sparkles, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const steps = [
    { eyebrow: 'Bem-vindos ao Duoo', title: 'O dinheiro de vocês, no mesmo ritmo.', description: 'Uma visão compartilhada para planejar, acompanhar e decidir juntos — sem complicar.', icon: Heart, accent: 'emerald', detail: 'Finanças compartilhadas' },
    { eyebrow: 'Privacidade em primeiro lugar', title: 'Organização sem abrir sua conta.', description: 'O Duoo não usa Open Finance. Seus dados ficam sob o controle de vocês, com transparência em cada etapa.', icon: LockKeyhole, accent: 'blue', detail: 'Sem acesso bancário' },
    { eyebrow: 'Automação tranquila', title: 'Seus avisos viram organização.', description: 'No Android, o Duoo identifica notificações de compras, Pix e transferências para registrar tudo no lugar certo.', icon: Bell, accent: 'amber', detail: 'Captura ativa do Android' },
    { eyebrow: 'Agora é com vocês', title: 'Construam um plano que faça sentido.', description: 'Comecem com uma conta, convidem seu parceiro quando quiserem e acompanhem cada conquista em conjunto.', icon: Users, accent: 'violet', detail: 'Decisões melhores, juntos' },
];

const accentMap = {
    emerald: { soft: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-400', line: 'bg-emerald-500', glow: 'bg-emerald-300/30' },
    blue: { soft: 'bg-blue-100 text-blue-700', dot: 'bg-blue-400', line: 'bg-blue-500', glow: 'bg-blue-300/30' },
    amber: { soft: 'bg-amber-100 text-amber-700', dot: 'bg-amber-400', line: 'bg-amber-500', glow: 'bg-amber-300/30' },
    violet: { soft: 'bg-violet-100 text-violet-700', dot: 'bg-violet-400', line: 'bg-violet-500', glow: 'bg-violet-300/30' },
};

const Brand = () => <div className="flex items-center gap-2.5"><span className="flex h-9 w-9 items-center justify-center rounded-[13px] bg-emerald-100 text-emerald-700"><svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><circle cx="9" cy="12" r="6" /><circle cx="15" cy="12" r="6" /></svg></span><span className="text-xl font-semibold tracking-tight">duoo</span></div>;

const Illustration = ({ step }) => {
    const colors = accentMap[step.accent];
    const Icon = step.icon;
    return <div className="duoo-onboarding-art relative mx-auto flex h-[300px] w-full max-w-[430px] items-center justify-center overflow-hidden rounded-[36px] bg-white/60 shadow-[0_24px_80px_rgba(10,143,99,0.10)] ring-1 ring-black/[0.04] sm:h-[430px] lg:h-[min(58vh,540px)] lg:max-w-none">
        <div className="duoo-onboarding-grid absolute inset-0 opacity-70" />
        <div className={`duoo-onboarding-orb duoo-onboarding-orb-one absolute -left-12 -top-12 h-44 w-44 rounded-full blur-2xl ${colors.glow}`} />
        <div className={`duoo-onboarding-orb duoo-onboarding-orb-two absolute -bottom-16 -right-8 h-52 w-52 rounded-full blur-3xl ${colors.glow}`} />
        <span className={`duoo-onboarding-float absolute left-[19%] top-[22%] h-3 w-3 rounded-full ${colors.dot}`} />
        <span className={`duoo-onboarding-float duoo-onboarding-float-delay absolute right-[22%] top-[28%] h-5 w-5 rounded-full ${colors.dot}/70`} />
        <span className={`duoo-onboarding-float duoo-onboarding-float-delay-2 absolute bottom-[22%] left-[28%] h-2 w-2 rounded-full ${colors.dot}`} />
        <div key={step.eyebrow} className="duoo-onboarding-illustration relative z-10 flex flex-col items-center gap-5"><div className={`duoo-onboarding-icon flex h-28 w-28 items-center justify-center rounded-[32px] bg-white text-slate-900 shadow-[0_20px_45px_rgba(15,23,42,0.14)] ring-1 ring-black/[0.04] ${colors.soft}`}><Icon size={52} strokeWidth={1.65} /></div><div className="flex items-center gap-2 rounded-full bg-white/80 px-4 py-2 text-xs font-medium text-slate-600 shadow-sm ring-1 ring-black/[0.04] backdrop-blur"><Sparkles size={14} className={colors.soft.split(' ')[1]} />{step.detail}</div></div>
        <div className="absolute bottom-5 right-5 flex h-9 w-9 items-center justify-center rounded-full bg-white/80 text-slate-400 shadow-sm ring-1 ring-black/[0.04]"><ArrowUpRight size={16} /></div>
    </div>;
};

const Onboarding = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [step, setStep] = useState(0);
    const [direction, setDirection] = useState(1);
    const current = steps[step];
    const colors = accentMap[current.accent];
    const finish = () => { localStorage.setItem('duoo:onboarding-complete', 'true'); navigate('/dashboard', { replace: true }); };
    const move = (nextStep) => { setDirection(nextStep > step ? 1 : -1); setStep(nextStep); };
    const next = () => (step === steps.length - 1 ? finish() : move(step + 1));

    return <main className="duoo-onboarding min-h-screen overflow-hidden bg-[#f6f8f5] px-5 py-5 text-slate-950 sm:px-8 sm:py-7 dark:bg-slate-950 dark:text-white"><div className="mx-auto flex min-h-[calc(100vh-2.5rem)] max-w-6xl flex-col sm:min-h-[calc(100vh-3.5rem)]"><header className="flex items-center justify-between"><Brand /><button onClick={finish} className="rounded-full px-3 py-2 text-sm font-medium text-slate-500 transition hover:bg-white hover:text-emerald-700 dark:hover:bg-slate-900">Pular</button></header><div className="flex flex-1 items-center py-8 sm:py-12 lg:py-8"><div className="grid w-full items-center gap-8 lg:grid-cols-[minmax(360px,.9fr)_1.1fr] lg:gap-16"><Illustration step={current} /><section className="mx-auto w-full max-w-xl lg:py-8"><div key={current.eyebrow} className={`duoo-onboarding-copy duoo-onboarding-copy-${direction}`}><p className={`text-[11px] font-semibold uppercase tracking-[0.18em] ${colors.soft.split(' ')[1]} sm:text-xs`}>{current.eyebrow}</p><h1 className="mt-4 max-w-lg text-[clamp(2.2rem,5vw,4.5rem)] font-semibold leading-[1.02] tracking-[-0.055em]">{current.title}</h1><p className="mt-5 max-w-lg text-[15px] leading-7 text-slate-500 sm:text-base dark:text-slate-400">{current.description}</p>{step === 2 && <div className="mt-6 flex items-start gap-3 rounded-2xl border border-amber-200/80 bg-amber-50/80 p-4 text-sm leading-relaxed text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-200"><Smartphone size={19} className="mt-0.5 shrink-0" /><span>Abra o app nativo no Android, permita o acesso às notificações e mantenha a captura ativa.</span></div>}{step === 3 && <div className="mt-6 flex items-center gap-3 rounded-2xl bg-white/70 p-4 text-sm text-slate-600 ring-1 ring-black/[0.04] dark:bg-slate-900 dark:text-slate-300"><Users size={19} className="shrink-0 text-violet-500" /> O convite pode ser feito em Menu → Conta do casal.</div>}</div><div className="mt-8 flex items-center gap-2 sm:mt-12" aria-label={`Etapa ${step + 1} de ${steps.length}`}>{steps.map((item, index) => <button key={item.eyebrow} onClick={() => move(index)} aria-label={`Ir para etapa ${index + 1}`} className={`h-2 rounded-full transition-all duration-500 ${index === step ? `w-10 ${colors.line}` : 'w-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700'}`} />)}<span className="ml-2 text-xs font-medium text-slate-400">0{step + 1} / 0{steps.length}</span></div><div className="mt-7 flex items-center justify-between gap-3 sm:mt-8"><button onClick={() => move(Math.max(0, step - 1))} disabled={step === 0} className="inline-flex min-h-12 items-center gap-1 rounded-2xl px-2 text-sm font-medium text-slate-500 transition hover:bg-white hover:text-slate-900 disabled:invisible dark:hover:bg-slate-900 sm:gap-2 sm:px-4"><ChevronLeft size={17} /> Voltar</button><button onClick={next} className={`inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-2xl px-5 text-sm font-semibold text-white shadow-lg transition hover:-translate-y-0.5 sm:flex-none ${colors.line}`}>{step === steps.length - 1 ? 'Começar no Duoo' : 'Continuar'}{step < steps.length - 1 ? <ChevronRight size={17} /> : <Check size={17} />}</button></div><p className="mt-5 text-center text-xs text-slate-400 sm:text-left">Olá, {user?.name?.split(' ')[0] || 'bem-vindo'}.</p></section></div></div></div></main>;
};

export default Onboarding;
