const { Notification, User, Goal, CreditCardInvoice, CreditCard, Transaction, PushSubscription } = require('../models');
const { Op } = require('sequelize');
const webpush = require('web-push');
const path = require('path');

// Configurar WebPush
if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
    webpush.setVapidDetails(
        process.env.VAPID_SUBJECT || 'mailto:anthonysantossag@gmail.com',
        process.env.VAPID_PUBLIC_KEY,
        process.env.VAPID_PRIVATE_KEY
    );
    console.log('✅ WebPush VAPID keys configured');
}

class NotificationService {
    /**
     * Cria uma notificação para um usuário
     */
    async createNotification(userId, title, message, type = 'info', link = null) {
        try {
            const notification = await Notification.create({
                user_id: userId,
                title,
                message,
                type,
                link,
                read: false
            });
            console.log(`📧 Notification created for user ${userId}: ${title}`);

            // Tentar enviar via Push
            this.sendPushToUser(userId, {
                title,
                body: message,
                link: link || '/dashboard',
                type: type,
                id: notification.id
            }).catch(err => console.error('Push notification error:', err));

            return notification;
        } catch (error) {
            console.error('Error creating notification:', error);
            return null;
        }
    }

    /**
     * Notifica sobre conquista desbloqueada
     */
    async notifyAchievementUnlocked(userId, achievement) {
        const title = `🏆 Nova Conquista: ${achievement.title}`;
        const message = `Parabéns! Você desbloqueou a conquista "${achievement.title}". ${achievement.description}`;
        return this.createNotification(userId, title, message, 'achievement', '/dashboard/achievements');
    }

    /**
     * Notifica sobre meta atingida
     */
    async notifyGoalReached(userId, goal) {
        const title = `🎯 Meta Atingida: ${goal.title}`;
        const message = `Parabéns! Você alcançou sua meta "${goal.title}" de R$ ${parseFloat(goal.target_amount).toFixed(2)}!`;
        return this.createNotification(userId, title, message, 'goal_progress', '/dashboard/goals');
    }

    /**
     * Notifica sobre progresso em meta (50%, 75%, 90%)
     */
    async notifyGoalProgress(userId, goal, percentage) {
        const title = `📈 Progresso: ${goal.title}`;
        const message = `Você atingiu ${percentage}% da sua meta "${goal.title}". Faltam R$ ${(goal.target_amount - goal.current_amount).toFixed(2)}!`;
        return this.createNotification(userId, title, message, 'goal_progress', '/dashboard/goals');
    }

    /**
     * Notifica sobre fatura próxima do vencimento
     */
    async notifyInvoiceNearDue(userId, invoice, card, daysUntilDue) {
        const dueDate = new Date(invoice.due_date).toLocaleDateString('pt-BR');
        const title = `💳 Fatura ${card.name} vence em ${daysUntilDue} dia${daysUntilDue > 1 ? 's' : ''}`;
        const message = `A fatura do cartão ${card.name} vence em ${dueDate}. Valor: R$ ${parseFloat(invoice.total_amount || 0).toFixed(2)}`;
        return this.createNotification(userId, title, message, 'invoice', '/dashboard/investments');
    }

    /**
     * Notifica sobre fatura vencida
     */
    async notifyInvoiceOverdue(userId, invoice, card) {
        const dueDate = new Date(invoice.due_date).toLocaleDateString('pt-BR');
        const title = `⚠️ Fatura ${card.name} VENCIDA`;
        const message = `A fatura do cartão ${card.name} venceu em ${dueDate}. Valor: R$ ${parseFloat(invoice.total_amount || 0).toFixed(2)}. Regularize para evitar juros!`;
        return this.createNotification(userId, title, message, 'invoice', '/dashboard/investments');
    }

    /**
     * Notifica sobre transação do parceiro
     */
    async notifyPartnerTransaction(userId, partnerName, transaction) {
        const isExpense = parseFloat(transaction.amount) < 0;
        const emoji = isExpense ? '💸' : '💰';
        const tipo = isExpense ? 'gastou' : 'recebeu';
        const title = `${emoji} ${partnerName} ${tipo} R$ ${Math.abs(parseFloat(transaction.amount)).toFixed(2)}`;
        let message = `${partnerName} registrou "${transaction.title}" em ${transaction.category}.`;

        if (transaction.notes) {
            message += ` Nota: "${transaction.notes}"`;
        }

        return this.createNotification(userId, title, message, 'transaction', '/dashboard/transactions');
    }

    /**
     * Notifica sobre sincronização bancária concluída
     */
    async notifyBankSyncComplete(userId, bankName, transactionCount) {
        const title = `🏦 Sincronização ${bankName} concluída`;
        const message = `${transactionCount} transações foram importadas do ${bankName}.`;
        return this.createNotification(userId, title, message, 'transaction', '/dashboard/bank');
    }

    /**
     * Notifica sobre erro na sincronização bancária
     */
    async notifyBankSyncError(userId, bankName, errorMessage = null) {
        const title = `⚠️ Erro na sincronização ${bankName}`;
        const message = errorMessage || `Não foi possível sincronizar com ${bankName}. Por favor, reconecte sua conta.`;
        return this.createNotification(userId, title, message, 'info', '/dashboard/bank');
    }

    /**
     * Notifica sobre alerta de orçamento (integra com budgetAlertService)
     */
    async notifyBudgetAlert(userId, alertType, category, percentage, limit, spent) {
        let title, message;

        if (alertType === 'category_budget') {
            if (percentage >= 100) {
                title = `🚨 Orçamento ${category} Excedido!`;
                message = `Você ultrapassou o limite de R$ ${limit.toFixed(2)} para ${category}. Gasto atual: R$ ${spent.toFixed(2)}.`;
            } else {
                title = `⚠️ Alerta: ${percentage.toFixed(0)}% do Orçamento ${category}`;
                message = `Você já usou ${percentage.toFixed(0)}% do seu orçamento para ${category}. Restam R$ ${(limit - spent).toFixed(2)}.`;
            }
        } else if (alertType === 'monthly_budget') {
            if (percentage >= 100) {
                title = `🚨 Orçamento Mensal Excedido!`;
                message = `Você ultrapassou seu orçamento mensal de R$ ${limit.toFixed(2)}. Gasto atual: R$ ${spent.toFixed(2)}.`;
            } else {
                title = `⚠️ ${percentage.toFixed(0)}% do Orçamento Mensal`;
                message = `Você atingiu ${percentage.toFixed(0)}% do seu orçamento mensal. Gasto atual: R$ ${spent.toFixed(2)}.`;
            }
        } else if (alertType === 'unusual_spending') {
            title = `💸 Gasto Alto Detectado`;
            message = `Uma transação de R$ ${spent.toFixed(2)} foi registrada em ${category}.`;
        }

        return this.createNotification(userId, title, message, 'budget_alert', '/dashboard/transactions');
    }

    /**
     * Verifica faturas próximas do vencimento para todos os usuários
     * Deve ser chamado diariamente (cron job)
     */
    async checkUpcomingInvoices() {
        try {
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const threeDaysFromNow = new Date(today);
            threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

            const sevenDaysFromNow = new Date(today);
            sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

            // Buscar faturas que vencem nos próximos 7 dias e não estão pagas
            const invoices = await CreditCardInvoice.findAll({
                where: {
                    due_date: {
                        [Op.between]: [today, sevenDaysFromNow]
                    },
                    paid: false
                },
                include: [{
                    model: CreditCard
                }]
            });

            for (const invoice of invoices) {
                const card = invoice.CreditCard;
                if (!card) continue; // Skip if no card associated

                const dueDate = new Date(invoice.due_date);
                const diffTime = dueDate - today;
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                // Verificar se já notificou hoje para evitar spam
                const existingNotification = await Notification.findOne({
                    where: {
                        user_id: card.user_id,
                        type: 'invoice',
                        created_at: {
                            [Op.gte]: today
                        },
                        message: {
                            [Op.like]: `%${card.name}%`
                        }
                    }
                });

                if (!existingNotification) {
                    if (diffDays <= 0) {
                        await this.notifyInvoiceOverdue(card.user_id, invoice, card);
                    } else if (diffDays <= 3) {
                        await this.notifyInvoiceNearDue(card.user_id, invoice, card, diffDays);
                    } else if (diffDays === 7) {
                        await this.notifyInvoiceNearDue(card.user_id, invoice, card, diffDays);
                    }
                }
            }

            console.log(`✅ Checked ${invoices.length} upcoming invoices for notifications`);
        } catch (error) {
            console.error('Error checking upcoming invoices:', error);
        }
    }

    /**
     * Verifica progresso de metas para todos os usuários
     * Deve ser chamado periodicamente
     */
    async checkGoalProgress() {
        try {
            // Buscar metas que ainda não foram completadas (current < target)
            const goals = await Goal.findAll({
                where: {
                    current_amount: {
                        [Op.lt]: Goal.sequelize.col('target_amount')
                    }
                }
            });

            for (const goal of goals) {
                const percentage = (goal.current_amount / goal.target_amount) * 100;
                const milestones = [50, 75, 90, 100];

                for (const milestone of milestones) {
                    if (percentage >= milestone) {
                        // Verificar se já notificou esse milestone
                        const notificationKey = `goal_${goal.id}_${milestone}`;
                        const existingNotification = await Notification.findOne({
                            where: {
                                user_id: goal.user_id,
                                type: 'goal_progress',
                                message: {
                                    [Op.like]: `%${milestone}%${goal.title}%`
                                }
                            }
                        });

                        if (!existingNotification) {
                            if (milestone === 100) {
                                await this.notifyGoalReached(goal.user_id, goal);
                            } else {
                                await this.notifyGoalProgress(goal.user_id, goal, milestone);
                            }
                            break; // Notificar apenas o marco mais alto não notificado
                        }
                    }
                }
            }

            console.log(`✅ Checked ${goals.length} goals for progress notifications`);
        } catch (error) {
            console.error('Error checking goal progress:', error);
        }
    }

    /**
     * Envia notificação push para todas as inscrições de um usuário
     */
    async sendPushToUser(userId, data) {
        try {
            const subscriptions = await PushSubscription.findAll({
                where: { user_id: userId }
            });

            if (!subscriptions || subscriptions.length === 0) {
                return;
            }

            const payload = JSON.stringify({
                title: data.title,
                body: data.body,
                icon: '/icon-192.png',
                badge: '/icon-192.png',
                data: {
                    link: data.link || '/',
                    id: data.id
                }
            });

            const sendPromises = subscriptions.map(async (sub) => {
                try {
                    const pushSub = JSON.parse(sub.subscription_data);
                    await webpush.sendNotification(pushSub, payload);
                } catch (error) {
                    if (error.statusCode === 410 || error.statusCode === 404) {
                        // Inscrição expirada ou inválida - remover do banco
                        await sub.destroy();
                        console.log(`🗑️ Removed expired push subscription for user ${userId}`);
                    } else {
                        console.error('Error sending push notification to sub:', error);
                    }
                }
            });

            await Promise.all(sendPromises);
        } catch (error) {
            console.error('Error in sendPushToUser:', error);
        }
    }
}

module.exports = new NotificationService();
