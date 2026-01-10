const { Wallet, User, Transaction } = require('../models');
const { Op } = require('sequelize');

exports.getWallets = async (req, res) => {
    try {
        const user = await User.findByPk(req.user.id);
        const allowedUsers = [req.user.id];
        if (user.partner_id) {
            allowedUsers.push(user.partner_id);
        }

        const wallets = await Wallet.findAll({
            where: {
                user_id: { [Op.in]: allowedUsers }
            },
            include: [
                { model: User, attributes: ['id', 'name'] }
            ],
            order: [['name', 'ASC']]
        });

        res.json(wallets);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.createWallet = async (req, res) => {
    try {
        const { name, type, provider, balance } = req.body;
        const wallet = await Wallet.create({
            name,
            type,
            provider: type === 'digital' ? provider : null,
            balance: parseFloat(balance) || 0,
            user_id: req.user.id
        });
        res.status(201).json(wallet);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.updateWallet = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, type, provider, balance } = req.body;

        const wallet = await Wallet.findByPk(id);
        if (!wallet) {
            return res.status(404).json({ error: 'Carteira não encontrada' });
        }

        // Check ownership (user or partner)
        const user = await User.findByPk(req.user.id);
        const allowedUsers = [req.user.id];
        if (user.partner_id) allowedUsers.push(user.partner_id);

        if (!allowedUsers.includes(wallet.user_id)) {
            return res.status(403).json({ error: 'Você não tem permissão para editar esta carteira' });
        }

        wallet.name = name;
        wallet.type = type;
        wallet.provider = type === 'digital' ? provider : null;
        if (balance !== undefined) {
            wallet.balance = parseFloat(balance);
        }
        await wallet.save();

        res.json(wallet);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.deleteWallet = async (req, res) => {
    try {
        const { id } = req.params;

        const wallet = await Wallet.findByPk(id);
        if (!wallet) {
            return res.status(404).json({ error: 'Carteira não encontrada' });
        }

        // Check ownership (user or partner)
        const user = await User.findByPk(req.user.id);
        const allowedUsers = [req.user.id];
        if (user.partner_id) allowedUsers.push(user.partner_id);

        if (!allowedUsers.includes(wallet.user_id)) {
            return res.status(403).json({ error: 'Você não tem permissão para excluir esta carteira' });
        }

        // Check if wallet has transactions
        const transactionCount = await Transaction.count({ where: { wallet_id: id } });
        if (transactionCount > 0) {
            return res.status(400).json({
                error: 'Não é possível excluir uma carteira com transações. Exclua as transações primeiro.'
            });
        }

        await wallet.destroy();

        res.json({ message: 'Carteira excluída com sucesso' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
