const { sequelize, Achievement } = require('./models');

const achievements = [
    {
        code: 'first_transaction',
        title: '💰 Primeiro Passo',
        description: 'Crie sua primeira transação',
        icon: '💰',
        category: 'engagement',
        points: 10,
        requirement_type: 'transaction_count',
        requirement_value: 1
    },
    {
        code: 'first_goal',
        title: '🎯 Sonhador',
        description: 'Crie sua primeira meta financeira',
        icon: '🎯',
        category: 'engagement',
        points: 15,
        requirement_type: 'goal_count',
        requirement_value: 1
    },
    {
        code: 'week_streak',
        title: '💪 Persistente',
        description: 'Use o app por 7 dias consecutivos',
        icon: '💪',
        category: 'engagement',
        points: 25,
        requirement_type: 'days_streak',
        requirement_value: 7
    },
    {
        code: 'month_streak',
        title: '🔥 Em Chamas',
        description: 'Use o app por 30 dias consecutivos',
        icon: '🔥',
        category: 'engagement',
        points: 100,
        requirement_type: 'days_streak',
        requirement_value: 30
    },
    {
        code: 'save_100',
        title: '💸 Economista Iniciante',
        description: 'Economize R$ 100 em metas',
        icon: '💸',
        category: 'financial',
        points: 20,
        requirement_type: 'savings_amount',
        requirement_value: 100
    },
    {
        code: 'save_1000',
        title: '🏆 Mestre das Finanças',
        description: 'Economize R$ 1.000 em metas',
        icon: '🏆',
        category: 'financial',
        points: 50,
        requirement_type: 'savings_amount',
        requirement_value: 1000
    },
    {
        code: 'save_5000',
        title: '💎 Investidor de Ouro',
        description: 'Economize R$ 5.000 em metas',
        icon: '💎',
        category: 'financial',
        points: 150,
        requirement_type: 'savings_amount',
        requirement_value: 5000
    },
    {
        code: 'organized',
        title: '📊 Organizado',
        description: 'Categorize 50 transações',
        icon: '📊',
        category: 'milestone',
        points: 30,
        requirement_type: 'transaction_count',
        requirement_value: 50
    },
    {
        code: 'expert',
        title: '🎓 Especialista',
        description: 'Categorize 200 transações',
        icon: '🎓',
        category: 'milestone',
        points: 75,
        requirement_type: 'transaction_count',
        requirement_value: 200
    },
    {
        code: 'goal_master',
        title: '🎯 Mestre das Metas',
        description: 'Crie 5 metas financeiras',
        icon: '🎯',
        category: 'milestone',
        points: 40,
        requirement_type: 'goal_count',
        requirement_value: 5
    },
    {
        code: 'first_goal_completed',
        title: '🌟 Realizador',
        description: 'Complete sua primeira meta',
        icon: '🌟',
        category: 'financial',
        points: 60,
        requirement_type: 'goal_completed',
        requirement_value: 1
    },
    {
        code: 'bank_connected',
        title: '💳 Conectado',
        description: 'Conecte sua primeira conta bancária',
        icon: '💳',
        category: 'engagement',
        points: 25,
        requirement_type: 'bank_connection',
        requirement_value: 1
    },
    {
        code: 'multi_bank',
        title: '🏦 Multi-Banco',
        description: 'Conecte 3 contas bancárias',
        icon: '🏦',
        category: 'engagement',
        points: 50,
        requirement_type: 'bank_connection',
        requirement_value: 3
    },
    {
        code: 'category_explorer',
        title: '🗂️ Explorador de Categorias',
        description: 'Use 10 categorias diferentes',
        icon: '🗂️',
        category: 'milestone',
        points: 35,
        requirement_type: 'category_count',
        requirement_value: 10
    },
    {
        code: 'three_goals_completed',
        title: '🏅 Conquistador',
        description: 'Complete 3 metas financeiras',
        icon: '🏅',
        category: 'financial',
        points: 120,
        requirement_type: 'goal_completed',
        requirement_value: 3
    }
];

async function seedAchievements() {
    try {
        console.log('🌱 Starting achievements seed...');

        // Sincronizar tabelas
        await sequelize.sync();

        // Verificar se já existem conquistas
        const existingCount = await Achievement.count();

        if (existingCount > 0) {
            console.log(`ℹ️  Found ${existingCount} existing achievements. Skipping seed.`);
            console.log('💡 To re-seed, delete existing achievements first.');
            process.exit(0);
        }

        // Inserir conquistas
        await Achievement.bulkCreate(achievements);

        console.log(`✅ Successfully seeded ${achievements.length} achievements!`);
        console.log('\n🏆 Achievements created:');
        achievements.forEach(a => {
            console.log(`   ${a.icon} ${a.title} (${a.points} pts)`);
        });

        process.exit(0);
    } catch (error) {
        console.error('❌ Error seeding achievements:', error);
        process.exit(1);
    }
}

seedAchievements();
