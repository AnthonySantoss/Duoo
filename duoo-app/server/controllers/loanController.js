const { Loan, Goal, User, Wallet, Transaction } = require('../models');
const { Op } = require('sequelize');

exports.getLoans = async (req, res) => {
    try {
        const userId = req.user.id;
        // Optionally handle viewMode if needed, but for now just get user's loans
        const loans = await Loan.findAll({
            where: { user_id: userId },
            include: [
                { model: Goal, attributes: ['title'] },
                { model: User, attributes: ['name'] }
            ],
            order: [['date', 'DESC']]
        });

        // Format response to match UI needs
        const formattedLoans = loans.map(loan => ({
            id: loan.id,
            goalId: loan.goal_id,
            goalTitle: loan.Goal ? loan.Goal.title : 'Meta Excluída',
            userName: loan.User ? loan.User.name : 'Desconhecido',
            originalAmount: parseFloat(loan.original_amount),
            totalToPay: parseFloat(loan.total_amount),
            remainingAmount: parseFloat(loan.remaining_amount),
            installmentsTotal: loan.installments_total,
            installmentsPaid: loan.installments_paid,
            installmentValue: parseFloat(loan.installment_value),
            interestRate: parseFloat(loan.interest_rate),
            status: loan.status,
            date: loan.date
        }));

        res.json(formattedLoans);
    } catch (error) {
        console.error('Error fetching loans:', error);
        res.status(500).json({ error: 'Failed to fetch loans' });
    }
};

exports.createLoan = async (req, res) => {
    try {
        const userId = req.user.id;
        const { goal_id, wallet_id, amount, installments, interest_rate } = req.body;

        if (!wallet_id) return res.status(400).json({ error: 'Wallet is required' });

        const goal = await Goal.findOne({ where: { id: goal_id } }); // Add user check if strict
        if (!goal) return res.status(404).json({ error: 'Goal not found' });

        const wallet = await Wallet.findOne({ where: { id: wallet_id, user_id: userId } });
        if (!wallet) return res.status(404).json({ error: 'Wallet not found' });

        if (parseFloat(goal.current_amount) < parseFloat(amount)) {
            return res.status(400).json({ error: 'Insufficient funds in goal' });
        }

        // Calculate totals
        const principal = parseFloat(amount);
        const rate = parseFloat(interest_rate);
        const months = parseInt(installments);

        // Simple Compound Interest formula matching reference: 
        // Total = Valor * (1 + taxa/100)^meses
        const totalToPay = principal * Math.pow((1 + rate / 100), months);
        const installmentValue = totalToPay / months;

        // 1. Deduct from Goal
        goal.current_amount = parseFloat(goal.current_amount) - principal;
        await goal.save();

        // 2. Add to Wallet
        wallet.balance = parseFloat(wallet.balance) + principal;
        await wallet.save();

        // 3. Create Transaction (Record the inflow)
        await Transaction.create({
            user_id: userId,
            wallet_id: wallet.id,
            type: 'income',
            amount: principal,
            title: `Empréstimo: ${goal.title}`,
            category: 'Empréstimo',
            date: new Date()
        });

        // 4. Create Loan
        const loan = await Loan.create({
            user_id: userId,
            goal_id: goal.id,
            original_amount: principal,
            total_amount: totalToPay,
            remaining_amount: totalToPay,
            installments_total: months,
            installments_paid: 0,
            installment_value: installmentValue,
            interest_rate: rate,
            status: 'active',
            date: new Date()
        });

        res.status(201).json(loan);

    } catch (error) {
        console.error('Error creating loan:', error);
        res.status(500).json({ error: 'Failed to create loan' });
    }
};

exports.payInstallment = async (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;
        const { wallet_id } = req.body; // Need wallet to pay form

        if (!wallet_id) return res.status(400).json({ error: 'Wallet is required to pay' });

        const loan = await Loan.findByPk(id);

        if (!loan) return res.status(404).json({ error: 'Loan not found' });
        if (loan.status === 'paid') return res.status(400).json({ error: 'Loan already paid' });

        const wallet = await Wallet.findOne({ where: { id: wallet_id, user_id: userId } });
        if (!wallet) return res.status(404).json({ error: 'Wallet not found' });

        const installmentVal = parseFloat(loan.installment_value);

        if (parseFloat(wallet.balance) < installmentVal) {
            return res.status(400).json({ error: 'Insufficient funds in wallet' });
        }

        // 1. Deduct from Wallet
        wallet.balance = parseFloat(wallet.balance) - installmentVal;
        await wallet.save();

        // 2. Create Transaction (Expense)
        // Fetch goal title for description
        const goalForDescription = await Goal.findByPk(loan.goal_id);
        await Transaction.create({
            user_id: userId,
            wallet_id: wallet.id,
            type: 'expense',
            amount: -installmentVal,
            title: `Parc ${loan.installments_paid + 1}/${loan.installments_total}: ${goalForDescription ? goalForDescription.title : 'Empréstimo'}`,
            category: 'Empréstimo',
            date: new Date()
        });

        // 3. Update Loan
        loan.installments_paid += 1;
        loan.remaining_amount = parseFloat(loan.remaining_amount) - installmentVal;

        // Check for float precision issues or completion
        if (loan.remaining_amount < 0.1 || loan.installments_paid >= loan.installments_total) {
            loan.remaining_amount = 0;
            loan.status = 'paid';
        }
        await loan.save();

        // 4. Add back to Goal (Principal + Interest part of this installment goes back to goal)
        // logic: Money flows back to goal
        const goal = await Goal.findByPk(loan.goal_id);
        if (goal) {
            goal.current_amount = parseFloat(goal.current_amount) + installmentVal;
            await goal.save();
        }

        res.json(loan);

    } catch (error) {
        console.error('Error paying installment:', error);
        res.status(500).json({ error: 'Failed to pay installment' });
    }
};

/**
 * Busca transações compatíveis para vincular ao empréstimo
 * Busca nos últimos 7 dias, com valor ±10%, categorias relevantes
 */
exports.getCompatibleTransactions = async (req, res) => {
    try {
        const userId = req.user.id;
        const { amount, days = 7 } = req.query;

        if (!amount) {
            return res.status(400).json({ error: 'Amount is required' });
        }

        const targetAmount = Math.abs(parseFloat(amount));
        const minAmount = targetAmount * 0.9; // -10%
        const maxAmount = targetAmount * 1.1; // +10%

        // Data de início (X dias atrás)
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - parseInt(days));

        // Buscar transações de saída (negativas) que podem ser saques/transferências
        const transactions = await Transaction.findAll({
            where: {
                user_id: userId,
                date: { [Op.gte]: startDate },
                amount: { [Op.lt]: 0 }, // Apenas saídas
                category: {
                    [Op.in]: ['Transferência', 'Saque', 'Outros']
                }
            },
            include: [
                { model: Wallet, attributes: ['name', 'bank_name'] }
            ],
            order: [['date', 'DESC']]
        });

        // Filtrar por valor compatível
        const compatible = transactions.filter(t => {
            const tAmount = Math.abs(parseFloat(t.amount));
            return tAmount >= minAmount && tAmount <= maxAmount;
        });

        // Formatar resposta
        const formatted = compatible.map(t => ({
            id: t.id,
            title: t.title,
            amount: parseFloat(t.amount),
            date: t.date,
            category: t.category,
            wallet: t.Wallet ? {
                name: t.Wallet.name,
                bank_name: t.Wallet.bank_name
            } : null,
            similarity: Math.round((1 - Math.abs(Math.abs(parseFloat(t.amount)) - targetAmount) / targetAmount) * 100)
        }));

        // Ordenar por similaridade (mais similar primeiro)
        formatted.sort((a, b) => b.similarity - a.similarity);

        res.json(formatted);
    } catch (error) {
        console.error('Error fetching compatible transactions:', error);
        res.status(500).json({ error: 'Failed to fetch compatible transactions' });
    }
};

/**
 * Vincula uma transação ao empréstimo e renomeia
 */
exports.linkTransaction = async (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.params; // loan ID
        const { transaction_id } = req.body;

        if (!transaction_id) {
            return res.status(400).json({ error: 'Transaction ID is required' });
        }

        // Buscar empréstimo
        const loan = await Loan.findOne({
            where: { id, user_id: userId },
            include: [{ model: Goal, attributes: ['title'] }]
        });

        if (!loan) {
            return res.status(404).json({ error: 'Loan not found' });
        }

        // Buscar transação
        const transaction = await Transaction.findOne({
            where: { id: transaction_id, user_id: userId }
        });

        if (!transaction) {
            return res.status(404).json({ error: 'Transaction not found' });
        }

        // Buscar nome do usuário
        const user = await User.findByPk(userId);
        const userName = user ? user.name : 'Usuário';

        // Renomear transação
        const goalTitle = loan.Goal ? loan.Goal.title : 'Meta';
        await transaction.update({
            title: `Auto-empréstimo - ${userName} (${goalTitle})`,
            category: 'Transferência'
        });

        // Vincular ao empréstimo
        await loan.update({
            linked_transaction_id: transaction_id
        });

        res.json({
            success: true,
            message: 'Transaction linked successfully',
            loan: {
                id: loan.id,
                linked_transaction_id: loan.linked_transaction_id
            },
            transaction: {
                id: transaction.id,
                title: transaction.title,
                category: transaction.category
            }
        });
    } catch (error) {
        console.error('Error linking transaction:', error);
        res.status(500).json({ error: 'Failed to link transaction' });
    }
};
