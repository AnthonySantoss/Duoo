const { CreditCardInvoice, CreditCard, User, Transaction, Wallet } = require('../models');
const { Op } = require('sequelize');

// Get all invoices for user's credit cards
exports.getInvoices = async (req, res) => {
    try {
        const { viewMode } = req.query;
        const userId = req.user.id;

        // Get user to check for partner
        const user = await User.findByPk(userId);
        let userScope = [userId];

        if (viewMode === 'joint' && user.partner_id) {
            userScope.push(user.partner_id);
        } else if (viewMode === 'user2' && user.partner_id) {
            userScope = [user.partner_id];
        }

        // Get credit cards for the scope
        const creditCards = await CreditCard.findAll({
            where: { user_id: { [Op.in]: userScope } }
        });

        const cardIds = creditCards.map(c => c.id);

        // Get invoices for these cards
        const invoices = await CreditCardInvoice.findAll({
            where: { credit_card_id: { [Op.in]: cardIds } },
            include: [{
                model: CreditCard,
                attributes: ['name']
            }],
            order: [['year', 'DESC'], ['month', 'DESC']]
        });

        res.json(invoices);
    } catch (error) {
        console.error('Error fetching invoices:', error);
        res.status(500).json({ error: error.message });
    }
};

// Get current month total for dashboard card
exports.getCurrentMonthTotal = async (req, res) => {
    try {
        const { viewMode } = req.query;
        const userId = req.user.id;

        const targetDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
        const targetMonth = targetDate.getMonth() + 1; // 1-12
        const targetYear = targetDate.getFullYear();

        // Get user to check for partner
        const user = await User.findByPk(userId);
        let userScope = [userId];

        if (viewMode === 'joint' && user.partner_id) {
            userScope.push(user.partner_id);
        } else if (viewMode === 'user2' && user.partner_id) {
            userScope = [user.partner_id];
        }

        // Get credit cards for the scope
        const creditCards = await CreditCard.findAll({
            where: { user_id: { [Op.in]: userScope } }
        });

        const cardIds = creditCards.map(c => c.id);

        // Sum UNPAID invoices for NEXT month
        const invoices = await CreditCardInvoice.findAll({
            where: {
                credit_card_id: { [Op.in]: cardIds },
                month: targetMonth,
                year: targetYear,
                paid: false // Only count unpaid invoices
            }
        });

        const total = invoices.reduce((sum, inv) => sum + parseFloat(inv.amount), 0);

        res.json({ total, month: targetMonth, year: targetYear });
    } catch (error) {
        console.error('Error fetching current month total:', error);
        res.status(500).json({ error: error.message });
    }
};

// Create or update invoice
exports.upsertInvoice = async (req, res) => {
    const t = await Transaction.sequelize.transaction();
    try {
        const { credit_card_id, month, year, amount, due_date, paid, paid_date, wallet_id } = req.body;

        // Validate card belongs to user or partner
        const card = await CreditCard.findByPk(credit_card_id, { transaction: t });
        if (!card) {
            await t.rollback();
            return res.status(404).json({ error: 'Cartão não encontrado' });
        }

        const user = await User.findByPk(req.user.id);
        const allowedUsers = [req.user.id];
        if (user.partner_id) allowedUsers.push(user.partner_id);

        if (!allowedUsers.includes(card.user_id)) {
            await t.rollback();
            return res.status(403).json({ error: 'Você não tem permissão para este cartão' });
        }

        // Find existing invoice or create new
        const [invoice, created] = await CreditCardInvoice.findOrCreate({
            where: { credit_card_id, month, year },
            defaults: { amount, due_date, paid: paid || false, paid_date },
            transaction: t
        });

        const wasPaid = invoice.paid;
        const nowPaid = paid || false;

        if (!created) {
            // Update existing
            invoice.amount = amount;
            invoice.due_date = due_date;
            invoice.paid = nowPaid;
            invoice.paid_date = paid_date || null;
            await invoice.save({ transaction: t });
        }

        // If invoice is being marked as paid and wasn't paid before
        if (nowPaid && !wasPaid && wallet_id) {
            const wallet = await Wallet.findByPk(wallet_id, { transaction: t });
            if (!wallet) {
                await t.rollback();
                return res.status(404).json({ error: 'Carteira não encontrada' });
            }

            const deductionAmount = -Math.abs(parseFloat(amount));

            // Create expense transaction
            await Transaction.create({
                title: `Pagamento fatura ${card.name} - ${month}/${year}`,
                amount: deductionAmount,
                type: 'expense',
                category: 'Cartão de Crédito',
                wallet_id: wallet.id,
                user_id: req.user.id,
                date: paid_date || new Date()
            }, { transaction: t });

            // Update wallet balance
            wallet.balance = parseFloat(wallet.balance) + deductionAmount;
            await wallet.save({ transaction: t });
        }

        await t.commit();
        res.json(invoice);
    } catch (error) {
        await t.rollback();
        console.error('Error upserting invoice:', error);
        res.status(500).json({ error: error.message });
    }
};

// Delete invoice
exports.deleteInvoice = async (req, res) => {
    try {
        const { id } = req.params;

        const invoice = await CreditCardInvoice.findByPk(id, {
            include: [CreditCard]
        });

        if (!invoice) {
            return res.status(404).json({ error: 'Fatura não encontrada' });
        }

        // Check permission
        const user = await User.findByPk(req.user.id);
        const allowedUsers = [req.user.id];
        if (user.partner_id) allowedUsers.push(user.partner_id);

        if (!allowedUsers.includes(invoice.CreditCard.user_id)) {
            return res.status(403).json({ error: 'Você não tem permissão para excluir esta fatura' });
        }

        await invoice.destroy();
        res.json({ message: 'Fatura excluída com sucesso' });
    } catch (error) {
        console.error('Error deleting invoice:', error);
        res.status(500).json({ error: error.message });
    }
};
