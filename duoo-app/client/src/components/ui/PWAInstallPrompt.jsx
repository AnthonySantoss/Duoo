import React, { useState, useEffect } from 'react';
import { Download, X, Smartphone } from 'lucide-react';

const PWAInstallPrompt = () => {
    const [deferredPrompt, setDeferredPrompt] = useState(null);
    const [showPrompt, setShowPrompt] = useState(false);

    useEffect(() => {
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;

        const handler = (e) => {
            e.preventDefault();
            setDeferredPrompt(e);

            const dismissed = localStorage.getItem('pwaInstallDismissed');
            if (!dismissed && !isStandalone) {
                setTimeout(() => setShowPrompt(true), 5000);
            }
        };

        window.addEventListener('beforeinstallprompt', handler);

        // Se for iOS e não estiver instalado, mostramos o prompt customizado
        if (isIOS && !isStandalone) {
            const dismissed = localStorage.getItem('pwaInstallDismissed');
            if (!dismissed) {
                setTimeout(() => setShowPrompt(true), 10000);
            }
        }

        return () => window.removeEventListener('beforeinstallprompt', handler);
    }, []);

    const handleInstall = async () => {
        if (!deferredPrompt) return;

        // Show the install prompt
        deferredPrompt.prompt();

        // Wait for the user to respond to the prompt
        const { outcome } = await deferredPrompt.userChoice;

        if (outcome === 'accepted') {
            console.log('User accepted the install prompt');
        } else {
            console.log('User dismissed the install prompt');
        }

        // Clear the deferredPrompt
        setDeferredPrompt(null);
        setShowPrompt(false);
    };

    const handleDismiss = () => {
        localStorage.setItem('pwaInstallDismissed', 'true');
        setShowPrompt(false);
    };

    if (!showPrompt || !deferredPrompt) return null;

    return (
        <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-md z-50 animate-slide-up">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 p-6">
                <div className="flex items-start gap-4">
                    <div className="p-3 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl flex-shrink-0">
                        <Smartphone className="text-emerald-600 dark:text-emerald-400" size={24} />
                    </div>
                    <div className="flex-1">
                        <h3 className="font-bold text-slate-900 dark:text-white mb-1">
                            Instalar Duoo
                        </h3>
                        {/iPad|iPhone|iPod/.test(navigator.userAgent) ? (
                            <div className="space-y-3">
                                <p className="text-sm text-slate-600 dark:text-slate-400">
                                    Para instalar no iPhone e receber notificações:
                                </p>
                                <div className="text-sm font-medium text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-slate-900/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                                    Toque em <span className="text-emerald-500">Compartilhar</span> (ícone <span className="inline-block border border-slate-300 dark:border-slate-600 px-1 rounded mx-1">↑</span>) e depois em <span className="text-emerald-500 font-bold">Adicionar à Tela de Início</span>.
                                </div>
                                <button
                                    onClick={handleDismiss}
                                    className="w-full py-2 px-4 bg-emerald-500 text-white font-bold rounded-xl transition-colors text-sm"
                                >
                                    Fazer Adição Depois
                                </button>
                            </div>
                        ) : (
                            <>
                                <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                                    Instale o app na sua tela inicial para acesso rápido e experiência completa, mesmo offline.
                                </p>
                                <div className="flex gap-2">
                                    <button
                                        onClick={handleInstall}
                                        className="flex-1 flex items-center justify-center gap-2 py-2 px-4 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl transition-colors text-sm"
                                    >
                                        <Download size={16} />
                                        Instalar
                                    </button>
                                    <button
                                        onClick={handleDismiss}
                                        className="flex-1 py-2 px-4 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 font-medium rounded-xl transition-colors text-sm"
                                    >
                                        Agora não
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                    <button
                        onClick={handleDismiss}
                        className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors flex-shrink-0"
                    >
                        <X size={20} />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PWAInstallPrompt;
