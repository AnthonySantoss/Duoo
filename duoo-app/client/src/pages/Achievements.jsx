import React, { useState, useEffect } from 'react';
import { Trophy, Star, Target, TrendingUp, Award, Lock } from 'lucide-react';
import Card from '../components/ui/Card';
import Toast from '../components/ui/Toast';
import Modal from '../components/ui/Modal';
import api from '../services/api';

const Achievements = () => {
    const [achievements, setAchievements] = useState([]);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [toast, setToast] = useState(null);
    const [newAchievement, setNewAchievement] = useState(null);

    useEffect(() => {
        fetchData();
        checkNewAchievements();
    }, []);

    const fetchData = async () => {
        try {
            const [achievementsRes, statsRes] = await Promise.all([
                api.get('/achievements'),
                api.get('/achievements/stats')
            ]);

            setAchievements(achievementsRes.data);
            setStats(statsRes.data);
        } catch (error) {
            console.error('Failed to fetch achievements:', error);
            setToast({ message: 'Erro ao carregar conquistas', type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const checkNewAchievements = async () => {
        try {
            const res = await api.get('/achievements/new');
            if (res.data.length > 0) {
                setNewAchievement(res.data[0]);
            }
        } catch (error) {
            console.error('Failed to check new achievements:', error);
        }
    };

    const handleCloseNewAchievement = async () => {
        if (newAchievement) {
            try {
                await api.post('/achievements/mark-seen', {
                    achievement_ids: [newAchievement.id]
                });
            } catch (error) {
                console.error('Failed to mark as seen:', error);
            }
        }
        setNewAchievement(null);
        fetchData();
    };

    const getCategoryColor = (category) => {
        const colors = {
            financial: 'emerald',
            engagement: 'blue',
            milestone: 'purple',
            social: 'pink'
        };
        return colors[category] || 'slate';
    };

    const getCategoryName = (category) => {
        const names = {
            financial: 'Financeiro',
            engagement: 'Engajamento',
            milestone: 'Marco',
            social: 'Social'
        };
        return names[category] || category;
    };

    const unlockedCount = achievements.filter(a => a.is_unlocked).length;
    const totalPoints = achievements
        .filter(a => a.is_unlocked)
        .reduce((sum, a) => sum + a.points, 0);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {toast && (
                <Toast
                    message={toast.message}
                    type={toast.type}
                    onClose={() => setToast(null)}
                />
            )}

            {/* Modal de Nova Conquista */}
            <Modal
                isOpen={!!newAchievement}
                onClose={handleCloseNewAchievement}
                title="🎉 Nova Conquista Desbloqueada!"
            >
                {newAchievement && (
                    <div className="text-center space-y-6 py-6">
                        <div className="text-8xl animate-bounce">
                            {newAchievement.icon}
                        </div>
                        <div>
                            <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                                {newAchievement.title}
                            </h3>
                            <p className="text-slate-600 dark:text-slate-400">
                                {newAchievement.description}
                            </p>
                        </div>
                        <div className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-500 to-blue-500 rounded-full text-white font-bold text-lg shadow-lg">
                            <Star size={24} className="fill-current" />
                            +{newAchievement.points} pontos
                        </div>
                        <button
                            onClick={handleCloseNewAchievement}
                            className="w-full py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold transition-colors"
                        >
                            Continuar
                        </button>
                    </div>
                )}
            </Modal>

            <h3 className="text-2xl font-bold text-slate-900 dark:text-white">🏆 Conquistas</h3>

            {/* Estatísticas */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="p-6">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-emerald-100 dark:bg-emerald-900/20 rounded-full">
                            <Trophy className="text-emerald-600 dark:text-emerald-400" size={24} />
                        </div>
                        <div>
                            <p className="text-sm text-slate-500 dark:text-slate-400">Desbloqueadas</p>
                            <p className="text-2xl font-bold text-slate-900 dark:text-white">
                                {unlockedCount}/{achievements.length}
                            </p>
                        </div>
                    </div>
                </Card>

                <Card className="p-6">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-blue-100 dark:bg-blue-900/20 rounded-full">
                            <Star className="text-blue-600 dark:text-blue-400" size={24} />
                        </div>
                        <div>
                            <p className="text-sm text-slate-500 dark:text-slate-400">Pontos Totais</p>
                            <p className="text-2xl font-bold text-slate-900 dark:text-white">{totalPoints}</p>
                        </div>
                    </div>
                </Card>

                <Card className="p-6">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-purple-100 dark:bg-purple-900/20 rounded-full">
                            <TrendingUp className="text-purple-600 dark:text-purple-400" size={24} />
                        </div>
                        <div>
                            <p className="text-sm text-slate-500 dark:text-slate-400">Sequência</p>
                            <p className="text-2xl font-bold text-slate-900 dark:text-white">
                                {stats?.streak || 0} dias
                            </p>
                        </div>
                    </div>
                </Card>

                <Card className="p-6">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-pink-100 dark:bg-pink-900/20 rounded-full">
                            <Target className="text-pink-600 dark:text-pink-400" size={24} />
                        </div>
                        <div>
                            <p className="text-sm text-slate-500 dark:text-slate-400">Metas Completas</p>
                            <p className="text-2xl font-bold text-slate-900 dark:text-white">
                                {stats?.completedGoals || 0}
                            </p>
                        </div>
                    </div>
                </Card>
            </div>

            {/* Lista de Conquistas */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {achievements.map(achievement => {
                    const color = getCategoryColor(achievement.category);
                    const isLocked = !achievement.is_unlocked;

                    return (
                        <Card
                            key={achievement.id}
                            className={`p-6 relative overflow-hidden transition-all ${isLocked
                                    ? 'opacity-60 grayscale'
                                    : 'hover:shadow-lg hover:scale-105'
                                }`}
                        >
                            {achievement.is_new && (
                                <div className="absolute top-2 right-2">
                                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-bold bg-red-500 text-white animate-pulse">
                                        NOVO!
                                    </span>
                                </div>
                            )}

                            <div className="text-center space-y-4">
                                <div className="text-6xl">
                                    {isLocked ? <Lock size={48} className="mx-auto text-slate-400" /> : achievement.icon}
                                </div>

                                <div>
                                    <h4 className="font-bold text-lg text-slate-900 dark:text-white mb-1">
                                        {achievement.title}
                                    </h4>
                                    <p className="text-sm text-slate-600 dark:text-slate-400">
                                        {achievement.description}
                                    </p>
                                </div>

                                <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-700">
                                    <span className={`text-xs px-3 py-1 rounded-full bg-${color}-100 dark:bg-${color}-900/20 text-${color}-700 dark:text-${color}-400 font-medium`}>
                                        {getCategoryName(achievement.category)}
                                    </span>
                                    <span className="flex items-center gap-1 text-sm font-bold text-slate-900 dark:text-white">
                                        <Star size={16} className={isLocked ? '' : 'fill-yellow-400 text-yellow-400'} />
                                        {achievement.points}
                                    </span>
                                </div>

                                {achievement.is_unlocked && achievement.unlocked_at && (
                                    <p className="text-xs text-slate-500">
                                        Desbloqueada em {new Date(achievement.unlocked_at).toLocaleDateString('pt-BR')}
                                    </p>
                                )}
                            </div>
                        </Card>
                    );
                })}
            </div>
        </div>
    );
};

export default Achievements;
