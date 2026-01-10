import React, { useState } from 'react';
import { User, Mail, Lock, Eye, EyeOff, UserPlus, LogIn, Chrome, Github } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const Auth = () => {
    const { login, register } = useAuth();
    const navigate = useNavigate();
    const [isRegistering, setIsRegistering] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [formData, setFormData] = useState({ name: '', email: '', password: '' });
    const [error, setError] = useState('');

    const toggleMode = () => {
        setIsRegistering(!isRegistering);
        setFormData({ name: '', email: '', password: '' });
        setError('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        try {
            if (isRegistering) {
                await register(formData.name, formData.email, formData.password);
            } else {
                await login(formData.email, formData.password);
            }
            navigate('/dashboard');
        } catch (err) {
            setError(err.response?.data?.error || 'Authentication failed');
        }
    };

    return (
        <div className="flex min-h-screen bg-white dark:bg-slate-950 font-sans">
            {/* Branding Side */}
            <div className="hidden lg:flex w-1/2 bg-emerald-600 relative overflow-hidden items-center justify-center p-12">
                <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '40px 40px' }}></div>
                <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
                <div className="absolute bottom-0 left-0 w-96 h-96 bg-teal-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>

                <div className="relative z-10 text-white max-w-lg">
                    <div className="bg-white/10 backdrop-blur-lg border border-white/20 p-4 rounded-2xl w-fit mb-8 shadow-xl">
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white">
                            <circle cx="9" cy="12" r="6" />
                            <circle cx="15" cy="12" r="6" />
                        </svg>
                    </div>
                    <h1 className="text-5xl font-bold mb-6 tracking-tight leading-tight">
                        {isRegistering ? "Comece sua jornada financeira." : "Bem-vindo de volta ao Duoo."}
                    </h1>
                    <p className="text-emerald-50 text-xl leading-relaxed font-light opacity-90">
                        {isRegistering
                            ? "Crie sua conta em segundos e comece a planejar o futuro com quem você ama. Simplicidade e transparência para o casal."
                            : "Acesse seu painel, acompanhe suas metas compartilhadas e mantenha as finanças do casal em perfeita sintonia."}
                    </p>

                    <div className="mt-12 flex items-center gap-4">
                        <div className="flex -space-x-3">
                            <div className="w-10 h-10 rounded-full bg-blue-400 border-2 border-emerald-600"></div>
                            <div className="w-10 h-10 rounded-full bg-purple-400 border-2 border-emerald-600"></div>
                            <div className="w-10 h-10 rounded-full bg-amber-400 border-2 border-emerald-600"></div>
                        </div>
                        <p className="text-sm font-medium">+2.500 casais já usam</p>
                    </div>
                </div>
            </div>

            {/* Form Side */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-slate-50 dark:bg-slate-950">
                <div className="w-full max-w-md space-y-8">
                    {/* Mobile Header logic omitted for brevity but can be re-added */}

                    <div className="text-center lg:text-left">
                        <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
                            {isRegistering ? "Crie sua conta" : "Acesse sua conta"}
                        </h2>
                        <p className="mt-2 text-slate-500 text-sm">
                            {isRegistering ? "Já tem cadastro? " : "Novo por aqui? "}
                            <button onClick={toggleMode} className="font-bold text-emerald-600 hover:text-emerald-500 transition-colors">
                                {isRegistering ? "Fazer Login" : "Cadastre-se grátis"}
                            </button>
                        </p>
                    </div>

                    <div className="mt-8 space-y-5">
                        <div className="grid grid-cols-2 gap-3">
                            <button className="flex items-center justify-center gap-2 p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-sm font-medium text-slate-700 dark:text-slate-300">
                                <Chrome size={18} /> Google
                            </button>
                            <button className="flex items-center justify-center gap-2 p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-sm font-medium text-slate-700 dark:text-slate-300">
                                <Github size={18} /> Apple
                            </button>
                        </div>

                        <div className="relative">
                            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200 dark:border-slate-800"></div></div>
                            <div className="relative flex justify-center text-xs uppercase"><span className="px-2 bg-slate-50 dark:bg-slate-950 text-slate-400 font-medium">Ou continue com email</span></div>
                        </div>

                        {error && <div className="text-red-500 text-sm text-center bg-red-50 p-2 rounded">{error}</div>}

                        <form className="space-y-4" onSubmit={handleSubmit}>
                            {isRegistering && (
                                <div className="space-y-1">
                                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Nome Completo</label>
                                    <div className="relative">
                                        <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                        <input
                                            type="text"
                                            placeholder="Ex: Ana Silva"
                                            className="w-full pl-10 pr-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all text-sm"
                                            value={formData.name}
                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        />
                                    </div>
                                </div>
                            )}

                            <div className="space-y-1">
                                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Email</label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                    <input
                                        type="email"
                                        placeholder="seu@email.com"
                                        className="w-full pl-10 pr-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all text-sm"
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="space-y-1">
                                <div className="flex justify-between items-center">
                                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Senha</label>
                                    {!isRegistering && <a href="#" className="text-xs text-emerald-600 hover:text-emerald-500 font-medium">Esqueceu a senha?</a>}
                                </div>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        placeholder="••••••••"
                                        className="w-full pl-10 pr-10 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all text-sm"
                                        value={formData.password}
                                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                    />
                                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                            </div>

                            <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-emerald-500/30 flex items-center justify-center gap-2 mt-6">
                                {isRegistering ? <><UserPlus size={20} /> Criar Conta Grátis</> : <><LogIn size={20} /> Entrar na Conta</>}
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Auth;
