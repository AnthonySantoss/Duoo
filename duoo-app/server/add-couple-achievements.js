const { sequelize, Achievement } = require('./models');

const coupleAchievements = [
    {
        code: 'love_link',
        title: '💌 O Início de Tudo',
        description: 'Vincule sua conta com seu parceiro(a)',
        icon: '💌',
        category: 'social',
        points: 50,
        requirement_type: 'partner_linked',
        requirement_value: 1
    },
    {
        code: 'power_couple',
        title: '🚀 Casal Poderoso',
        description: 'Economizem R$ 10.000 juntos',
        icon: '🚀',
        category: 'financial',
        points: 200,
        requirement_type: 'savings_amount',
        requirement_value: 10000
    },
    {
        code: 'wealthy_duo',
        title: '💎 Dupla de Milhões',
        description: 'Economizem R$ 50.000 juntos',
        icon: '💎',
        category: 'financial',
        points: 500,
        requirement_type: 'savings_amount',
        requirement_value: 50000
    },
    {
        code: 'joint_goals',
        title: '🤝 Sonhos Compartilhados',
        description: 'Criem 3 metas financeiras (vale para o casal)',
        icon: '🤝',
        category: 'engagement',
        points: 60,
        requirement_type: 'goal_count',
        requirement_value: 3
    }
];

async function addCoupleAchievements() {
    try {
        console.log('❤️ Adding Couple Achievements...');
        await sequelize.sync();

        for (const achievement of coupleAchievements) {
            const [model, created] = await Achievement.findOrCreate({
                where: { code: achievement.code },
                defaults: achievement
            });

            if (created) {
                console.log(`✅ Created: ${achievement.title}`);
            } else {
                console.log(`ℹ️  Already exists: ${achievement.title}`);
                // Opcional: Atualizar se quiser mudar description/points
                // await model.update(achievement);
            }
        }

        console.log('Done!');
        process.exit(0);
    } catch (error) {
        console.error('Error adding couple achievements:', error);
        process.exit(1);
    }
}

addCoupleAchievements();
