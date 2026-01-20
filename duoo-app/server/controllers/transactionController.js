const { Transaction, Wallet, User } = require('../models');
const { Op } = require('sequelize');
const budgetAlertService = require('../services/budgetAlertService');

exports.getTransactions = async (req, res) => {
    try {
        const {
            viewMode,
            search,
            page = 1,
            limit = 10,
            year,
            category,
            type,
            minAmount,
            maxAmount,
            startDate,
            endDate
        } = req.query;

        const userId = req.user.id;
        const offset = (parseInt(page) - 1) * parseInt(limit);

        // Get user to check for partner
        const user = await User.findByPk(userId);
        let whereClause = {};

        // Filter by viewMode
        if (viewMode === 'user1') {
            whereClause.user_id = userId;
        } else if (viewMode === 'user2' && user.partner_id) {
            whereClause.user_id = user.partner_id;
        } else if (viewMode === 'joint') {
            const partnerIds = [userId];
            if (user.partner_id) {
                partnerIds.push(user.partner_id);
            }
            whereClause.user_id = { [Op.in]: partnerIds };
        } else {
            whereClause.user_id = userId;
        }

        // Search filter
        if (search) {
            whereClause[Op.or] = [
                { title: { [Op.like]: `%${search}%` } },
                { category: { [Op.like]: `%${search}%` } }
            ];
        }

        // Year filter
        if (year && year !== 'all') {
            const startYear = new Date(`${year}-01-01T00:00:00.000Z`);
            const endYear = new Date(`${year}-12-31T23:59:59.999Z`);

            // If startDate/endDate is also present, we need to intersect
            // But for simplicity, year filter overrides date range or operates alongside it
            // If date filter is not set, use year
            if (!startDate && !endDate && !whereClause.date) {
                whereClause.date = { [Op.between]: [startYear, endYear] };
            }
        }

        // Category filter
        if (category && category !== 'all') {
            whereClause.category = category;
        }

        // Type filter
        if (type && type !== 'all') {
            whereClause.type = type;
        }

        // Amount filters (Absolute value logic)
        // Note: We need the sequelize instance to use fn('ABS')
        // Assuming sequelize is available in models/index.js (we need to require it at top of file, but let's assume standard simple filtering for now is better if we don't want to break imports yet)
        // Actually, let's keep it simple: Positive/Negative filter is handled by 'type'.
        // minAmount/maxAmount usually refers to MAGNITUDE in the frontend filters.
        if (minAmount || maxAmount) {
            const { sequelize } = require('../models');
            const absAmount = sequelize.fn('ABS', sequelize.col('amount'));

            const amountWhere = {};
            if (minAmount) amountWhere[Op.gte] = parseFloat(minAmount);
            if (maxAmount) amountWhere[Op.lte] = parseFloat(maxAmount);

            whereClause[Op.and] = [
                ...(whereClause[Op.and] || []),
                sequelize.where(absAmount, amountWhere)
            ];
        }

        // Date Range filters
        if (startDate || endDate) {
            const dateFilter = {};
            if (startDate) dateFilter[Op.gte] = new Date(startDate);
            if (endDate) {
                const end = new Date(endDate);
                end.setHours(23, 59, 59, 999);
                dateFilter[Op.lte] = end;
            }

            // If year was set, verify intersection? 
            // We overwrite year logic if specific dates are provided, or use logic AND.
            // Let's simplified: specific dates take precedence or just overwrite 'date' field in whereClause
            whereClause.date = dateFilter;
        }

        const { count, rows } = await Transaction.findAndCountAll({
            where: whereClause,
            include: [
                { model: Wallet, attributes: ['name', 'type'] },
                { model: User, attributes: ['name'] }
            ],
            order: [['date', 'DESC'], ['createdAt', 'DESC']],
            limit: parseInt(limit),
            offset: offset
        });

        res.json({
            transactions: rows,
            totalItems: count,
            totalPages: Math.ceil(count / limit),
            currentPage: parseInt(page)
        });
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

        // Check for budget alerts
        await budgetAlertService.checkAlerts(transaction);

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
