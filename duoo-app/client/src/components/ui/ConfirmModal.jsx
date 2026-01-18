import React from 'react';
import { AlertTriangle, Info, CheckCircle } from 'lucide-react';

const ConfirmModal = ({ isOpen, onClose, onConfirm, title, message, type = 'warning', confirmText = 'Confirmar', cancelText = 'Cancelar' }) => {
    if (!isOpen) return null;

    const getIcon = () => {
        switch (type) {
            case 'danger':
                return <AlertTriangle className="text-rose-600" size={48} />;
            case 'info':
                return <Info className="text-blue-600" size={48} />;
            case 'success':
                return <CheckCircle className="text-emerald-600" size={48} />;
            default:
                return <AlertTriangle className="text-yellow-600" size={48} />;
        }
    };

    const getButtonColor = () => {
        switch (type) {
            case 'danger':
                return 'bg-rose-600 hover:bg-rose-700';
            case 'info':
                return 'bg-blue-600 hover:bg-blue-700';
            case 'success':
                return 'bg-emerald-600 hover:bg-emerald-700';
            default:
                return 'bg-yellow-600 hover:bg-yellow-700';
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-6 animate-in fade-in zoom-in duration-200">
                <div className="flex flex-col items-center text-center space-y-4">
                    {getIcon()}
                    <div>
                        <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
                            {title}
                        </h3>
                        <p className="text-slate-600 dark:text-slate-400 whitespace-pre-line">
                            {message}
                        </p>
                    </div>
                </div>

                <div className="flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 py-3 px-4 rounded-xl border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                    >
                        {cancelText}
                    </button>
                    <button
                        onClick={() => {
                            onConfirm();
                            onClose();
                        }}
                        className={`flex-1 py-3 px-4 rounded-xl text-white font-bold transition-colors shadow-lg ${getButtonColor()}`}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConfirmModal;
