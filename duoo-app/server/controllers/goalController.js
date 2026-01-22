const { Goal, User, Transaction, Wallet } = require('../models');
const { Op } = require('sequelize');
const notificationService = require('../services/notificationService');

exports.getGoals = async (req, res) => {
    try {
        const { viewMode } = req.query;
        const userId = req.user.id;

        let whereClause = {};

        // Filter by viewMode
        if (viewMode === 'user1' || viewMode === 'user2') {
            whereClause.user_id = userId;
        } else if (viewMode === 'joint') {
            // Get user and partner goals
            const user = await User.findByPk(userId);
            const allowedUsers = [userId];
            if (user.partner_id) {
                allowedUsers.push(user.partner_id);
            }
            whereClause.user_id = { [Op.in]: allowedUsers };
        } else {
            // Default: show user's goals
            whereClause.user_id = userId;
        }

        const goals = await Goal.findAll({
            where: whereClause,
            include: [
                { model: User, attributes: ['id', 'name'] }
            ],
            order: [['createdAt', 'DESC']]
        });

        res.json(goals);
    } catch (error) {
        console.error('Error in getGoals:', error);
        res.status(500).json({ error: error.message });
    }
};

exports.createGoal = async (req, res) => {
    try {
        const { title, target_amount, current_amount, is_joint, is_yielding, cdi_percentage, bank_name } = req.body;
        const goal = await Goal.create({
            title,
            target_amount: parseFloat(target_amount),
            current_amount: parseFloat(current_amount) || 0,
            is_joint: is_joint || false,
            is_yielding: is_yielding || false,
            cdi_percentage: cdi_percentage ? parseFloat(cdi_percentage) : null,
            bank_name: bank_name || null,
            user_id: req.user.id
        });
        res.status(201).json(goal);
    } catch (error) {
        console.error('Error in createGoal:', error);
        res.status(500).json({ error: error.message });
    }
};

exports.updateGoal = async (req, res) => {
    try {
        const { id } = req.params;
        const { title, target_amount, current_amount, is_joint, is_yielding, cdi_percentage, bank_name } = req.body;

        const goal = await Goal.findByPk(id);
        if (!goal) {
            return res.status(404).json({ error: 'Meta não encontrada' });
        }

        // Check ownership (user or partner)
        const user = await User.findByPk(req.user.id);
        const allowedUsers = [req.user.id];
        if (user.partner_id) allowedUsers.push(user.partner_id);

        if (!allowedUsers.includes(goal.user_id)) {
            return res.status(403).json({ error: 'Você não tem permissão para editar esta meta' });
        }

        goal.title = title;
        goal.target_amount = parseFloat(target_amount);
        goal.current_amount = parseFloat(current_amount);
        if (is_joint !== undefined) {
            goal.is_joint = is_joint;
        }
        if (is_yielding !== undefined) goal.is_yielding = is_yielding;
        if (cdi_percentage !== undefined) goal.cdi_percentage = parseFloat(cdi_percentage);
        if (bank_name !== undefined) goal.bank_name = bank_name;
        await goal.save();

        res.json(goal);
    } catch (error) {
        console.error('Error in updateGoal:', error);
        res.status(500).json({ error: error.message });
    }
};

exports.deleteGoal = async (req, res) => {
    try {
        const { id } = req.params;

        const goal = await Goal.findByPk(id);
        if (!goal) {
            return res.status(404).json({ error: 'Meta não encontrada' });
        }

        // Check ownership (user or partner)
        const user = await User.findByPk(req.user.id);
        const allowedUsers = [req.user.id];
        if (user.partner_id) allowedUsers.push(user.partner_id);

        if (!allowedUsers.includes(goal.user_id)) {
            return res.status(403).json({ error: 'Você não tem permissão para excluir esta meta' });
        }

        await goal.destroy();

        res.json({ message: 'Meta excluída com sucesso' });
    } catch (error) {
        console.error('Error in deleteGoal:', error);
        res.status(500).json({ error: error.message });
    }
};

exports.addProgress = async (req, res) => {
    const t = await Transaction.sequelize.transaction();
    try {
        const { id } = req.params;
        const { amount, wallet_id } = req.body;

        const goal = await Goal.findByPk(id, { transaction: t });
        if (!goal) {
            await t.rollback();
            return res.status(404).json({ error: 'Meta não encontrada' });
        }

        // Check ownership (user or partner)
        const user = await User.findByPk(req.user.id);
        const allowedUsers = [req.user.id];
        if (user.partner_id) allowedUsers.push(user.partner_id);

        if (!allowedUsers.includes(goal.user_id)) {
            await t.rollback();
            return res.status(403).json({ error: 'Você não tem permissão para atualizar esta meta' });
        }

        // If wallet_id is provided, create a transaction to deduct the amount
        // If wallet_id is provided, create a transaction to deduct the amount
        if (wallet_id) {
            const wallet = await Wallet.findByPk(wallet_id, { transaction: t });
            if (!wallet) {
                await t.rollback();
                return res.status(404).json({ error: 'Carteira não encontrada' });
            }

            const deductionAmount = -Math.abs(parseFloat(amount));

            // Deduct from wallet (Create Expense Transaction)
            await Transaction.create({
                title: `Destinado para meta: ${goal.title}`,
                amount: deductionAmount, // Ensure negative
                type: 'expense',
                category: 'Investimento',
                wallet_id: wallet.id,
                user_id: req.user.id,
                date: new Date()
            }, { transaction: t });

            // Update wallet balance
            wallet.balance = parseFloat(wallet.balance) + deductionAmount;
            await wallet.save({ transaction: t });
        }

        const previousAmount = parseFloat(goal.current_amount) - parseFloat(amount);
        const previousPercentage = (previousAmount / goal.target_amount) * 100;
        goal.current_amount = parseFloat(goal.current_amount) + parseFloat(amount);
        const newPercentage = (goal.current_amount / goal.target_amount) * 100;

        await goal.save({ transaction: t });

        await t.commit();

        // Check for milestone notifications (after commit to ensure data is saved)
        const milestones = [50, 75, 90, 100];
        for (const milestone of milestones) {
            if (previousPercentage < milestone && newPercentage >= milestone) {
                if (milestone === 100) {
                    // Goal completed!
                    await notificationService.notifyGoalReached(goal.user_id, goal);

                    // Also notify partner if exists
                    if (user.partner_id && goal.is_joint) {
                        await notificationService.notifyGoalReached(user.partner_id, goal);
                    }
                } else {
                    await notificationService.notifyGoalProgress(goal.user_id, goal, milestone);
                }
                break; // Only notify the highest milestone reached in this update
            }
        }

        res.json(goal);
    } catch (error) {
        await t.rollback();
        console.error('Error in addProgress:', error);
        res.status(500).json({ error: error.message });
    }
};
