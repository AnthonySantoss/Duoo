const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User } = require('../models');

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

        const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET || 'secret_key', { expiresIn: '1d' });
        res.status(201).json({ token, user: { id: user.id, name: user.name, email: user.email } });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ where: { email } });
        if (!user) return res.status(404).json({ error: 'User not found' });

        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) return res.status(401).json({ error: 'Invalid credentials' });

        const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET || 'secret_key', { expiresIn: '1d' });
        res.json({ token, user: { id: user.id, name: user.name, email: user.email } });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.getMe = async (req, res) => {
    try {
        const user = await User.findByPk(req.user.id, {
            attributes: ['id', 'name', 'email', 'partner_id']
        });

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
        res.status(500).json({ error: error.message });
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

        if (newPassword.length < 6) {
            return res.status(400).json({ error: 'A nova senha deve ter no mínimo 6 caracteres' });
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
    try {
        const userId = req.user.id;

        const user = await User.findByPk(userId);
        if (!user) {
            return res.status(404).json({ error: 'Usuário não encontrado' });
        }

        // Deletar usuário (cascade vai deletar dados relacionados)
        await user.destroy();

        res.json({ message: 'Conta excluída com sucesso' });
    } catch (error) {
        console.error('Error deleting account:', error);
        res.status(500).json({ error: 'Erro ao excluir conta' });
    }
};
