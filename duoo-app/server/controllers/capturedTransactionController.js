const { sequelize, Transaction, Wallet, CreditCard, CreditCardPurchase, User, UserConfig } = require('../models');
const budgetAlertService = require('../services/budgetAlertService');
const achievementService = require('../services/achievementService');
const notificationService = require('../services/notificationService');
const categorizerService = require('../services/transactionCategorizer');

exports.create = async (req, res) => {
    const {
        external_id: externalId,
        title,
        amount,
        type,
        category,
        date,
        wallet_id: walletId,
        credit_card_id: creditCardId,
        source_type: sourceType = 'wallet',
        source_package: sourcePackage,
        confidence = null
    } = req.body;

    const existing = await Transaction.findOne({
        where: { source_external_id: externalId },
        attributes: ['id', 'title', 'amount', 'date', 'type']
    });

    if (existing) {
        return res.status(200).json({ created: false, duplicate: true, transaction: existing });
    }

    const transaction = await sequelize.transaction();
    try {
        const user = await User.findByPk(req.user.id, { transaction });
        const allowedUsers = [req.user.id];
        if (user?.partner_id) allowedUsers.push(user.partner_id);

        const categoryResult = category
            ? { category, confidence: 1 }
            : await categorizerService.categorizeAsync(title, null, req.user.id);
        const signedAmount = type === 'expense' ? -Math.abs(amount) : Math.abs(amount);

        if (sourceType === 'credit_card') {
            const card = await CreditCard.findOne({ where: { id: creditCardId, user_id: allowedUsers }, transaction });
            if (!card) {
                await transaction.rollback();
                return res.status(404).json({ error: 'Cartão de crédito não encontrado' });
            }
            const duplicatePurchase = await CreditCardPurchase.findOne({ where: { credit_card_id: card.id, description: title, purchase_date: date || new Date(), total_amount: Math.abs(amount) }, transaction });
            if (duplicatePurchase) {
                await transaction.rollback();
                return res.status(200).json({ created: false, duplicate: true, purchase: duplicatePurchase });
            }
            const purchase = await CreditCardPurchase.create({ description: title, category: categoryResult.category, total_amount: Math.abs(amount), installments: 1, installment_amount: Math.abs(amount), remaining_installments: 1, purchase_date: date || new Date(), credit_card_id: card.id, notes: 'Capturado da notificação do cartão' }, { transaction });
            await transaction.commit();
            return res.status(201).json({ created: true, duplicate: false, source_type: sourceType, purchase, category_confidence: categoryResult.confidence });
        }

        const wallet = await Wallet.findOne({ where: { id: walletId, user_id: req.user.id }, transaction, lock: transaction.LOCK.UPDATE });
        if (!wallet) {
            await transaction.rollback();
            return res.status(404).json({ error: 'Carteira não encontrada' });
        }
        const created = await Transaction.create({
            title,
            amount: signedAmount,
            category: categoryResult.category,
            date: date || new Date(),
            type,
            wallet_id: wallet.id,
            user_id: req.user.id,
            capture_source: 'android_notification',
            source_external_id: externalId,
            source_package: sourcePackage,
            capture_confidence: confidence
        }, { transaction });

        wallet.balance = parseFloat(wallet.balance || 0) + signedAmount;
        await wallet.save({ transaction });
        await transaction.commit();

        // Side effects happen after the financial write is committed.
        try {
            await budgetAlertService.checkAlerts(created);
            await achievementService.checkAndUnlockAchievements(req.user.id);
            const user = await User.findByPk(req.user.id);
            if (user?.partner_id) {
                await notificationService.notifyPartnerTransaction(user.partner_id, user.name, created);
                const config = await UserConfig.findOne({ where: { user_id: user.partner_id } });
                const limit = config ? parseFloat(config.large_transaction_limit) : 500;
                if (Math.abs(signedAmount) >= limit) {
                    await notificationService.notifyLargeExpense(user.partner_id, user.name, created);
                }
            }
        } catch (error) {
            console.error('Captured transaction side effects failed:', error);
        }

        return res.status(201).json({
            created: true,
            duplicate: false,
            transaction: created,
            category_confidence: categoryResult.confidence
        });
    } catch (error) {
        await transaction.rollback();
        if (error.name === 'SequelizeUniqueConstraintError') {
            const duplicate = await Transaction.findOne({
                where: { source_external_id: externalId },
                attributes: ['id', 'title', 'amount', 'date', 'type']
            });
            return res.status(200).json({ created: false, duplicate: true, transaction: duplicate });
        }
        console.error('Error creating captured transaction:', error);
        return res.status(500).json({ error: 'Erro ao registrar transação capturada' });
    }
};
