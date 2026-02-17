const express = require('express');
const router = express.Router();
const { Recurring, User, Transaction, Wallet, CreditCard, CreditCardInvoice } = require('../models');
const auth = require('../middleware/authMiddleware');
const { Op } = require('sequelize');

// Listagem de transações recorrentes/parceladas
router.get('/', auth, async (req, res) => {
    try {
        const { year, month, viewMode } = req.query;
        const userId = req.user.id;

        // 1. Identificar Usuários (Modo Conjunto vs Individual)
        const user = await User.findByPk(userId);
        let userFilter = [userId];

        if (viewMode === 'joint' && user.partner_id) {
            userFilter.push(user.partner_id);
        } else if (viewMode === 'user2' && user.partner_id) {
            userFilter = [user.partner_id];
        }

        let whereClause = { user_id: { [Op.in]: userFilter } };

        if (year && month) {
            // Construção das datas para comparação DATEONLY
            const strMonth = month.toString().padStart(2, '0');
            const startDate = `${year}-${strMonth}-01`;

            // Calcula o último dia do mês corretamente
            const lastDay = new Date(year, month, 0).getDate();
            const endDate = `${year}-${strMonth}-${lastDay}`;

            whereClause.date = {
                [Op.between]: [startDate, endDate]
            };
        }

        const items = await Recurring.findAll({
            where: whereClause,
            order: [['date', 'ASC']]
        });

        // 3. Buscar faturas de cartão de crédito para o período
        let invoiceItems = [];
        if (year && month) {
            const creditCards = await CreditCard.findAll({
                where: { user_id: { [Op.in]: userFilter } }
            });
            const cardIds = creditCards.map(c => c.id);

            const invoices = await CreditCardInvoice.findAll({
                where: {
                    credit_card_id: { [Op.in]: cardIds },
                    month: parseInt(month),
                    year: parseInt(year)
                },
                include: [{
                    model: CreditCard,
                    attributes: ['name']
                }]
            });

            invoiceItems = invoices.map(inv => ({
                id: `invoice-${inv.id}`,
                title: `Fatura ${inv.CreditCard.name}`,
                amount: inv.amount,
                type: 'expense',
                status: inv.paid ? 'paid' : 'pending',
                date: inv.due_date,
                isInvoice: true,
                credit_card_id: inv.credit_card_id
            }));
        }

        // Combinar e ordenar
        const allItems = [...items, ...invoiceItems].sort((a, b) => new Date(a.date) - new Date(b.date));

        res.json(allItems);
    } catch (error) {
        console.error('Erro ao buscar transações recorrentes:', error);
        res.status(500).json({ error: 'Falha ao buscar itens recorrentes' });
    }
});

// Create
router.post('/', auth, async (req, res) => {
    try {
        const { title, amount, type, date, installments = 1, isRecurring = false, wallet_id } = req.body;
        const userId = req.user.id;
        const baseDate = new Date(date + 'T12:00:00');

        // Handling Expense Installments
        if (type === 'expense' && installments > 1) {
            const promises = [];
            const baseTitle = title;

            for (let i = 0; i < installments; i++) {
                const newDate = new Date(baseDate);
                newDate.setMonth(baseDate.getMonth() + i);

                promises.push(Recurring.create({
                    title: `${baseTitle} (${i + 1}/${installments})`,
                    amount,
                    type,
                    date: newDate,
                    user_id: userId,
                    wallet_id: wallet_id || null
                }));
            }

            await Promise.all(promises);
            return res.status(201).json({ message: 'Parcelas criadas com sucesso' });
        }

        // Handling Recurring Income
        if (type === 'income' && isRecurring) {
            const promises = [];

            for (let i = 0; i < 12; i++) {
                const newDate = new Date(baseDate);
                newDate.setMonth(baseDate.getMonth() + i);

                promises.push(Recurring.create({
                    title,
                    amount,
                    type,
                    date: newDate,
                    user_id: userId,
                    wallet_id: wallet_id || null
                }));
            }

            await Promise.all(promises);
            return res.status(201).json({ message: 'Receitas recorrentes criadas' });
        }

        // Single item
        const item = await Recurring.create({
            title,
            amount,
            type,
            date,
            user_id: userId,
            wallet_id: wallet_id || null
        });
        res.status(201).json(item);
    } catch (error) {
        console.error(error);
        res.status(400).json({ error: 'Erro ao criar item recorrente' });
    }
});

// Update status or details
router.put('/:id', auth, async (req, res) => {
    const { id } = req.params;
    const { status, wallet_id } = req.body;

    // 1. Tratamento Especial para Faturas de Cartão de Crédito
    if (id.startsWith('invoice-')) {
        const t = await Transaction.sequelize.transaction();
        try {
            const invoiceId = id.replace('invoice-', '');
            const invoice = await CreditCardInvoice.findByPk(invoiceId, {
                include: [CreditCard],
                transaction: t,
                lock: t.LOCK.UPDATE
            });

            if (!invoice) {
                await t.rollback();
                return res.status(404).json({ error: 'Fatura não encontrada' });
            }

            // Verificar se o cartão pertence ao usuário ou parceiro
            const user = await User.findByPk(req.user.id);
            const allowedUsers = [req.user.id];
            if (user.partner_id) allowedUsers.push(user.partner_id);

            if (!allowedUsers.includes(invoice.CreditCard.user_id)) {
                await t.rollback();
                return res.status(403).json({ error: 'Sem permissão' });
            }

            const wasPaid = invoice.paid;
            const nowPaid = status === 'paid';

            if (nowPaid && !wasPaid) {
                if (!wallet_id) {
                    await t.rollback();
                    return res.status(400).json({ error: 'Carteira necessária para pagamento' });
                }

                const wallet = await Wallet.findByPk(wallet_id, { transaction: t, lock: t.LOCK.UPDATE });
                if (!wallet) {
                    await t.rollback();
                    return res.status(404).json({ error: 'Carteira não encontrada' });
                }

                const deductionAmount = -Math.abs(parseFloat(invoice.amount));

                await Transaction.create({
                    title: `Pagamento fatura ${invoice.CreditCard.name} - ${invoice.month}/${invoice.year}`,
                    amount: deductionAmount,
                    type: 'expense',
                    category: 'Cartão de Crédito',
                    wallet_id: wallet.id,
                    user_id: req.user.id,
                    date: new Date()
                }, { transaction: t });

                wallet.balance = parseFloat(wallet.balance) + deductionAmount;
                await wallet.save({ transaction: t });

                invoice.paid = true;
                invoice.paid_date = new Date();
            } else if (!nowPaid && wasPaid) {
                // Reverter pagamento (opcional, mas bom para consistência se permitido na UI)
                invoice.paid = false;
                invoice.paid_date = null;
            }

            await invoice.save({ transaction: t });
            await t.commit();
            return res.json(invoice);
        } catch (error) {
            if (t) await t.rollback();
            console.error('Erro ao atualizar fatura via recorrência:', error);
            return res.status(500).json({ error: error.message });
        }
    }

    const t = await Transaction.sequelize.transaction();
    try {
        const { status } = req.body;
        const payload = { ...req.body };
        if (payload.wallet_id === '') payload.wallet_id = null;

        // Busca com LOCK para evitar race condition (muitos cliques seguidos)
        const item = await Recurring.findOne({
            where: { id: req.params.id, user_id: req.user.id },
            transaction: t,
            lock: t.LOCK.UPDATE
        });

        if (!item) {
            await t.rollback();
            return res.status(404).json({ error: 'Item não encontrado' });
        }

        // Lógica: Se for Receita e mudar para "Recebido"
        if (item.type === 'income' && status === 'received' && item.status !== 'received') {
            // Se já tem um transaction_id, não cria de novo (prevenção extra contra double-click)
            if (!item.transaction_id) {
                const walletId = item.wallet_id || payload.wallet_id;

                if (!walletId) {
                    await t.rollback();
                    return res.status(400).json({ error: 'É necessário informar uma carteira para receber esta receita.' });
                }

                const wallet = await Wallet.findByPk(walletId, { transaction: t, lock: t.LOCK.UPDATE });
                if (!wallet || wallet.user_id !== req.user.id) {
                    await t.rollback();
                    return res.status(404).json({ error: 'Carteira não encontrada' });
                }

                // Criar a transação financeira real
                const newTransaction = await Transaction.create({
                    title: `${item.title} (Recorrência)`,
                    amount: parseFloat(item.amount),
                    category: 'Receita',
                    date: new Date(),
                    type: 'income',
                    wallet_id: walletId,
                    user_id: req.user.id
                }, { transaction: t });

                // Salva o link da transação no item recorrente para controle futuro
                payload.transaction_id = newTransaction.id;

                // Atualizar saldo da carteira
                wallet.balance = parseFloat(wallet.balance) + parseFloat(item.amount);
                await wallet.save({ transaction: t });
            }
        }

        // Estorno: Se estava Recebido e mudou para Pendente
        if (item.type === 'income' && item.status === 'received' && status === 'pending') {
            const walletId = item.wallet_id;

            // Reverte o saldo da carteira
            if (walletId) {
                const wallet = await Wallet.findByPk(walletId, { transaction: t, lock: t.LOCK.UPDATE });
                if (wallet) {
                    wallet.balance = parseFloat(wallet.balance) - parseFloat(item.amount);
                    await wallet.save({ transaction: t });
                }
            }

            // Remove a transação física associada se ela existir
            if (item.transaction_id) {
                await Transaction.destroy({
                    where: { id: item.transaction_id, user_id: req.user.id },
                    transaction: t
                });
                payload.transaction_id = null;
            }
        }

        await item.update(payload, { transaction: t });
        await t.commit();
        res.json(item);
    } catch (error) {
        if (t) await t.rollback();
        console.error('Erro ao atualizar recorrência:', error);
        res.status(400).json({ error: 'Falha na atualização: ' + error.message });
    }
});

// Delete
router.delete('/:id', auth, async (req, res) => {
    const { id } = req.params;
    try {
        if (id.startsWith('invoice-')) {
            const invoiceId = id.replace('invoice-', '');
            const invoice = await CreditCardInvoice.findByPk(invoiceId, { include: [CreditCard] });

            if (!invoice) return res.status(404).json({ error: 'Fatura não encontrada' });

            const user = await User.findByPk(req.user.id);
            const allowedUsers = [req.user.id];
            if (user.partner_id) allowedUsers.push(user.partner_id);

            if (!allowedUsers.includes(invoice.CreditCard.user_id)) {
                return res.status(403).json({ error: 'Sem permissão' });
            }

            await invoice.destroy();
            return res.sendStatus(204);
        }

        const rows = await Recurring.destroy({
            where: { id: req.params.id, user_id: req.user.id }
        });
        if (!rows) return res.status(404).json({ error: 'Not found' });
        res.sendStatus(204);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Delete failed' });
    }
});

module.exports = router;
