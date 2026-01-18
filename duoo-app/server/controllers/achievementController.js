const { Achievement, UserAchievement, User } = require('../models');
const achievementService = require('../services/achievementService');

/**
 * Lista todas as conquistas disponíveis
 */
exports.getAllAchievements = async (req, res) => {
    try {
        let userId = req.user.id;
        const { viewMode } = req.query; // 'user1' (me), 'user2' (partner), 'joint'

        const achievements = await Achievement.findAll({
            where: { is_active: true },
            order: [['points', 'ASC'], ['id', 'ASC']]
        });

        const user = await User.findByPk(req.user.id);
        let targetUserIds = [req.user.id];

        console.log(`[Achievements] Req ViewMode: ${viewMode}, User: ${user.name}, PartnerID: ${user.partner_id}`);

        if (viewMode === 'user2') {
            if (user.partner_id) {
                targetUserIds = [user.partner_id];
            } else {
                targetUserIds = []; // Se pediu parceiro e não tem, retorna vazio
                console.log('[Achievements] Requesting partner data but no partner linked.');
            }
        } else if (viewMode === 'joint') {
            targetUserIds = [req.user.id];
            if (user.partner_id) targetUserIds.push(user.partner_id);
        }

        console.log(`[Achievements] Target User IDs: ${targetUserIds}`);

        // Buscar conquistas desbloqueadas
        const userAchievements = await UserAchievement.findAll({
            where: { user_id: targetUserIds },
            attributes: ['achievement_id', 'unlocked_at', 'is_new', 'user_id']
        });

        const unlockedMap = {};
        userAchievements.forEach(ua => {
            if (!unlockedMap[ua.achievement_id]) {
                unlockedMap[ua.achievement_id] = {
                    unlocked_at: ua.unlocked_at,
                    is_new: ua.is_new,
                    unlocked_by: [ua.user_id]
                };
            } else {
                if (!unlockedMap[ua.achievement_id].unlocked_by.includes(ua.user_id)) {
                    unlockedMap[ua.achievement_id].unlocked_by.push(ua.user_id);
                }
            }
        });

        // Combinar dados
        const result = achievements.map(a => ({
            id: a.id,
            code: a.code,
            title: a.title,
            description: a.description,
            icon: a.icon,
            category: a.category,
            points: a.points,
            requirement_type: a.requirement_type,
            requirement_value: a.requirement_value,
            is_unlocked: !!unlockedMap[a.id],
            unlocked_at: unlockedMap[a.id]?.unlocked_at || null,
            is_new: unlockedMap[a.id]?.is_new || false,
            unlocked_by: unlockedMap[a.id]?.unlocked_by || []
        }));

        res.json(result);
    } catch (error) {
        console.error('Error fetching achievements:', error);
        res.status(500).json({ error: 'Failed to fetch achievements' });
    }
};

/**
 * Marca conquistas como vistas
 */
exports.markAsSeen = async (req, res) => {
    try {
        const userId = req.user.id;
        const { achievement_ids } = req.body;

        if (!achievement_ids || !Array.isArray(achievement_ids)) {
            return res.status(400).json({ error: 'achievement_ids array is required' });
        }

        await UserAchievement.update(
            { is_new: false },
            {
                where: {
                    user_id: userId,
                    achievement_id: achievement_ids
                }
            }
        );

        res.json({ success: true });
    } catch (error) {
        console.error('Error marking achievements as seen:', error);
        res.status(500).json({ error: 'Failed to mark achievements as seen' });
    }
};

/**
 * Verifica e desbloqueia novas conquistas
 */
exports.checkAchievements = async (req, res) => {
    try {
        const userId = req.user.id;

        const newAchievements = await achievementService.checkAndUnlockAchievements(userId);

        res.json({
            newAchievements: newAchievements.map(a => ({
                id: a.id,
                code: a.code,
                title: a.title,
                description: a.description,
                icon: a.icon,
                points: a.points
            }))
        });
    } catch (error) {
        console.error('Error checking achievements:', error);
        res.status(500).json({ error: 'Failed to check achievements' });
    }
};

/**
 * Retorna estatísticas do usuário
 */
exports.getUserStats = async (req, res) => {
    try {
        let userId = req.user.id;
        const { viewMode } = req.query;

        const user = await User.findByPk(req.user.id);

        if (viewMode === 'user2') {
            if (user.partner_id) {
                userId = user.partner_id;
            } else {
                // Retornar stats zerados ou erro
                return res.json({
                    totalTransactions: 0,
                    totalGoals: 0,
                    completedGoals: 0,
                    totalSavings: 0,
                    streak: 0,
                    bankConnections: 0,
                    unlockedAchievements: 0
                });
            }
        }
        // OBS: Stats conjuntos precisarão de lógica complexa no service (somar stats). 
        // Por enquanto, se for joint, vamos mostrar stats do usuário logado ou somar?
        // Vamos mostrar do usuário logado por padrão se for joint, ou implementar soma simples.

        // Se for joint, por simplicidade agora, mostramos a soma
        if (viewMode === 'joint' && user.partner_id) {
            const myStats = await achievementService.getUserStats(req.user.id);
            const partnerStats = await achievementService.getUserStats(user.partner_id);

            const combinedStats = {
                totalTransactions: myStats.totalTransactions + partnerStats.totalTransactions,
                totalGoals: myStats.totalGoals + partnerStats.totalGoals,
                completedGoals: myStats.completedGoals + partnerStats.completedGoals,
                totalSavings: myStats.totalSavings + partnerStats.totalSavings,
                streak: Math.max(myStats.streak, partnerStats.streak), // Maior streak
                bankConnections: myStats.bankConnections + partnerStats.bankConnections,
                unlockedAchievements: myStats.unlockedAchievements + partnerStats.unlockedAchievements // Isso pode contar duplicadas, mas ok para estatística simples
            };
            return res.json(combinedStats);
        }

        const stats = await achievementService.getUserStats(userId);

        if (!stats) {
            return res.status(500).json({ error: 'Failed to get user stats' });
        }

        res.json(stats);
    } catch (error) {
        console.error('Error getting user stats:', error);
        res.status(500).json({ error: 'Failed to get user stats' });
    }
};

/**
 * Retorna conquistas não vistas (novas)
 */
exports.getNewAchievements = async (req, res) => {
    try {
        const userId = req.user.id;

        const newAchievements = await UserAchievement.findAll({
            where: {
                user_id: userId,
                is_new: true
            },
            include: [{
                model: Achievement,
                attributes: ['id', 'code', 'title', 'description', 'icon', 'points']
            }]
        });

        res.json(newAchievements.map(ua => ({
            ...ua.Achievement.dataValues,
            unlocked_at: ua.unlocked_at
        })));
    } catch (error) {
        console.error('Error getting new achievements:', error);
        res.status(500).json({ error: 'Failed to get new achievements' });
    }
};

module.exports = exports;
