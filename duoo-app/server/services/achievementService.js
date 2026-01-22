const { Achievement, UserAchievement, Transaction, Goal, Wallet, User } = require('../models');
const { Op } = require('sequelize');
const notificationService = require('./notificationService');

/**
 * Service para gerenciar conquistas e verificar desbloqueios
 */
class AchievementService {

    /**
     * Verifica e desbloqueia conquistas para um usuário
     */
    async checkAndUnlockAchievements(userId) {
        try {
            const newAchievements = [];

            // Buscar todas as conquistas ativas
            const achievements = await Achievement.findAll({
                where: { is_active: true }
            });

            // Buscar conquistas já desbloqueadas
            const unlockedIds = await UserAchievement.findAll({
                where: { user_id: userId },
                attributes: ['achievement_id']
            });
            const unlockedSet = new Set(unlockedIds.map(u => u.achievement_id));

            // Verificar cada conquista
            for (const achievement of achievements) {
                // Pular se já desbloqueada
                if (unlockedSet.has(achievement.id)) continue;

                const isUnlocked = await this.checkRequirement(userId, achievement);

                if (isUnlocked) {
                    await UserAchievement.create({
                        user_id: userId,
                        achievement_id: achievement.id,
                        is_new: true
                    });

                    // Create notification for the unlocked achievement
                    await notificationService.notifyAchievementUnlocked(userId, achievement);

                    newAchievements.push(achievement);
                    console.log(`🏆 Achievement unlocked for user ${userId}: ${achievement.title}`);
                }
            }

            return newAchievements;
        } catch (error) {
            console.error('Error checking achievements:', error);
            return [];
        }
    }

    /**
     * Verifica se um requisito foi atingido
     */
    async checkRequirement(userId, achievement) {
        const { requirement_type, requirement_value } = achievement;

        try {
            // Buscar usuário para saber do parceiro
            const user = await User.findByPk(userId);
            const userIds = [userId];
            if (user && user.partner_id) {
                userIds.push(user.partner_id);
            }

            switch (requirement_type) {
                case 'transaction_count':
                    // Mantém individual: hábito de uso
                    const transactionCount = await Transaction.count({
                        where: { user_id: userId }
                    });
                    return transactionCount >= requirement_value;

                case 'goal_count':
                    // Conjunto: Metas do casal
                    const goalCount = await Goal.count({
                        where: { user_id: userIds }
                    });
                    return goalCount >= requirement_value;

                case 'savings_amount':
                    // Conjunto: Economia do casal
                    const goals = await Goal.findAll({
                        where: { user_id: userIds },
                        attributes: ['current_amount']
                    });
                    const totalSavings = goals.reduce((sum, g) => sum + parseFloat(g.current_amount || 0), 0);
                    return totalSavings >= requirement_value;

                case 'days_streak':
                    // Mantém individual: hábito de acesso
                    const streak = await this.calculateStreak(userId);
                    return streak >= requirement_value;

                case 'category_count':
                    // Mantém individual: diversidade de uso
                    const categories = await Transaction.findAll({
                        where: { user_id: userId },
                        attributes: ['category'],
                        group: ['category']
                    });
                    return categories.length >= requirement_value;

                case 'bank_connection':
                    // Mantém individual, mas discutível. Vamos manter individual por enquanto.
                    const wallets = await Wallet.count({
                        where: {
                            user_id: userId,
                            pluggy_item_id: { [Op.ne]: null }
                        }
                    });
                    return wallets >= requirement_value;

                case 'goal_completed':
                    // Conjunto: Realizações do casal
                    const completedGoals = await Goal.count({
                        where: {
                            user_id: userIds,
                            current_amount: { [Op.gte]: Goal.sequelize.col('target_amount') }
                        }
                    });
                    return completedGoals >= requirement_value;

                case 'partner_linked':
                    return !!(user && user.partner_id);

                default:
                    return false;
            }
        } catch (error) {
            console.error(`Error checking requirement ${requirement_type}:`, error);
            return false;
        }
    }

    /**
     * Calcula streak de dias consecutivos
     */
    async calculateStreak(userId) {
        try {
            const transactions = await Transaction.findAll({
                where: { user_id: userId },
                attributes: ['date'],
                order: [['date', 'DESC']],
                raw: true
            });

            if (transactions.length === 0) return 0;

            const dates = [...new Set(transactions.map(t => t.date))].sort().reverse();
            let streak = 1;
            const today = new Date().toISOString().split('T')[0];

            // Se não tem transação hoje ou ontem, streak é 0
            if (dates[0] !== today && dates[0] !== this.getYesterday()) {
                return 0;
            }

            for (let i = 1; i < dates.length; i++) {
                const diff = this.daysDifference(dates[i - 1], dates[i]);
                if (diff === 1) {
                    streak++;
                } else {
                    break;
                }
            }

            return streak;
        } catch (error) {
            console.error('Error calculating streak:', error);
            return 0;
        }
    }

    /**
     * Calcula diferença em dias entre duas datas
     */
    daysDifference(date1, date2) {
        const d1 = new Date(date1);
        const d2 = new Date(date2);
        const diffTime = Math.abs(d1 - d2);
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }

    /**
     * Retorna data de ontem
     */
    getYesterday() {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        return yesterday.toISOString().split('T')[0];
    }

    /**
     * Busca estatísticas do usuário
     */
    async getUserStats(userId) {
        try {
            const [
                totalTransactions,
                totalGoals,
                completedGoals,
                totalSavings,
                streak,
                bankConnections,
                unlockedAchievements
            ] = await Promise.all([
                Transaction.count({ where: { user_id: userId } }),
                Goal.count({ where: { user_id: userId } }),
                Goal.count({
                    where: {
                        user_id: userId,
                        current_amount: { [Op.gte]: Goal.sequelize.col('target_amount') }
                    }
                }),
                Goal.sum('current_amount', { where: { user_id: userId } }),
                this.calculateStreak(userId),
                Wallet.count({
                    where: {
                        user_id: userId,
                        pluggy_item_id: { [Op.ne]: null }
                    }
                }),
                UserAchievement.count({ where: { user_id: userId } })
            ]);

            return {
                totalTransactions,
                totalGoals,
                completedGoals,
                totalSavings: parseFloat(totalSavings || 0),
                streak,
                bankConnections,
                unlockedAchievements
            };
        } catch (error) {
            console.error('Error getting user stats:', error);
            return null;
        }
    }
}

module.exports = new AchievementService();
