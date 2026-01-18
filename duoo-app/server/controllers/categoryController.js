const { Transaction, TransactionCorrection } = require('../models');
const categorizerService = require('../services/transactionCategorizer');

/**
 * Corrige a categoria de uma transação
 */
const correctCategory = async (req, res) => {
    try {
        const { id } = req.params;
        const { category } = req.body;
        const userId = req.user.id;

        if (!category) {
            return res.status(400).json({ error: 'Category is required' });
        }

        // Buscar transação
        const transaction = await Transaction.findOne({
            where: { id, user_id: userId }
        });

        if (!transaction) {
            return res.status(404).json({ error: 'Transaction not found' });
        }

        const originalCategory = transaction.category;
        const description = transaction.title;

        // Salvar correção
        const categorizer = categorizerService.getInstance();
        await categorizer.saveUserCorrection(userId, description, originalCategory, category);

        // Atualizar transação
        await transaction.update({ category });

        console.log(`[Category Correction] User ${userId} corrected "${description}" from "${originalCategory}" to "${category}"`);

        res.json({
            success: true,
            message: 'Category corrected successfully',
            transaction: {
                id: transaction.id,
                title: transaction.title,
                category: transaction.category,
                original_category: originalCategory
            }
        });
    } catch (error) {
        console.error('Failed to correct category:', error);
        res.status(500).json({ error: 'Failed to correct category' });
    }
};

/**
 * Obtém todas as correções do usuário
 */
const getUserCorrections = async (req, res) => {
    try {
        const userId = req.user.id;

        const corrections = await TransactionCorrection.findAll({
            where: { user_id: userId },
            order: [['times_used', 'DESC'], ['confidence', 'DESC']],
            limit: 100
        });

        res.json(corrections);
    } catch (error) {
        console.error('Failed to get user corrections:', error);
        res.status(500).json({ error: 'Failed to get user corrections' });
    }
};

/**
 * Remove uma correção
 */
const deleteCorrection = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        const correction = await TransactionCorrection.findOne({
            where: { id, user_id: userId }
        });

        if (!correction) {
            return res.status(404).json({ error: 'Correction not found' });
        }

        await correction.destroy();

        res.json({ success: true, message: 'Correction deleted successfully' });
    } catch (error) {
        console.error('Failed to delete correction:', error);
        res.status(500).json({ error: 'Failed to delete correction' });
    }
};

/**
 * Obtém estatísticas de categorização
 */
const getCategoryStats = async (req, res) => {
    try {
        const userId = req.user.id;

        const corrections = await TransactionCorrection.findAll({
            where: { user_id: userId }
        });

        const stats = {
            total_corrections: corrections.length,
            total_uses: corrections.reduce((sum, c) => sum + c.times_used, 0),
            by_category: {},
            most_corrected: []
        };

        // Agrupar por categoria
        corrections.forEach(c => {
            if (!stats.by_category[c.corrected_category]) {
                stats.by_category[c.corrected_category] = 0;
            }
            stats.by_category[c.corrected_category]++;
        });

        // Top 10 mais corrigidas
        stats.most_corrected = corrections
            .sort((a, b) => b.times_used - a.times_used)
            .slice(0, 10)
            .map(c => ({
                description: c.description,
                category: c.corrected_category,
                times_used: c.times_used,
                confidence: c.confidence
            }));

        res.json(stats);
    } catch (error) {
        console.error('Failed to get category stats:', error);
        res.status(500).json({ error: 'Failed to get category stats' });
    }
};

module.exports = {
    correctCategory,
    getUserCorrections,
    deleteCorrection,
    getCategoryStats
};
