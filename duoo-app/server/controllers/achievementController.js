const { Achievement, UserAchievement } = require('../models');
const achievementService = require('../services/achievementService');

/**
 * Lista todas as conquistas disponíveis
 */
exports.getAllAchievements = async (req, res) => {
    try {
        const userId = req.user.id;

        const achievements = await Achievement.findAll({
            where: { is_active: true },
            order: [['points', 'ASC'], ['id', 'ASC']]
        });

        // Buscar conquistas desbloqueadas
        const userAchievements = await UserAchievement.findAll({
            where: { user_id: userId },
            attributes: ['achievement_id', 'unlocked_at', 'is_new']
        });

        const unlockedMap = {};
        userAchievements.forEach(ua => {
            unlockedMap[ua.achievement_id] = {
                unlocked_at: ua.unlocked_at,
                is_new: ua.is_new
            };
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
            is_new: unlockedMap[a.id]?.is_new || false
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
        const userId = req.user.id;

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
