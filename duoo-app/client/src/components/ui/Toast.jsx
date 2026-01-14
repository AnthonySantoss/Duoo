import React, { useEffect } from 'react';
import { X, CheckCircle, AlertTriangle, Info } from 'lucide-react';

const Toast = ({ message, type = 'info', onClose, duration = 3000 }) => {
    useEffect(() => {
        const timer = setTimeout(() => {
            onClose();
        }, duration);
        return () => clearTimeout(timer);
    }, [duration, onClose]);

    const icons = {
        success: <CheckCircle size={20} />,
        error: <AlertTriangle size={20} />,
        info: <Info size={20} />
    };

    const styles = {
        success: "bg-emerald-500 text-white",
        error: "bg-rose-500 text-white",
        info: "bg-slate-800 text-white"
    };

    return (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg shadow-black/20 animate-in slide-in-from-right-full duration-300 ${styles[type]}`}>
            {icons[type]}
            <p className="font-medium text-sm">{message}</p>
            <button onClick={onClose} className="p-1 hover:bg-white/20 rounded-lg transition-colors">
                <X size={16} />
            </button>
        </div>
    );
};

export default Toast;
