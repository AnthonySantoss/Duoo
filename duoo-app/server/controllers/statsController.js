const { Transaction, User, Category, Wallet, Recurring, UserAchievement, Goal } = require('../models');
const { Op } = require('sequelize');

exports.getStatistics = async (req, res) => {
    try {
        const { viewMode } = req.query;
        const userId = req.user.id;

        let whereClause = {};

        // Determine user filter based on viewMode
        if (viewMode === 'user1') {
            whereClause.user_id = userId;
        } else if (viewMode === 'user2') {
            const user = await User.findByPk(userId);
            if (user.partner_id) {
                whereClause.user_id = user.partner_id;
            } else {
                return res.json({
                    monthly_flow: [],
                    category_breakdown: [],
                    user_contribution: [],
                    insights: []
                });
            }
        } else {
            // Joint view
            const user = await User.findByPk(userId);
            const allowedUsers = [userId];
            if (user.partner_id) allowedUsers.push(user.partner_id);
            whereClause.user_id = { [Op.in]: allowedUsers };
        }

        // 1. Monthly Flow (Last 6 months)
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
        sixMonthsAgo.setDate(1); // Start of month

        const transactions = await Transaction.findAll({
            where: {
                ...whereClause,
                date: { [Op.gte]: sixMonthsAgo }
            },
            order: [['date', 'ASC']]
        });

        const monthlyFlow = {};
        for (let i = 0; i < 6; i++) {
            const d = new Date();
            d.setMonth(d.getMonth() - 5 + i);
            const monthKey = d.toLocaleString('pt-BR', { month: 'short' });
            monthlyFlow[monthKey] = { month: monthKey, income: 0, expense: 0 };
        }

        transactions.forEach(t => {
            const d = new Date(t.date);
            const monthKey = d.toLocaleString('pt-BR', { month: 'short' });
            if (monthlyFlow[monthKey]) {
                if (t.type === 'income') {
                    monthlyFlow[monthKey].income += parseFloat(t.amount);
                } else if (t.type === 'expense') {
                    monthlyFlow[monthKey].expense += Math.abs(parseFloat(t.amount));
                }
            }
        });
        const monthlyFlowData = Object.values(monthlyFlow);

        // 2. Category Breakdown (Expenses only - Current Month)
        const currentMonthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

        const expenseTransactions = await Transaction.findAll({
            where: {
                ...whereClause,
                type: 'expense',
                date: { [Op.gte]: currentMonthStart }
            }
        });

        const categoryStats = {};
        let totalExpenses = 0;
        let largestTransaction = { amount: 0, description: '', category: '' };

        // For Day Pattern analysis
        const dayCounts = {}; // { 'Monday': { category: count } } or simplified { 'Monday': count } of expenses

        expenseTransactions.forEach(t => {
            const amount = Math.abs(parseFloat(t.amount));
            const cat = t.category || 'Outros';

            // Category Stats
            if (!categoryStats[cat]) categoryStats[cat] = 0;
            categoryStats[cat] += amount;
            totalExpenses += amount;

            // Largest Transaction
            if (amount > largestTransaction.amount) {
                largestTransaction = {
                    amount: amount,
                    description: t.description || 'Despesa sem descrição',
                    category: cat
                };
            }

            // Day Pattern
            const d = new Date(t.date);
            const dayName = d.toLocaleString('pt-BR', { weekday: 'long' });
            if (!dayCounts[dayName]) dayCounts[dayName] = 0;
            dayCounts[dayName] += 1; // Count frequency of spending, not amount, for "habit"
        });

        const categoryBreakdown = Object.entries(categoryStats)
            .map(([category, amount]) => ({
                category,
                amount,
                percentage: totalExpenses > 0 ? (amount / totalExpenses) * 100 : 0
            }))
            .sort((a, b) => b.amount - a.amount);

        // 3. User Contribution
        const userStats = {};
        let contributionTotal = 0;

        const users = await User.findAll({
            where: { id: { [Op.in]: whereClause.user_id ? (Array.isArray(whereClause.user_id[Op.in]) ? whereClause.user_id[Op.in] : [whereClause.user_id]) : [] } }
        });
        const userMap = {};
        users.forEach(u => userMap[u.id] = u.name);

        expenseTransactions.forEach(t => {
            const userId = t.user_id;
            const userName = userMap[userId] || 'Desconhecido';
            const amount = Math.abs(parseFloat(t.amount));
            if (!userStats[userName]) userStats[userName] = 0;
            userStats[userName] += amount;
            contributionTotal += amount;
        });

        const userContribution = Object.entries(userStats).map(([name, amount]) => ({
            name,
            amount,
            percentage: contributionTotal > 0 ? (amount / contributionTotal) * 100 : 0
        }));

        // 4. Generate Dynamic Insights
        const insights = [];

        // Insight 1: Attention (Top Category > 30%)
        if (categoryBreakdown.length > 0) {
            const top = categoryBreakdown[0];
            if (top.percentage > 30) {
                insights.push({
                    type: 'warning',
                    title: 'Atenção',
                    message: `Gastos com ${top.category} representam ${top.percentage.toFixed(0)}% do total este mês.`
                });
            } else {
                insights.push({
                    type: 'info', // Green/Good
                    title: 'Equilíbrio',
                    message: `Sua maior despesa (${top.category}) está controlada, representando apenas ${top.percentage.toFixed(0)}% do total.`
                });
            }
        } else {
            insights.push({
                type: 'neutral',
                title: 'Sem Dados',
                message: 'Ainda não há despesas suficientes este mês para gerar alertas.'
            });
        }

        // Insight 2: Largest Impact
        if (largestTransaction.amount > 0) {
            const impactPercentage = (largestTransaction.amount / totalExpenses) * 100;
            insights.push({
                type: 'info',
                title: 'Maior Impacto',
                message: `A compra "${largestTransaction.description}" (R$ ${largestTransaction.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}) representou ${impactPercentage.toFixed(0)}% das saídas.`
            });
        }

        // Insight 3: Weekly Pattern (Day with most transactions)
        const entries = Object.entries(dayCounts);
        if (entries.length > 0) {
            // Sort by count
            entries.sort((a, b) => b[1] - a[1]);
            const topDay = entries[0];
            // Capitalize first letter
            const dayNameCapitalized = topDay[0].charAt(0).toUpperCase() + topDay[0].slice(1);

            insights.push({
                type: 'neutral',
                title: 'Padrão Semanal',
                message: `${dayNameCapitalized} é o dia com mais movimentações (${topDay[1]} compras) este mês.`
            });
        }

        res.json({
            monthly_flow: monthlyFlowData,
            category_breakdown: categoryBreakdown,
            user_contribution: userContribution,
            total_expenses: totalExpenses,
            insights: insights
        });

    } catch (error) {
        console.error('Error fetching statistics:', error);
        res.status(500).json({ error: 'Failed to fetch statistics' });
    }
};

exports.getHealthScore = async (req, res) => {
    try {
        const { viewMode } = req.query;
        const userId = req.user.id;
        const user = await User.findByPk(userId);
        const partner_id = user.partner_id;

        let users = [userId];
        let targetUserId = userId; // For achievements/engagement

        if (viewMode === 'user1') {
            users = [userId];
            targetUserId = userId;
        } else if (viewMode === 'user2') {
            if (partner_id) {
                users = [partner_id];
                targetUserId = partner_id;
            } else {
                return res.json({ score: 0, level: 'N/A', details: [] });
            }
        } else {
            // Joint
            if (partner_id) users.push(partner_id);
            // For engagement in joint mode, we'll take the sum or average?
            // Let's take the count of distinct achievements achieved by the couple
        }

        // 1. Saldo Total (Reserva + Metas)
        const wallets = await Wallet.findAll({ where: { user_id: users } });
        const walletBalance = wallets.reduce((sum, w) => sum + parseFloat(w.balance), 0);

        const goals = await Goal.findAll({ where: { user_id: users } });
        const goalsBalance = goals.reduce((sum, g) => sum + parseFloat(g.current_amount), 0);

        const totalBalance = walletBalance + goalsBalance;

        // 2. Média de Gastos Mensais (Últimos 3 meses)
        const threeMonthsAgo = new Date();
        threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
        const recentExpenses = await Transaction.findAll({
            where: {
                user_id: users,
                type: 'expense',
                date: { [Op.gte]: threeMonthsAgo }
            }
        });
        const totalRecentExpense = recentExpenses.reduce((sum, t) => sum + Math.abs(parseFloat(t.amount)), 0);
        const avgMonthlyExpense = (totalRecentExpense / 3) || 1;

        // 3. Score Components
        let score = 0;
        let details = [];

        // A. Reserva de Emergência (30 pts) - Alvo: 6 meses de gastos
        const monthsReserved = totalBalance / avgMonthlyExpense;
        let reserveScore = Math.max(0, Math.min(30, (monthsReserved / 6) * 30));
        score += reserveScore;
        details.push({
            label: 'Reserva de Emergência',
            value: (monthsReserved > 0 ? monthsReserved.toFixed(1) : '0.0') + ' meses',
            score: reserveScore.toFixed(0),
            max: 30,
            status: monthsReserved >= 6 ? 'success' : (monthsReserved >= 3 ? 'warning' : 'danger')
        });

        // B. Equilíbrio Mensal (40 pts) - Gasto vs Receita nos últimos 30 dias
        const last30Days = new Date();
        last30Days.setDate(last30Days.getDate() - 30);
        const monthTransactions = await Transaction.findAll({
            where: { user_id: users, date: { [Op.gte]: last30Days } }
        });

        let monthIncome = 0;
        let monthExpense = 0;
        monthTransactions.forEach(t => {
            if (t.type === 'income') monthIncome += parseFloat(t.amount);
            else monthExpense += Math.abs(parseFloat(t.amount));
        });

        const savingsRate = monthIncome > 0 ? ((monthIncome - monthExpense) / monthIncome) * 100 : 0;
        let budgetScore = Math.min(40, (savingsRate > 0 ? (savingsRate / 20) * 40 : 0));
        if (budgetScore < 0) budgetScore = 0;

        score += budgetScore;
        details.push({
            label: 'Taxa de Poupança',
            value: (savingsRate > 0 ? savingsRate.toFixed(0) : '0') + '%',
            score: budgetScore.toFixed(0),
            max: 40,
            status: savingsRate >= 20 ? 'success' : (savingsRate > 0 ? 'warning' : 'danger')
        });

        // C. Gamificação (30 pts) - Baseado em conquistas
        let achievementsCount;
        if (viewMode === 'joint') {
            // Count unique achievements reached by at least one member of the couple
            achievementsCount = await UserAchievement.count({
                where: { user_id: users },
                distinct: true,
                col: 'achievement_id'
            });
        } else {
            achievementsCount = await UserAchievement.count({ where: { user_id: targetUserId } });
        }

        let gamificationScore = Math.max(0, Math.min(30, (achievementsCount / 5) * 30));
        score += gamificationScore;
        details.push({
            label: 'Engajamento',
            value: achievementsCount + ' conquistas',
            score: gamificationScore.toFixed(0),
            max: 30,
            status: achievementsCount >= 5 ? 'success' : (achievementsCount >= 2 ? 'warning' : 'danger')
        });

        res.json({
            score: Math.round(score),
            level: score >= 80 ? 'Excelente' : (score >= 60 ? 'Bom' : (score >= 40 ? 'Regular' : 'Crítico')),
            details
        });
    } catch (error) {
        console.error('Error calculating health score:', error);
        res.status(500).json({ error: 'Erro ao calcular score de saúde' });
    }
};
