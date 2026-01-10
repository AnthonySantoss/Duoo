const { Transaction, Wallet, User } = require('../models');
const { Op } = require('sequelize');

exports.getTransactions = async (req, res) => {
    try {
        const { viewMode, search } = req.query;
        const userId = req.user.id;

        // Get user to check for partner
        const user = await User.findByPk(userId);
        let whereClause = {};

        // Filter by viewMode
        if (viewMode === 'user1') {
            // Show only logged user's transactions
            whereClause.user_id = userId;
        } else if (viewMode === 'user2' && user.partner_id) {
            // Show only partner's transactions
            whereClause.user_id = user.partner_id;
        } else if (viewMode === 'joint') {
            // Show both user and partner transactions
            const partnerIds = [userId];
            if (user.partner_id) {
                partnerIds.push(user.partner_id);
            }
            whereClause.user_id = { [Op.in]: partnerIds };
        } else {
            // Default: show user's transactions
            whereClause.user_id = userId;
        }

        // Search filter
        if (search) {
            whereClause.title = { [Op.like]: `%${search}%` };
        }

        const transactions = await Transaction.findAll({
            where: whereClause,
            include: [
                { model: Wallet, attributes: ['name', 'type'] },
                { model: User, attributes: ['name'] }
            ],
            order: [['date', 'DESC'], ['createdAt', 'DESC']]
        });

        res.json(transactions);
    } catch (error) {
        console.error('Error in getTransactions:', error);
        res.status(500).json({ error: error.message });
    }
};

exports.createTransaction = async (req, res) => {
    try {
        const { title, amount, category, date, type, wallet_id } = req.body;

        // Validate wallet belongs to user or partner
        const wallet = await Wallet.findByPk(wallet_id);
        if (!wallet) {
            return res.status(404).json({ error: 'Carteira não encontrada' });
        }

        const user = await User.findByPk(req.user.id);
        const allowedUsers = [req.user.id];
        if (user.partner_id) allowedUsers.push(user.partner_id);

        if (!allowedUsers.includes(wallet.user_id)) {
            return res.status(403).json({ error: 'Você não tem permissão para usar esta carteira' });
        }

        const transaction = await Transaction.create({
            title,
            amount,
            category,
            date,
            type,
            wallet_id,
            user_id: req.user.id
        });

        // Update wallet balance
        const amountValue = parseFloat(amount);
        wallet.balance = parseFloat(wallet.balance) + amountValue;
        await wallet.save();

        res.status(201).json(transaction);
    } catch (error) {
        console.error('Error in createTransaction:', error);
        res.status(500).json({ error: error.message });
    }
};

exports.updateTransaction = async (req, res) => {
    try {
        const { id } = req.params;
        const { title, amount, category, date, type } = req.body;

        const transaction = await Transaction.findByPk(id, { include: [Wallet] });
        if (!transaction) {
            return res.status(404).json({ error: 'Transação não encontrada' });
        }

        // Check ownership
        if (transaction.user_id !== req.user.id) {
            return res.status(403).json({ error: 'Você não tem permissão para editar esta transação' });
        }

        // Revert old balance change
        const oldAmount = parseFloat(transaction.amount);
        transaction.Wallet.balance = parseFloat(transaction.Wallet.balance) - oldAmount;

        // Update transaction
        transaction.title = title;
        transaction.amount = amount;
        transaction.category = category;
        transaction.date = date;
        transaction.type = type;
        await transaction.save();

        // Apply new balance change
        const newAmount = parseFloat(amount);
        transaction.Wallet.balance = parseFloat(transaction.Wallet.balance) + newAmount;
        await transaction.Wallet.save();

        res.json(transaction);
    } catch (error) {
        console.error('Error in updateTransaction:', error);
        res.status(500).json({ error: error.message });
    }
};

exports.deleteTransaction = async (req, res) => {
    try {
        const { id } = req.params;

        const transaction = await Transaction.findByPk(id, { include: [Wallet] });
        if (!transaction) {
            return res.status(404).json({ error: 'Transação não encontrada' });
        }

        // Check ownership
        if (transaction.user_id !== req.user.id) {
            return res.status(403).json({ error: 'Você não tem permissão para excluir esta transação' });
        }

        // Revert balance change
        const amount = parseFloat(transaction.amount);
        transaction.Wallet.balance = parseFloat(transaction.Wallet.balance) - amount;
        await transaction.Wallet.save();

        await transaction.destroy();

        res.json({ message: 'Transação excluída com sucesso' });
    } catch (error) {
        console.error('Error in deleteTransaction:', error);
        res.status(500).json({ error: error.message });
    }
};
