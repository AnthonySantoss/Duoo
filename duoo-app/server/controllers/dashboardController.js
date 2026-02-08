const { Transaction, Wallet, User, Goal, CreditCard, CreditCardInvoice, CreditCardPurchase } = require('../models');
const { Op } = require('sequelize');

exports.getDashboardStats = async (req, res) => {
    try {
        const { viewMode } = req.query;
        const userId = req.user.id;

        // Get user and partner IDs
        const user = await User.findByPk(userId);
        const allowedUsers = [userId];
        if (user.partner_id) {
            allowedUsers.push(user.partner_id);
        }

        // Filter by viewMode
        let userFilter = [];

        if (viewMode === 'joint') {
            // Joint: show data from both users
            userFilter = allowedUsers;
        } else if (viewMode === 'user1') {
            // User1: show only logged user's data
            userFilter = [userId];
        } else if (viewMode === 'user2') {
            // User2: show only partner's data
            if (user.partner_id) {
                userFilter = [user.partner_id];
            } else {
                userFilter = [userId]; // Fallback if no partner
            }
        } else {
            // Default to joint
            userFilter = allowedUsers;
        }

        // Get wallets
        const wallets = await Wallet.findAll({
            where: {
                user_id: { [Op.in]: userFilter }
            }
        });

        // Get transactions
        const transactions = await Transaction.findAll({
            where: {
                user_id: { [Op.in]: userFilter }
            },
            include: [
                { model: Wallet, attributes: ['name'] },
                { model: User, attributes: ['name'] }
            ],
            order: [
                ['date', 'DESC'],
                ['createdAt', 'DESC']
            ]
        });

        // Get goals to calculate total saved
        const goals = await Goal.findAll({
            where: {
                user_id: { [Op.in]: userFilter }
            }
        });

        // Calculate Stats
        let balance = 0;
        let spent = 0;
        let income = 0;
        let saved = 0;
        let totalSavedInGoals = 0;
        let creditCard = 0;

        // Calculate balance from wallets
        wallets.forEach(w => {
            balance += parseFloat(w.balance || 0);
        });

        // Calculate total saved in goals
        goals.forEach(g => {
            totalSavedInGoals += parseFloat(g.current_amount || 0);
        });

        // Calculate stats from transactions
        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();

        transactions.forEach(t => {
            const transDate = new Date(t.date);
            const amt = parseFloat(t.amount);

            // Only count current month for spent/income
            if (transDate.getMonth() === currentMonth && transDate.getFullYear() === currentYear) {
                if (t.type === 'expense') {
                    // Don't count investments (goal allocations) as spending
                    if (t.category !== 'Investimento') {
                        spent += Math.abs(amt);
                    }
                } else if (t.type === 'income') {
                    income += amt;
                }
            }
        });

        // Calculate saved as income minus expenses (simplified)
        saved = income - spent;
        if (saved < 0) saved = 0;

        // Calculate credit card debt for current month
        // We include joint cards and individual cards belonging to the users in the filter
        const creditCards = await CreditCard.findAll({
            where: {
                [Op.or]: [
                    { user_id: { [Op.in]: userFilter } },
                    { is_joint: true, user_id: { [Op.in]: allowedUsers } } // allowedUsers has both if partner exists
                ]
            }
        });

        const cardIds = creditCards.map(c => c.id);

        let invoices = [];
        if (cardIds.length > 0) {
            // 1. Get explicit invoices for current month/year
            invoices = await CreditCardInvoice.findAll({
                where: {
                    credit_card_id: { [Op.in]: cardIds },
                    month: currentMonth + 1,
                    year: currentYear,
                    paid: false
                }
            });

            const invoiceTotal = invoices.reduce((sum, inv) => sum + parseFloat(inv.amount || 0), 0);

            // 2. Calculate "live" total from active purchases
            // We sum the installment_amount of all purchases where installments remain
            const activePurchases = await CreditCardPurchase.findAll({
                where: {
                    credit_card_id: { [Op.in]: cardIds },
                    remaining_installments: { [Op.gt]: 0 }
                }
            });

            const purchasesTotal = activePurchases.reduce((sum, p) => {
                const amt = parseFloat(p.installment_amount || 0);
                return sum + amt;
            }, 0);

            // The 'creditCard' value should be the current live spending plus any manual invoice adjustments
            // Math.max is used because usually purchasesTotal reflects the live version of the invoice
            creditCard = Math.max(invoiceTotal, purchasesTotal);
        }

        // Calculate balance variation (vs start of month)
        const netChange = income - spent;
        const startBalance = balance - netChange;
        let balanceVariation = 0;
        if (startBalance !== 0) {
            balanceVariation = ((balance - startBalance) / Math.abs(startBalance)) * 100;
        } else if (balance !== 0) {
            balanceVariation = 100;
        }

        // Calculate next invoice due date
        let nextInvoiceDay = null;
        if (invoices.length > 0) {
            const dates = invoices.map(inv => new Date(inv.due_date));
            const nextDate = new Date(Math.min(...dates));
            nextInvoiceDay = nextDate.getDate();
        }

        // Calculate days since last transaction
        let daysSinceLastTransaction = 0;
        if (transactions.length > 0) {
            const lastDate = new Date(transactions[0].date);
            const today = new Date();
            // Reset time part for accurate day calculation
            lastDate.setHours(0, 0, 0, 0);
            today.setHours(0, 0, 0, 0);

            const diffTime = today - lastDate;
            daysSinceLastTransaction = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        }

        // Return structured data
        const responseData = {
            balance: balance,
            balanceVariation: balanceVariation,
            spent: spent,
            saved: saved,
            invested: totalSavedInGoals, // Now shows total saved in goals
            creditCard: creditCard,
            nextInvoiceDay: nextInvoiceDay,
            daysSinceLastTransaction: daysSinceLastTransaction,
            transactions: transactions.slice(0, 5),
            expensesByCategory: calculateCategoryStats(transactions.filter(t => {
                const transDate = new Date(t.date);
                return transDate.getMonth() === currentMonth && transDate.getFullYear() === currentYear;
            }))
        };

        res.json(responseData);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
};

function calculateCategoryStats(transactions) {
    const expenses = {};
    let total = 0;

    transactions.forEach(t => {
        if (t.type === 'expense' && t.category !== 'Investimento') {
            const val = Math.abs(parseFloat(t.amount));
            expenses[t.category] = (expenses[t.category] || 0) + val;
            total += val;
        }
    });

    return Object.entries(expenses)
        .sort(([, a], [, b]) => b - a)
        .map(([category, amount], index) => ({
            category,
            amount,
            percentage: total > 0 ? (amount / total) * 100 : 0,
            color: ["bg-rose-500", "bg-orange-500", "bg-amber-500", "bg-emerald-500", "bg-blue-500"][index % 5]
        }));
}
