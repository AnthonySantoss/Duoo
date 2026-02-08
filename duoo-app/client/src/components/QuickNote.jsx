import React, { useState } from 'react';
import { Send, MessageSquareHeart } from 'lucide-react';
import api from '../services/api';
import Card from './ui/Card';
import Toast from './ui/Toast';

const QuickNote = () => {
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const [toast, setToast] = useState(null);

    const handleSend = async (e) => {
        e.preventDefault();
        if (!message.trim()) return;

        setLoading(true);
        try {
            await api.post('/notifications/send-to-partner', { message });
            setToast({ message: 'Recado enviado para o seu par! ❤️', type: 'success' });
            setMessage('');
            // Optional: trigger notification refresh for the local user too if we want, 
            // but this sends to partner.
        } catch (error) {
            console.error('Failed to send note:', error);
            setToast({ message: 'Erro ao enviar recado.', type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Card className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-md">
            <div className="flex items-center gap-2 mb-4">
                <div className="p-2 bg-rose-50 dark:bg-rose-900/30 text-rose-500 rounded-lg">
                    <MessageSquareHeart size={20} />
                </div>
                <div>
                    <h4 className="font-bold text-slate-900 dark:text-white">Mural de Recados</h4>
                    <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Deixe um mimo ou aviso</p>
                </div>
            </div>

            <form onSubmit={handleSend} className="relative">
                <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Ex: Amor, essa conta já está paga! ❤️"
                    className="w-full px-4 py-3 pb-12 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500 text-sm resize-none"
                    rows="3"
                />
                <button
                    type="submit"
                    disabled={loading || !message.trim()}
                    className="absolute bottom-3 right-3 p-2 bg-rose-500 hover:bg-rose-600 disabled:bg-slate-300 text-white rounded-lg transition-all shadow-lg shadow-rose-200 dark:shadow-rose-900/20"
                >
                    <Send size={18} />
                </button>
            </form>

            {toast && (
                <Toast
                    message={toast.message}
                    type={toast.type}
                    onClose={() => setToast(null)}
                />
            )}
        </Card>
    );
};

export default QuickNote;
