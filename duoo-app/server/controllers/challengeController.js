const { Challenge, UserChallenge, User, Notification, Transaction, CreditCardPurchase, CreditCard } = require('../models');
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

exports.syncAndGet = async (req, res) => {
    try {
        // Forçar atualização do progresso antes de retornar
        await exports.updateProgress();
        return exports.getChallenges(req, res);
    } catch (error) {
        return exports.getChallenges(req, res);
    }
};

exports.createChallenge = async (req, res) => {
    try {
        const userId = req.user.id;
        const { title, description, type, target_amount, category, duration_days, points, icon, target_type } = req.body;

        const challenge = await Challenge.create({
            title,
            description,
            type,
            target_amount,
            category,
            duration_days,
            points,
            icon,
            target_type: target_type || (type === 'saving' ? 'income' : 'expense'),
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
        const { title, description, target_amount, category, points, icon, target_type } = req.body;

        const challenge = await Challenge.findOne({ where: { id, user_id: userId, is_custom: true } });
        if (!challenge) return res.status(404).json({ error: 'Desafio não encontrado ou não permitido' });

        await challenge.update({
            title,
            description,
            target_amount,
            category,
            points,
            icon,
            target_type
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

            // 1. Identificar usuários envolvidos (Par de usuários)
            const user = await User.findByPk(uc.user_id);
            const userIds = [uc.user_id];
            if (user && user.partner_id) userIds.push(user.partner_id);

            // 2. Definir o que buscar baseado no target_type
            const targetType = challenge.target_type || (challenge.type === 'saving' ? 'income' : 'expense');
            let currentProgress = 0;

            if (targetType === 'credit') {
                // Buscar em Gastos de Cartão
                const creditCards = await CreditCard.findAll({ where: { user_id: userIds } });
                const cardIds = creditCards.map(cc => cc.id);

                if (cardIds.length > 0) {
                    const where = {
                        credit_card_id: cardIds,
                        purchase_date: { [Op.between]: [uc.start_date, now] }
                    };

                    // Se a categoria NÃO for "Outros", filtramos por ela. 
                    // Se for "Outros", consideramos QUALQUER gasto no cartão.
                    if (challenge.category && challenge.category !== 'Outros' && challenge.category !== '') {
                        where.category = challenge.category;
                    }

                    if (challenge.type === 'no_spending') {
                        currentProgress = await CreditCardPurchase.count({ where });
                    } else {
                        const sum = await CreditCardPurchase.sum('installment_amount', { where });
                        currentProgress = Math.abs(sum || 0);
                    }
                }
            } else {
                // Buscar em Transações Normais (Receitas ou Despesas)
                const where = {
                    user_id: userIds,
                    type: targetType,
                    date: { [Op.between]: [uc.start_date, now] }
                };

                if (challenge.category && challenge.category !== 'Outros' && challenge.category !== '' && targetType !== 'income') {
                    where.category = challenge.category;
                }

                if (challenge.type === 'no_spending') {
                    currentProgress = await Transaction.count({ where });
                } else {
                    const sum = await Transaction.sum('amount', { where });
                    currentProgress = Math.abs(sum || 0);
                }
            }

            // 3. Atualizar Status
            uc.progress = currentProgress;

            if (challenge.type === 'no_spending') {
                if (currentProgress > 0) {
                    uc.status = 'failed';
                    await notificationService.createNotification(
                        uc.user_id,
                        '❌ Desafio Falhou',
                        `Você realizou um gasto do tipo "${targetType}" durante o desafio "${challenge.title}".`,
                        'info'
                    );
                }
            } else if (challenge.type === 'category_limit') {
                if (currentProgress > challenge.target_amount) {
                    uc.status = 'failed';
                    await notificationService.createNotification(
                        uc.user_id,
                        '❌ Desafio Falhou',
                        `Você ultrapassou o limite de R$ ${challenge.target_amount} em ${challenge.category} para o desafio "${challenge.title}".`,
                        'info'
                    );
                }
            } else if (challenge.type === 'saving') {
                if (currentProgress >= challenge.target_amount) {
                    uc.status = 'completed';
                    await notificationService.createNotification(
                        uc.user_id,
                        '🏅 Desafio Concluído!',
                        `Parabéns! Você alcançou o objetivo de R$ ${challenge.target_amount} e completou o desafio "${challenge.title}"!`,
                        'achievement'
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
            icon: 'UtensilsCrossed',
            target_type: 'expense'
        },
        {
            title: 'Economia de Energia',
            description: 'Gaste menos de R$ 150 em Contas de Luz este mês.',
            type: 'category_limit',
            category: 'Contas',
            target_amount: 150,
            duration_days: 30,
            points: 150,
            icon: 'Zap',
            target_type: 'expense'
        },
        {
            title: 'Primeira Reserva',
            description: 'Guarde seus primeiros R$ 500 para o futuro.',
            type: 'saving',
            target_amount: 500,
            duration_days: 30,
            points: 100,
            icon: 'PiggyBank',
            target_type: 'income'
        }
    ];

    for (const c of list) {
        await Challenge.findOrCreate({ where: { title: c.title }, defaults: c });
    }
};
