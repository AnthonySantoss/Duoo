const { CreditCardInvoice, CreditCard, User } = require('../models');
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

        const now = new Date();
        const currentMonth = now.getMonth() + 1; // 1-12
        const currentYear = now.getFullYear();

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

        // Sum invoices for current month
        const invoices = await CreditCardInvoice.findAll({
            where: {
                credit_card_id: { [Op.in]: cardIds },
                month: currentMonth,
                year: currentYear
            }
        });

        const total = invoices.reduce((sum, inv) => sum + parseFloat(inv.amount), 0);

        res.json({ total, month: currentMonth, year: currentYear });
    } catch (error) {
        console.error('Error fetching current month total:', error);
        res.status(500).json({ error: error.message });
    }
};

// Create or update invoice
exports.upsertInvoice = async (req, res) => {
    try {
        const { credit_card_id, month, year, amount, due_date, paid, paid_date } = req.body;

        // Validate card belongs to user or partner
        const card = await CreditCard.findByPk(credit_card_id);
        if (!card) {
            return res.status(404).json({ error: 'Cartão não encontrado' });
        }

        const user = await User.findByPk(req.user.id);
        const allowedUsers = [req.user.id];
        if (user.partner_id) allowedUsers.push(user.partner_id);

        if (!allowedUsers.includes(card.user_id)) {
            return res.status(403).json({ error: 'Você não tem permissão para este cartão' });
        }

        // Find existing invoice or create new
        const [invoice, created] = await CreditCardInvoice.findOrCreate({
            where: { credit_card_id, month, year },
            defaults: { amount, due_date, paid: paid || false, paid_date }
        });

        if (!created) {
            // Update existing
            invoice.amount = amount;
            invoice.due_date = due_date;
            invoice.paid = paid || false;
            invoice.paid_date = paid_date || null;
            await invoice.save();
        }

        res.json(invoice);
    } catch (error) {
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
