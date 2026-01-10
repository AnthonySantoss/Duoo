const { User } = require('../models');
const crypto = require('crypto');

// Generate a unique 6-character code
function generateLinkCode() {
    return crypto.randomBytes(3).toString('hex').toUpperCase();
}

exports.getMyLinkCode = async (req, res) => {
    try {
        const user = await User.findByPk(req.user.id);

        // Generate code if user doesn't have one
        if (!user.link_code) {
            user.link_code = generateLinkCode();
            await user.save();
        }

        res.json({ code: user.link_code });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.linkPartner = async (req, res) => {
    try {
        const { partnerCode } = req.body;
        const currentUser = await User.findByPk(req.user.id);

        // Find partner by code
        const partner = await User.findOne({ where: { link_code: partnerCode } });

        if (!partner) {
            return res.status(404).json({ error: 'Código inválido. Verifique e tente novamente.' });
        }

        if (partner.id === currentUser.id) {
            return res.status(400).json({ error: 'Você não pode vincular sua própria conta.' });
        }

        if (currentUser.partner_id) {
            return res.status(400).json({ error: 'Você já está vinculado a outro usuário.' });
        }

        if (partner.partner_id) {
            return res.status(400).json({ error: 'Este usuário já está vinculado a outra pessoa.' });
        }

        // Link both users
        currentUser.partner_id = partner.id;
        partner.partner_id = currentUser.id;

        await currentUser.save();
        await partner.save();

        res.json({
            message: 'Contas vinculadas com sucesso!',
            partner: {
                id: partner.id,
                name: partner.name,
                email: partner.email
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.unlinkPartner = async (req, res) => {
    try {
        const currentUser = await User.findByPk(req.user.id);

        if (!currentUser.partner_id) {
            return res.status(400).json({ error: 'Você não está vinculado a nenhum usuário.' });
        }

        const partner = await User.findByPk(currentUser.partner_id);

        // Unlink both users
        currentUser.partner_id = null;
        if (partner) {
            partner.partner_id = null;
            await partner.save();
        }

        await currentUser.save();

        res.json({ message: 'Contas desvinculadas com sucesso!' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
