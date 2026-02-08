const { Transaction, Wallet, User, CreditCardPurchase, CreditCard } = require('../models');
const { Op } = require('sequelize');
const budgetAlertService = require('../services/budgetAlertService');
const achievementService = require('../services/achievementService');
const notificationService = require('../services/notificationService');

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

        // 1. Identificar Usuários (Modo Conjunto vs Individual)
        const user = await User.findByPk(userId);
        let userFilter = [userId];

        if (viewMode === 'joint' && user.partner_id) {
            userFilter.push(user.partner_id);
        } else if (viewMode === 'user2' && user.partner_id) {
            userFilter = [user.partner_id];
        }

        // 2. Configurar Filtros para Transações Bancárias (Tabela Transaction)
        let transWhere = { user_id: { [Op.in]: userFilter } };

        // Filtro de Busca (Título ou Categoria)
        if (search) {
            transWhere[Op.or] = [
                { title: { [Op.like]: `%${search}%` } },
                { category: { [Op.like]: `%${search}%` } }
            ];
        }

        // Filtro de Ano
        if (year && year !== 'all') {
            const startYear = new Date(`${year}-01-01T00:00:00.000Z`);
            const endYear = new Date(`${year}-12-31T23:59:59.999Z`);
            transWhere.date = { [Op.between]: [startYear, endYear] };
        }

        // Outros Filtros
        if (category && category !== 'all') transWhere.category = category;
        if (type && type !== 'all') transWhere.type = type;

        // Filtro de Data Personalizado
        if (startDate || endDate) {
            const dateFilter = {};
            if (startDate) dateFilter[Op.gte] = new Date(startDate);
            if (endDate) {
                const end = new Date(endDate);
                end.setHours(23, 59, 59, 999);
                dateFilter[Op.lte] = end;
            }
            transWhere.date = dateFilter;
        }

        // Filtro de Valor (Min/Max)
        if (minAmount || maxAmount) {
            const { sequelize } = require('../models');
            const absAmount = sequelize.fn('ABS', sequelize.col('amount'));
            const amountWhere = {};
            if (minAmount) amountWhere[Op.gte] = parseFloat(minAmount);
            if (maxAmount) amountWhere[Op.lte] = parseFloat(maxAmount);
            transWhere[Op.and] = [...(transWhere[Op.and] || []), sequelize.where(absAmount, amountWhere)];
        }

        // 3. Buscar Transações Bancárias
        const bankTransactions = await Transaction.findAll({
            where: transWhere,
            include: [
                { model: Wallet, attributes: ['name', 'type'] },
                { model: User, attributes: ['name'] }
            ],
            order: [['date', 'DESC']]
        });

        // 4. Configurar Filtros para Compras no Crédito (Tabela CreditCardPurchase)
        // Nota: Só buscamos no crédito se o filtro de tipo permitir 'expense' (pois crédito é sempre despesa)
        let ccPurchases = [];
        if (!type || type === 'all' || type === 'expense') {
            let ccWhere = {
                // Sincronizar filtro de data
                purchase_date: transWhere.date || { [Op.ne]: null }
            };

            // Filtro de Busca
            if (search) {
                ccWhere[Op.or] = [
                    { description: { [Op.like]: `%${search}%` } },
                    { category: { [Op.like]: `%${search}%` } }
                ];
            }

            if (category && category !== 'all') ccWhere.category = category;

            // Filtro de Valor
            if (minAmount || maxAmount) {
                const amountWhere = {};
                if (minAmount) amountWhere[Op.gte] = parseFloat(minAmount);
                if (maxAmount) amountWhere[Op.lte] = parseFloat(maxAmount);
                ccWhere.total_amount = amountWhere;
            }

            // Buscar Compras
            ccPurchases = await CreditCardPurchase.findAll({
                where: ccWhere,
                include: [{
                    model: CreditCard,
                    where: { user_id: { [Op.in]: userFilter } },
                    attributes: ['name'] // Nome do cartão será o nome da "Carteira"
                }],
                order: [['purchase_date', 'DESC']]
            });
        }

        // 5. Unificar e Normalizar Dados
        // Transforma compras de crédito para o formato de transação
        const normalizedCC = ccPurchases.map(cc => ({
            id: `cc_${cc.id}`, // Prefixo para ID único
            title: cc.description,
            amount: -Math.abs(parseFloat(cc.total_amount)), // Valor negativo (Despesa)
            category: cc.category,
            date: cc.purchase_date,
            type: 'expense', // Visualmente é uma despesa
            isCreditCard: true, // Flag para frontend se necessário
            Wallet: { name: cc.CreditCard ? cc.CreditCard.name : 'Cartão de Crédito', type: 'credit_card' },
            User: { name: 'Cartão' },
            createdAt: cc.createdAt
        }));

        // Converter transações do Sequelize para JSON puro
        const normalizedBank = bankTransactions.map(t => t.toJSON());

        // Combinar as duas listas
        let allTransactions = [...normalizedBank, ...normalizedCC];

        // 6. Ordenação Final (Data Decrescente e então Criado em Decrescente)
        allTransactions.sort((a, b) => {
            const dateComparison = new Date(b.date) - new Date(a.date);
            if (dateComparison !== 0) return dateComparison;

            // Se as datas forem iguais, ordenar pelo momento da criação
            return new Date(b.createdAt) - new Date(a.createdAt);
        });

        // 7. Paginação em Memória (Slice)
        const totalItems = allTransactions.length;
        const paginatedTransactions = allTransactions.slice(offset, offset + parseInt(limit));

        res.json({
            transactions: paginatedTransactions,
            totalItems: totalItems,
            totalPages: Math.ceil(totalItems / limit),
            currentPage: parseInt(page)
        });

    } catch (error) {
        console.error('Erro em getTransactions unificado:', error);
        res.status(500).json({ error: error.message });
    }
};

exports.createTransaction = async (req, res) => {
    try {
        const { title, amount, category, date, type, wallet_id, split_with_partner, split_amount, notes } = req.body;

        // Validate wallet belongs to user (only own wallets, not partner's)
        const wallet = await Wallet.findByPk(wallet_id);
        if (!wallet) {
            return res.status(404).json({ error: 'Carteira não encontrada' });
        }

        const user = await User.findByPk(req.user.id);

        // Transações só podem ser criadas em carteiras do próprio usuário
        if (wallet.user_id !== req.user.id) {
            return res.status(403).json({ error: 'Você só pode criar transações em suas próprias carteiras' });
        }

        const amountValue = parseFloat(amount);
        const currentBalance = parseFloat(wallet.balance);

        // Validar saldo suficiente para despesas
        if (amountValue < 0 && Math.abs(amountValue) > currentBalance) {
            return res.status(400).json({
                error: `Saldo insuficiente. Saldo disponível: R$ ${currentBalance.toFixed(2)}`,
                availableBalance: currentBalance
            });
        }

        let finalSplitAmount = split_amount;
        if (split_with_partner && !finalSplitAmount) {
            finalSplitAmount = Math.abs(amountValue) / 2;
        }

        const transaction = await Transaction.create({
            title,
            amount,
            category,
            date,
            type,
            wallet_id,
            user_id: req.user.id,
            split_with_partner: !!split_with_partner,
            split_amount: finalSplitAmount,
            notes
        });

        // Update wallet balance
        wallet.balance = currentBalance + amountValue;
        await wallet.save();

        // Check for budget alerts
        await budgetAlertService.checkAlerts(transaction);

        // Check for achievements
        await achievementService.checkAndUnlockAchievements(req.user.id);

        // Notify partner about the transaction
        if (user.partner_id) {
            await notificationService.notifyPartnerTransaction(
                user.partner_id,
                user.name,
                transaction
            );
        }

        res.status(201).json(transaction);
    } catch (error) {
        console.error('Error in createTransaction:', error);
        res.status(500).json({ error: error.message });
    }
};

exports.updateTransaction = async (req, res) => {
    try {
        const { id } = req.params;
        const { title, amount, category, date, type, split_with_partner, split_amount, notes } = req.body;

        // Bloquear edição de compras de cartão por esta rota por enquanto
        if (String(id).startsWith('cc_')) {
            return res.status(400).json({
                error: 'Para editar compras de crédito, utilize a seção de Cartões.'
            });
        }

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
        transaction.split_with_partner = !!split_with_partner;
        transaction.split_amount = split_with_partner ? (split_amount || Math.abs(parseFloat(amount)) / 2) : null;
        transaction.notes = notes;
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

        // 1. Tratamento para Compras de Cartão de Crédito
        if (String(id).startsWith('cc_')) {
            const realId = id.replace('cc_', '');

            // Buscar a compra
            const purchase = await CreditCardPurchase.findByPk(realId, {
                include: [{ model: CreditCard }]
            });

            if (!purchase) {
                return res.status(404).json({ error: 'Compra de cartão não encontrada' });
            }

            // Verificar permissão
            const userId = req.user.id;
            const user = await User.findByPk(userId);
            const allowedUsers = [userId];
            if (user.partner_id) allowedUsers.push(user.partner_id);

            if (!allowedUsers.includes(purchase.CreditCard.user_id)) {
                return res.status(403).json({ error: 'Sem permissão para excluir esta compra' });
            }

            // Excluir compra (sem afetar saldo de carteira, pois é crédito)
            await purchase.destroy();
            return res.json({ message: 'Compra de cartão excluída com sucesso' });
        }

        // 2. Fluxo Padrão (Transação Bancária)
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
