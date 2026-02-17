const { Challenge, UserChallenge, User, Notification, Transaction } = require('../models');
const { Op } = require('sequelize');
const notificationService = require('../services/notificationService');

exports.getChallenges = async (req, res) => {
    try {
        const userId = req.user.id;

        // Buscar desafios ativos do usuário
        const userChallenges = await UserChallenge.findAll({
            where: { user_id: userId },
            include: [Challenge]
        });

        // Buscar desafios disponíveis (Sistema ou do Usuário)
        const availableChallenges = await Challenge.findAll({
            where: {
                [Op.and]: [
                    { id: { [Op.notIn]: userChallenges.map(uc => uc.challenge_id) } },
                    {
                        [Op.or]: [
                            { is_custom: false },
                            { user_id: userId }
                        ]
                    }
                ]
            }
        });

        res.json({
            active: userChallenges.filter(uc => uc.status === 'active'),
            completed: userChallenges.filter(uc => uc.status === 'completed'),
            available: availableChallenges
        });
    } catch (error) {
        console.error('Error fetching challenges:', error);
        res.status(500).json({ error: 'Erro ao buscar desafios' });
    }
};

exports.createChallenge = async (req, res) => {
    try {
        const userId = req.user.id;
        const { title, description, type, target_amount, category, duration_days, points, icon } = req.body;

        const challenge = await Challenge.create({
            title,
            description,
            type,
            target_amount,
            category,
            duration_days,
            points,
            icon,
            is_custom: true,
            user_id: userId
        });

        res.status(201).json(challenge);
    } catch (error) {
        console.error('Error creating challenge:', error);
        res.status(500).json({ error: 'Erro ao criar desafio' });
    }
};

exports.updateChallenge = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;
        const { title, description, target_amount, category, points, icon } = req.body;

        const challenge = await Challenge.findOne({ where: { id, user_id: userId, is_custom: true } });
        if (!challenge) return res.status(404).json({ error: 'Desafio não encontrado ou não permitido' });

        await challenge.update({
            title,
            description,
            target_amount,
            category,
            points,
            icon
        });

        res.json(challenge);
    } catch (error) {
        console.error('Error updating challenge:', error);
        res.status(500).json({ error: 'Erro ao atualizar desafio' });
    }
};

exports.startChallenge = async (req, res) => {
    try {
        const { challengeId } = req.body;
        const userId = req.user.id;

        const challenge = await Challenge.findByPk(challengeId);
        if (!challenge) return res.status(404).json({ error: 'Desafio não encontrado' });

        const existing = await UserChallenge.findOne({
            where: { user_id: userId, challenge_id: challengeId, status: 'active' }
        });
        if (existing) return res.status(400).json({ error: 'Desafio já está ativo' });

        const endDate = new Date();
        endDate.setDate(endDate.getDate() + challenge.duration_days);

        const userChallenge = await UserChallenge.create({
            user_id: userId,
            challenge_id: challengeId,
            status: 'active',
            progress: 0,
            start_date: new Date(),
            end_date: endDate
        });

        res.status(201).json(userChallenge);
    } catch (error) {
        console.error('Error starting challenge:', error);
        res.status(500).json({ error: 'Erro ao iniciar desafio' });
    }
};

// Rodar diariamente para atualizar progresso dos desafios
exports.updateProgress = async () => {
    try {
        const activeChallenges = await UserChallenge.findAll({
            where: { status: 'active' },
            include: [Challenge]
        });

        for (const uc of activeChallenges) {
            const challenge = uc.Challenge;
            const now = new Date();

            // Verificar se expirou
            if (now > uc.end_date) {
                // Se o tipo for "no_spending" e ele chegou ao fim sem falhar, completou!
                if (challenge.type === 'no_spending') {
                    uc.status = 'completed';
                    await notificationService.createNotification(
                        uc.user_id,
                        '🏅 Desafio Concluído!',
                        `Parabéns! Você completou o desafio "${challenge.title}" e ganhou ${challenge.points} pontos!`,
                        'achievement'
                    );
                } else {
                    uc.status = 'failed';
                }
                await uc.save();
                continue;
            }

            // Lógica de progresso baseada no tipo
            if (challenge.type === 'saving') {
                // Somar transações do tipo income na categoria 'Reserva' ou similar
                const savings = await Transaction.sum('amount', {
                    where: {
                        user_id: uc.user_id,
                        type: 'income',
                        date: { [Op.between]: [uc.start_date, now] }
                    }
                });
                uc.progress = savings || 0;
                if (uc.progress >= challenge.target_amount) {
                    uc.status = 'completed';
                    await notificationService.createNotification(
                        uc.user_id,
                        '🏅 Desafio Concluído!',
                        `Parabéns! Você guardou R$ ${uc.progress} e completou o desafio "${challenge.title}"!`,
                        'achievement'
                    );
                }
            } else if (challenge.type === 'category_limit') {
                const spent = await Transaction.sum('amount', {
                    where: {
                        user_id: uc.user_id,
                        type: 'expense',
                        category: challenge.category,
                        date: { [Op.between]: [uc.start_date, now] }
                    }
                });
                const absSpent = Math.abs(spent || 0);
                uc.progress = absSpent;
                if (absSpent > challenge.target_amount) {
                    uc.status = 'failed';
                    await notificationService.createNotification(
                        uc.user_id,
                        '❌ Desafio Falhou',
                        `Você ultrapassou o limite de R$ ${challenge.target_amount} em ${challenge.category} para o desafio "${challenge.title}".`,
                        'info'
                    );
                }
            } else if (challenge.type === 'no_spending') {
                const count = await Transaction.count({
                    where: {
                        user_id: uc.user_id,
                        type: 'expense',
                        category: challenge.category,
                        date: { [Op.between]: [uc.start_date, now] }
                    }
                });
                if (count > 0) {
                    uc.status = 'failed';
                    await notificationService.createNotification(
                        uc.user_id,
                        '❌ Desafio Falhou',
                        `Você realizou gastos em ${challenge.category} durante o desafio "${challenge.title}".`,
                        'info'
                    );
                }
            }
            await uc.save();
        }
    } catch (error) {
        console.error('Error updating challenge progress:', error);
    }
};

exports.seedChallenges = async () => {
    const list = [
        {
            title: 'Mês Sem iFood',
            description: 'Fique 30 dias sem gastar em Deliveries e Restaurantes.',
            type: 'no_spending',
            category: 'Alimentação',
            duration_days: 30,
            points: 200,
            icon: 'UtensilsCrossed'
        },
        {
            title: 'Economia de Energia',
            description: 'Gaste menos de R$ 150 em Contas de Luz este mês.',
            type: 'category_limit',
            category: 'Contas',
            target_amount: 150,
            duration_days: 30,
            points: 150,
            icon: 'Zap'
        },
        {
            title: 'Primeira Reserva',
            description: 'Guarde seus primeiros R$ 500 para o futuro.',
            type: 'saving',
            target_amount: 500,
            duration_days: 30,
            points: 100,
            icon: 'PiggyBank'
        }
    ];

    for (const c of list) {
        await Challenge.findOrCreate({ where: { title: c.title }, defaults: c });
    }
};
