import React, { useState, useEffect } from 'react';
import { Download, X, Smartphone } from 'lucide-react';

const PWAInstallPrompt = () => {
    const [deferredPrompt, setDeferredPrompt] = useState(null);
    const [showPrompt, setShowPrompt] = useState(false);

    useEffect(() => {
        const handler = (e) => {
            // Prevent the mini-infobar from appearing on mobile
            e.preventDefault();
            // Stash the event so it can be triggered later
            setDeferredPrompt(e);

            // Check if user has dismissed before
            const dismissed = localStorage.getItem('pwaInstallDismissed');
            if (!dismissed) {
                // Show prompt after 5 seconds
                setTimeout(() => {
                    setShowPrompt(true);
                }, 5000);
            }
        };

        window.addEventListener('beforeinstallprompt', handler);

        // Check if already installed
        if (window.matchMedia('(display-mode: standalone)').matches) {
            console.log('App is already installed');
        }

        return () => {
            window.removeEventListener('beforeinstallprompt', handler);
        };
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
