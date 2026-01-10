const { Simulation, Wallet, User, Transaction } = require('../models');
const { Op } = require('sequelize');

// Get simulation data: Current Balance, Average Savings, History
exports.getSimulationData = async (req, res) => {
    try {
        const { viewMode } = req.query; // 'joint', 'user1', 'user2'
        const userId = req.user.id;

        // Determine scope
        let userScope = [userId];
        const user = await User.findByPk(userId);

        if (viewMode === 'joint' && user.partner_id) {
            userScope.push(user.partner_id);
        } else if (viewMode === 'user2' && user.partner_id) {
            userScope = [user.partner_id];
        } else if (viewMode === 'user1') {
            userScope = [userId];
        }

        // 1. Current Balance (Sum of wallets)
        const wallets = await Wallet.findAll({
            where: { user_id: { [Op.in]: userScope } }
        });
        const currentBalance = wallets.reduce((sum, w) => sum + parseFloat(w.balance), 0);

        // 2. Average Monthly Savings (Last 3 months)
        const threeMonthsAgo = new Date();
        threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
        threeMonthsAgo.setDate(1);

        const transactions = await Transaction.findAll({
            where: {
                user_id: { [Op.in]: userScope },
                date: { [Op.gte]: threeMonthsAgo }
            }
        });

        // Group transactions by month to calculate real average
        const monthlyStats = {};

        transactions.forEach(t => {
            const date = new Date(t.date);
            const key = `${date.getFullYear()}-${date.getMonth()}`;

            if (!monthlyStats[key]) {
                monthlyStats[key] = { income: 0, expense: 0 };
            }

            if (t.type === 'income') monthlyStats[key].income += parseFloat(t.amount);
            if (t.type === 'expense') monthlyStats[key].expense += parseFloat(t.amount);
        });

        const monthsFound = Object.keys(monthlyStats).length;
        let totalMonthlySavings = 0;

        Object.values(monthlyStats).forEach(month => {
            totalMonthlySavings += (month.income - month.expense);
        });

        const averageSavings = monthsFound > 0 ? totalMonthlySavings / monthsFound : 0;

        // 3. History
        const history = await Simulation.findAll({
            where: { user_id: { [Op.in]: userScope } },
            order: [['date', 'DESC']],
            include: [{ model: User, attributes: ['name'] }]
        });

        res.json({
            currentBalance,
            averageSavings: averageSavings > 0 ? averageSavings : 0, // Assume 0 if negative for safety? Or let it be negative?
            history
        });
    } catch (error) {
        console.error('Error fetching simulation data:', error);
        console.error(error.stack); // Log full stack trace
        res.status(500).json({ error: 'Failed to fetch simulation data', details: error.message });
    }
};

// Save a confirmed simulation
exports.saveSimulation = async (req, res) => {
    try {
        const { item_name, amount, installments } = req.body;

        const simulation = await Simulation.create({
            item_name,
            amount,
            installments,
            user_id: req.user.id
        });

        res.status(201).json(simulation);
    } catch (error) {
        console.error('Error saving simulation:', error);
        res.status(500).json({ error: 'Failed to save simulation' });
    }
};
