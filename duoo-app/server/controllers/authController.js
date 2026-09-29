const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { jwtSecret } = require('../config/env');
const { sendPasswordResetEmail } = require('../services/emailService');
const { setAuthCookie, clearAuthCookie } = require('../utils/authCookie');
const {
    sequelize, User, Wallet, Transaction, Goal, CreditCard,
    CreditCardPurchase, CreditCardInvoice, Simulation, Loan,
    TransactionCorrection, UserAchievement, BudgetAlert,
    AlertNotification, Notification, PasswordResetToken
} = require('../models');

const hashResetToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

exports.register = async (req, res) => {
    try {
        const { name, email, password } = req.body;

        // Validate password strength
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>]).{8,}$/;
        if (!passwordRegex.test(password)) {
            return res.status(400).json({
                error: 'A senha deve ter no mínimo 8 caracteres, incluindo maiúsculas, minúsculas, números e caracteres especiais'
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const user = await User.create({ name, email, password_hash: hashedPassword });

        const token = jwt.sign({ id: user.id }, jwtSecret, { expiresIn: '1d' });
        setAuthCookie(res, token);
        res.status(201).json({ user: { id: user.id, name: user.name, email: user.email } });
    } catch (error) {
        console.error('Error registering user:', error);
        if (error.name === 'SequelizeUniqueConstraintError') {
            return res.status(409).json({ error: 'Este email já está em uso' });
        }
        res.status(500).json({ error: 'Erro ao criar conta' });
    }
};

exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ where: { email } });
        if (!user) return res.status(401).json({ error: 'Credenciais inválidas' });

        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) return res.status(401).json({ error: 'Credenciais inválidas' });

        const token = jwt.sign({ id: user.id }, jwtSecret, { expiresIn: '1d' });
        setAuthCookie(res, token);
        res.json({ user: { id: user.id, name: user.name, email: user.email } });
    } catch (error) {
        console.error('Error logging in:', error);
        res.status(500).json({ error: 'Erro ao realizar login' });
    }
};

exports.logout = async (req, res) => {
    clearAuthCookie(res);
    res.status(204).send();
};

exports.forgotPassword = async (req, res) => {
    const genericResponse = { message: 'Se o e-mail estiver cadastrado, enviaremos um link para redefinir sua senha.' };
    try {
        const user = await User.findOne({ where: { email: req.body.email } });
        if (!user) return res.json(genericResponse);

        await PasswordResetToken.destroy({ where: { user_id: user.id, used_at: null } });
        const token = crypto.randomBytes(32).toString('hex');
        await PasswordResetToken.create({
            user_id: user.id,
            token_hash: hashResetToken(token),
            expires_at: new Date(Date.now() + 30 * 60 * 1000)
        });

        const delivery = await sendPasswordResetEmail({ to: user.email, name: user.name, token });
        if (delivery.resetUrl && process.env.NODE_ENV !== 'production') {
            return res.json({ ...genericResponse, developmentResetUrl: delivery.resetUrl });
        }
        return res.json(genericResponse);
    } catch (error) {
        console.error('Error requesting password reset:', error);
        return res.status(503).json({ error: 'Não foi possível enviar o e-mail agora. Tente novamente mais tarde.' });
    }
};

exports.resetPassword = async (req, res) => {
    try {
        const { token, password } = req.body;
        const resetToken = await PasswordResetToken.findOne({
            where: { token_hash: hashResetToken(token), used_at: null }
        });
        if (!resetToken || new Date(resetToken.expires_at) < new Date()) {
            return res.status(400).json({ error: 'Este link é inválido ou expirou. Solicite outro.' });
        }

        const user = await User.findByPk(resetToken.user_id);
        if (!user) return res.status(400).json({ error: 'Este link é inválido ou expirou. Solicite outro.' });

        await user.update({ password_hash: await bcrypt.hash(password, 10) });
        await resetToken.update({ used_at: new Date() });
        return res.json({ message: 'Senha redefinida com sucesso. Você já pode entrar no Duoo.' });
    } catch (error) {
        console.error('Error resetting password:', error);
        return res.status(500).json({ error: 'Não foi possível redefinir a senha.' });
    }
};

exports.getMe = async (req, res) => {
    try {
        const user = await User.findByPk(req.user.id, {
            attributes: ['id', 'name', 'email', 'partner_id']
        });

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        let partner = null;
        if (user.partner_id) {
            partner = await User.findByPk(user.partner_id, {
                attributes: ['id', 'name', 'email']
            });
        }

        res.json({
            user: {
                id: user.id,
                name: user.name,
                email: user.email
            },
            partner: partner ? {
                id: partner.id,
                name: partner.name,
                email: partner.email
            } : null,
            hasPartner: !!partner
        });
    } catch (error) {
        console.error('Error fetching current user:', error);
        res.status(500).json({ error: 'Erro ao carregar usuário' });
    }
};

exports.updateProfile = async (req, res) => {
    try {
        const { name, email } = req.body;
        const userId = req.user.id;

        if (!name || !email) {
            return res.status(400).json({ error: 'Nome e email são obrigatórios' });
        }

        // Verificar se email já está em uso por outro usuário
        const existingUser = await User.findOne({
            where: { email }
        });

        if (existingUser && existingUser.id !== userId) {
            return res.status(400).json({ error: 'Este email já está em uso' });
        }

        const user = await User.findByPk(userId);
        if (!user) {
            return res.status(404).json({ error: 'Usuário não encontrado' });
        }

        await user.update({ name, email });

        res.json({
            user: {
                id: user.id,
                name: user.name,
                email: user.email
            }
        });
    } catch (error) {
        console.error('Error updating profile:', error);
        res.status(500).json({ error: 'Erro ao atualizar perfil' });
    }
};

exports.changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const userId = req.user.id;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({ error: 'Senha atual e nova senha são obrigatórias' });
        }

        const user = await User.findByPk(userId);
        if (!user) {
            return res.status(404).json({ error: 'Usuário não encontrado' });
        }

        // Verificar senha atual
        const isMatch = await bcrypt.compare(currentPassword, user.password_hash);
        if (!isMatch) {
            return res.status(401).json({ error: 'Senha atual incorreta' });
        }

        // Atualizar senha
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await user.update({ password_hash: hashedPassword });

        res.json({ message: 'Senha alterada com sucesso' });
    } catch (error) {
        console.error('Error changing password:', error);
        res.status(500).json({ error: 'Erro ao alterar senha' });
    }
};

exports.deleteAccount = async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const userId = req.user.id;

        const user = await User.findByPk(userId, { transaction: t });
        if (!user) {
            await t.rollback();
            return res.status(404).json({ error: 'Usuário não encontrado' });
        }

        // 1. Delete direct associations (Notification, Alerts, Achievements, etc.)
        await Notification.destroy({ where: { user_id: userId }, transaction: t });
        await AlertNotification.destroy({ where: { user_id: userId }, transaction: t });
        await BudgetAlert.destroy({ where: { user_id: userId }, transaction: t });
        await UserAchievement.destroy({ where: { user_id: userId }, transaction: t });
        await TransactionCorrection.destroy({ where: { user_id: userId }, transaction: t });
        await Simulation.destroy({ where: { user_id: userId }, transaction: t });

        // 2. Delete Loans before Goals (Loan belongsTo Goal)
        await Loan.destroy({ where: { user_id: userId }, transaction: t });
        await Goal.destroy({ where: { user_id: userId }, transaction: t });

        // 3. Delete Credit Card related data
        const creditCards = await CreditCard.findAll({ where: { user_id: userId }, transaction: t });
        const creditCardIds = creditCards.map(cc => cc.id);

        if (creditCardIds.length > 0) {
            await CreditCardPurchase.destroy({ where: { credit_card_id: creditCardIds }, transaction: t });
            await CreditCardInvoice.destroy({ where: { credit_card_id: creditCardIds }, transaction: t });
            await CreditCard.destroy({ where: { user_id: userId }, transaction: t });
        }

        // 4. Delete Transactions and Wallets
        await Transaction.destroy({ where: { user_id: userId }, transaction: t });
        await Wallet.destroy({ where: { user_id: userId }, transaction: t });

        // 4.1 Unlink partner if exists (prevent self-reference or other user reference block)
        await User.update({ partner_id: null }, { where: { partner_id: userId }, transaction: t });

        // 5. Finally delete the User
        await user.destroy({ transaction: t });

        await t.commit();
        res.json({ message: 'Conta excluída com sucesso' });
    } catch (error) {
        await t.rollback();
        console.error('Error deleting account:', error);
        res.status(500).json({ error: 'Erro ao excluir conta' });
    }
};
