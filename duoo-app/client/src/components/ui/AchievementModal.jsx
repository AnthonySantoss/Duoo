import React, { useEffect, useState } from 'react';
import { Trophy, Sparkles, X } from 'lucide-react';

const AchievementModal = ({ achievement, onClose }) => {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        if (achievement) {
            // Trigger animation after mount
            setTimeout(() => setIsVisible(true), 50);
        }
    }, [achievement]);

    if (!achievement) return null;

    const handleClose = () => {
        setIsVisible(false);
        setTimeout(onClose, 300); // Wait for animation to complete
    };

    return (
        <>
            {/* Overlay */}
            <div
                className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-50 transition-opacity duration-300 ${isVisible ? 'opacity-100' : 'opacity-0'
                    }`}
                onClick={handleClose}
            />

            {/* Modal */}
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
                <div
                    className={`bg-gradient-to-br from-amber-50 to-orange-50 dark:from-slate-900 dark:to-slate-800 rounded-3xl shadow-2xl max-w-md w-full p-8 relative pointer-events-auto border-2 border-amber-200 dark:border-amber-900/50 transition-all duration-500 ${isVisible
                            ? 'scale-100 opacity-100 translate-y-0'
                            : 'scale-75 opacity-0 translate-y-8'
                        }`}
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Close button */}
                    <button
                        onClick={handleClose}
                        className="absolute top-4 right-4 p-2 rounded-full bg-white/50 dark:bg-slate-800/50 hover:bg-white dark:hover:bg-slate-700 transition-colors"
                    >
                        <X size={20} className="text-slate-600 dark:text-slate-300" />
                    </button>

                    {/* Sparkles decoration */}
                    <div className="absolute -top-2 -right-2 animate-bounce">
                        <Sparkles className="text-amber-400" size={32} />
                    </div>
                    <div className="absolute -bottom-2 -left-2 animate-bounce delay-150">
                        <Sparkles className="text-amber-400" size={24} />
                    </div>

                    {/* Content */}
                    <div className="text-center space-y-6">
                        {/* Trophy Icon with animation */}
                        <div className="relative inline-block">
                            <div className="absolute inset-0 bg-amber-400/30 rounded-full blur-2xl animate-pulse" />
                            <div className="relative bg-gradient-to-br from-amber-400 to-orange-500 p-6 rounded-full shadow-lg transform hover:scale-110 transition-transform">
                                <Trophy size={64} className="text-white" strokeWidth={2} />
                            </div>
                        </div>

                        {/* Title */}
                        <div>
                            <h2 className="text-3xl font-bold text-amber-900 dark:text-amber-100 mb-2">
                                🎉 Conquista Desbloqueada!
                            </h2>
                            <h3 className="text-xl font-bold text-slate-800 dark:text-white">
                                {achievement.title}
                            </h3>
                        </div>

                        {/* Description */}
                        <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed">
                            {achievement.description}
                        </p>

                        {/* Points/Reward */}
                        {achievement.points && (
                            <div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-100 dark:bg-amber-900/30 rounded-full">
                                <Sparkles size={16} className="text-amber-600 dark:text-amber-400" />
                                <span className="font-bold text-amber-700 dark:text-amber-300">
                                    +{achievement.points} pontos
                                </span>
                            </div>
                        )}

                        {/* Action Button */}
                        <button
                            onClick={handleClose}
                            className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold py-4 px-8 rounded-2xl shadow-lg shadow-amber-500/30 transition-all transform hover:scale-105 active:scale-95"
                        >
                            Continuar
                        </button>
                    </div>

                    {/* Confetti effect (CSS only) */}
                    <style>{`
            @keyframes confetti-fall {
              0% { transform: translateY(-100%) rotate(0deg); opacity: 1; }
              100% { transform: translateY(100vh) rotate(360deg); opacity: 0; }
            }
            .confetti {
              position: absolute;
              width: 10px;
              height: 10px;
              background: #fbbf24;
              animation: confetti-fall 3s linear infinite;
            }
          `}</style>
                </div>
            </div>
        </>
    );
};

export default AchievementModal;
