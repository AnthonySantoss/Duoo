const { BudgetAlert, AlertNotification, Transaction, Op } = require('../models');
const { sequelize } = require('../models');

class BudgetAlertService {
    /**
     * Verifica alertas para uma nova transação
     * Deve ser chamado após criar uma transação de despesa
     */
    async checkAlerts(transaction) {
        if (!transaction || transaction.type !== 'expense') return;

        try {
            const userId = transaction.user_id;

            // Buscar alertas ativos do usuário
            const alerts = await BudgetAlert.findAll({
                where: {
                    user_id: userId,
                    is_active: true
                }
            });

            if (alerts.length === 0) return;

            const currentDate = new Date();
            const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
            const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

            for (const alert of alerts) {
                if (alert.alert_type === 'category_budget' && alert.category === transaction.category) {
                    await this.checkCategoryBudget(alert, userId, startOfMonth, endOfMonth, transaction);
                } else if (alert.alert_type === 'monthly_budget') {
                    await this.checkMonthlyBudget(alert, userId, startOfMonth, endOfMonth, transaction);
                } else if (alert.alert_type === 'unusual_spending') {
                    await this.checkUnusualSpending(alert, transaction);
                }
            }
        } catch (error) {
            console.error('Error checking budget alerts:', error);
        }
    }

    /**
     * Verifica orçamento por categoria
     */
    async checkCategoryBudget(alert, userId, startOfMonth, endOfMonth, newTransaction) {
        // Calcular total gasto na categoria no mês atual
        const totalSpent = await Transaction.sum('amount', {
            where: {
                user_id: userId,
                category: alert.category,
                type: 'expense',
                date: {
                    [Op.between]: [startOfMonth, endOfMonth]
                }
            }
        }) || 0;

        // Adicionar o valor da transação atual se ainda não estiver no banco (assumindo hook afterCreate)
        // Se chamado após commit, totalSpent já inclui. Vamos assumir que inclui.

        const limit = parseFloat(alert.threshold_amount);
        const percentage = (totalSpent / limit) * 100;
        const thresholdPercent = alert.threshold_percentage || 100;

        // Se passou do limite ou atingiu a porcentagem de alerta
        if (percentage >= thresholdPercent) {
            // Verificar se já alertou recentemente para não spammar (ex: 1 vez por dia)
            const shouldNotify = await this.shouldNotify(alert); // TODO

            if (shouldNotify) {
                let message = '';
                if (percentage >= 100) {
                    message = `Você atingiu 100% do seu orçamento de R$ ${limit} para ${alert.category}. Total gasto: R$ ${totalSpent.toFixed(2)}.`;
                } else {
                    message = `Você já usou ${percentage.toFixed(0)}% do seu orçamento para ${alert.category}. Restam R$ ${(limit - totalSpent).toFixed(2)}.`;
                }

                await this.createNotification(userId, alert.id, 'Alerta de Orçamento', message, percentage >= 100 ? 'warning' : 'info');
                await this.updateLastTriggered(alert);
            }
        }
    }

    /**
     * Verifica orçamento mensal total
     */
    async checkMonthlyBudget(alert, userId, startOfMonth, endOfMonth, newTransaction) {
        const totalSpent = await Transaction.sum('amount', {
            where: {
                user_id: userId,
                type: 'expense',
                date: {
                    [Op.between]: [startOfMonth, endOfMonth]
                }
            }
        }) || 0;

        const limit = parseFloat(alert.threshold_amount);
        const percentage = (totalSpent / limit) * 100;
        const thresholdPercent = alert.threshold_percentage || 90;

        if (percentage >= thresholdPercent) {
            const shouldNotify = await this.shouldNotify(alert);

            if (shouldNotify) {
                let message = '';
                if (percentage >= 100) {
                    message = `Atenção! Você excedeu seu orçamento mensal total de R$ ${limit}. Gasto atual: R$ ${totalSpent.toFixed(2)}.`;
                } else {
                    message = `Você atingiu ${percentage.toFixed(0)}% do seu orçamento mensal total. Gasto atual: R$ ${totalSpent.toFixed(2)}.`;
                }

                await this.createNotification(userId, alert.id, 'Orçamento Mensal', message, percentage >= 100 ? 'critical' : 'warning');
                await this.updateLastTriggered(alert);
            }
        }
    }

    /**
     * Verifica gastos incomuns (valor muito alto)
     */
    async checkUnusualSpending(alert, transaction) {
        const threshold = parseFloat(alert.threshold_amount);
        if (parseFloat(transaction.amount) >= threshold) {
            const message = `Uma transação de valor alto foi detectada: R$ ${transaction.amount} em ${transaction.category}.`;
            await this.createNotification(transaction.user_id, alert.id, 'Gasto Alto Detectado', message, 'info');
        }
    }

    async shouldNotify(alert) {
        if (!alert.last_triggered_at) return true;

        const lastTriggered = new Date(alert.last_triggered_at);
        const now = new Date();

        // Evitar alertas repetidos no mesmo dia para budgets
        // Diferença em horas
        const diffHours = (now - lastTriggered) / (1000 * 60 * 60);

        return diffHours >= 24;
    }

    async createNotification(userId, alertId, title, message, severity) {
        await AlertNotification.create({
            user_id: userId,
            alert_id: alertId,
            title,
            message,
            severity
        });
    }

    async updateLastTriggered(alert) {
        alert.last_triggered_at = new Date();
        await alert.save();
    }
}

module.exports = new BudgetAlertService();
