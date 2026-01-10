const { CreditCard, CreditCardPurchase, User } = require('../models');
const { Op } = require('sequelize');

// Helper function to calculate monthly projection
const calculateMonthlyProjection = (purchases, months = 12) => {
    const projection = [];
    const today = new Date();

    for (let i = 0; i < months; i++) {
        const targetDate = new Date(today.getFullYear(), today.getMonth() + i, 1);
        let monthTotal = 0;

        purchases.forEach(purchase => {
            if (purchase.remaining_installments > 0) {
                const purchaseDate = new Date(purchase.purchase_date);
                const monthsSincePurchase = (targetDate.getFullYear() - purchaseDate.getFullYear()) * 12 +
                    (targetDate.getMonth() - purchaseDate.getMonth());

                if (monthsSincePurchase >= 0 && monthsSincePurchase < purchase.remaining_installments) {
                    monthTotal += parseFloat(purchase.installment_amount);
                }
            }
        });

        projection.push({
            month: targetDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }),
            monthIndex: i,
            amount: monthTotal
        });
    }

    return projection;
};

exports.getCreditCards = async (req, res) => {
    try {
        const { viewMode } = req.query;
        const userId = req.user.id;

        const user = await User.findByPk(userId);
        const allowedUsers = [userId];
        if (user.partner_id) {
            allowedUsers.push(user.partner_id);
        }

        let userFilter = allowedUsers;
        if (viewMode === 'user1' || viewMode === 'user2') {
            userFilter = [userId];
        }

        const creditCards = await CreditCard.findAll({
            where: {
                user_id: { [Op.in]: userFilter }
            },
            include: [
                { model: User, attributes: ['name'] },
                {
                    model: CreditCardPurchase,
                    where: { remaining_installments: { [Op.gt]: 0 } },
                    required: false
                }
            ],
            order: [['createdAt', 'DESC']]
        });

        // Calculate current debt and projection for each card
        const cardsWithProjection = creditCards.map(card => {
            const purchases = card.CreditCardPurchases || [];
            const currentDebt = purchases.reduce((sum, p) =>
                sum + (parseFloat(p.installment_amount) * p.remaining_installments), 0
            );
            const monthlyAmount = purchases.reduce((sum, p) =>
                sum + parseFloat(p.installment_amount), 0
            );
            const projection = calculateMonthlyProjection(purchases);

            return {
                ...card.toJSON(),
                current_debt: currentDebt,
                monthly_amount: monthlyAmount,
                projection: projection,
                total_purchases: purchases.length
            };
        });

        res.json(cardsWithProjection);
    } catch (error) {
        console.error('Error in getCreditCards:', error);
        res.status(500).json({ error: error.message });
    }
};

exports.createCreditCard = async (req, res) => {
    try {
        const { name, limit, due_day, closing_day } = req.body;

        const creditCard = await CreditCard.create({
            name,
            limit: parseFloat(limit),
            due_day: parseInt(due_day),
            closing_day: parseInt(closing_day),
            user_id: req.user.id
        });

        res.status(201).json(creditCard);
    } catch (error) {
        console.error('Error in createCreditCard:', error);
        res.status(500).json({ error: error.message });
    }
};

exports.updateCreditCard = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, limit, due_day, closing_day } = req.body;

        const creditCard = await CreditCard.findByPk(id);
        if (!creditCard) {
            return res.status(404).json({ error: 'Cartão não encontrado' });
        }

        const user = await User.findByPk(req.user.id);
        const allowedUsers = [req.user.id];
        if (user.partner_id) allowedUsers.push(user.partner_id);

        if (!allowedUsers.includes(creditCard.user_id)) {
            return res.status(403).json({ error: 'Você não tem permissão para editar este cartão' });
        }

        creditCard.name = name;
        creditCard.limit = parseFloat(limit);
        creditCard.due_day = parseInt(due_day);
        creditCard.closing_day = parseInt(closing_day);
        await creditCard.save();

        res.json(creditCard);
    } catch (error) {
        console.error('Error in updateCreditCard:', error);
        res.status(500).json({ error: error.message });
    }
};

exports.deleteCreditCard = async (req, res) => {
    try {
        const { id } = req.params;

        const creditCard = await CreditCard.findByPk(id);
        if (!creditCard) {
            return res.status(404).json({ error: 'Cartão não encontrado' });
        }

        const user = await User.findByPk(req.user.id);
        const allowedUsers = [req.user.id];
        if (user.partner_id) allowedUsers.push(user.partner_id);

        if (!allowedUsers.includes(creditCard.user_id)) {
            return res.status(403).json({ error: 'Você não tem permissão para excluir este cartão' });
        }

        // Delete all purchases first
        await CreditCardPurchase.destroy({ where: { credit_card_id: id } });
        await creditCard.destroy();

        res.json({ message: 'Cartão excluído com sucesso' });
    } catch (error) {
        console.error('Error in deleteCreditCard:', error);
        res.status(500).json({ error: error.message });
    }
};

// Purchase management
exports.addPurchase = async (req, res) => {
    try {
        const { credit_card_id } = req.params;
        const { description, total_amount, installments, purchase_date } = req.body;

        const creditCard = await CreditCard.findByPk(credit_card_id);
        if (!creditCard) {
            return res.status(404).json({ error: 'Cartão não encontrado' });
        }

        const user = await User.findByPk(req.user.id);
        const allowedUsers = [req.user.id];
        if (user.partner_id) allowedUsers.push(user.partner_id);

        if (!allowedUsers.includes(creditCard.user_id)) {
            return res.status(403).json({ error: 'Você não tem permissão para adicionar compras neste cartão' });
        }

        const installmentAmount = parseFloat(total_amount) / parseInt(installments);

        const purchase = await CreditCardPurchase.create({
            description,
            total_amount: parseFloat(total_amount),
            installments: parseInt(installments),
            installment_amount: installmentAmount,
            remaining_installments: parseInt(installments),
            purchase_date: purchase_date || new Date(),
            credit_card_id: credit_card_id
        });

        res.status(201).json(purchase);
    } catch (error) {
        console.error('Error in addPurchase:', error);
        res.status(500).json({ error: error.message });
    }
};

exports.getPurchases = async (req, res) => {
    try {
        const { credit_card_id } = req.params;

        const creditCard = await CreditCard.findByPk(credit_card_id);
        if (!creditCard) {
            return res.status(404).json({ error: 'Cartão não encontrado' });
        }

        const purchases = await CreditCardPurchase.findAll({
            where: { credit_card_id },
            order: [['purchase_date', 'DESC']]
        });

        res.json(purchases);
    } catch (error) {
        console.error('Error in getPurchases:', error);
        res.status(500).json({ error: error.message });
    }
};

exports.updatePurchase = async (req, res) => {
    try {
        const { id } = req.params;
        const { description, remaining_installments } = req.body;

        const purchase = await CreditCardPurchase.findByPk(id, {
            include: [CreditCard]
        });

        if (!purchase) {
            return res.status(404).json({ error: 'Compra não encontrada' });
        }

        const user = await User.findByPk(req.user.id);
        const allowedUsers = [req.user.id];
        if (user.partner_id) allowedUsers.push(user.partner_id);

        if (!allowedUsers.includes(purchase.CreditCard.user_id)) {
            return res.status(403).json({ error: 'Você não tem permissão para editar esta compra' });
        }

        if (description) purchase.description = description;
        if (remaining_installments !== undefined) {
            purchase.remaining_installments = Math.max(0, parseInt(remaining_installments));
        }

        await purchase.save();
        res.json(purchase);
    } catch (error) {
        console.error('Error in updatePurchase:', error);
        res.status(500).json({ error: error.message });
    }
};

exports.deletePurchase = async (req, res) => {
    try {
        const { id } = req.params;

        const purchase = await CreditCardPurchase.findByPk(id, {
            include: [CreditCard]
        });

        if (!purchase) {
            return res.status(404).json({ error: 'Compra não encontrada' });
        }

        const user = await User.findByPk(req.user.id);
        const allowedUsers = [req.user.id];
        if (user.partner_id) allowedUsers.push(user.partner_id);

        if (!allowedUsers.includes(purchase.CreditCard.user_id)) {
            return res.status(403).json({ error: 'Você não tem permissão para excluir esta compra' });
        }

        await purchase.destroy();
        res.json({ message: 'Compra excluída com sucesso' });
    } catch (error) {
        console.error('Error in deletePurchase:', error);
        res.status(500).json({ error: error.message });
    }
};
