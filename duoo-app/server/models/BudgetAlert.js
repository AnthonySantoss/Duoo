const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const BudgetAlert = sequelize.define('BudgetAlert', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    user_id: {
        type: DataTypes.UUID,
        allowNull: false,
        comment: 'ID do usuário'
    },
    alert_type: {
        type: DataTypes.ENUM(
            'monthly_budget',      // Orçamento mensal total
            'category_budget',     // Orçamento por categoria
            'low_balance',         // Saldo baixo em carteira
            'goal_progress',       // Progresso de meta
            'unusual_spending'     // Gasto incomum
        ),
        allowNull: false,
        comment: 'Tipo de alerta'
    },
    category: {
        type: DataTypes.STRING(50),
        allowNull: true,
        comment: 'Categoria específica (para category_budget)'
    },
    threshold_amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        comment: 'Valor limite para disparar alerta'
    },
    threshold_percentage: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: 'Porcentagem limite (ex: 80% do orçamento)'
    },
    is_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        comment: 'Se o alerta está ativo'
    },
    notification_method: {
        type: DataTypes.ENUM('in_app', 'email', 'both'),
        defaultValue: 'in_app',
        comment: 'Método de notificação'
    },
    last_triggered_at: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'Última vez que o alerta foi disparado'
    }
}, {
    tableName: 'budget_alerts',
    timestamps: true
});

module.exports = BudgetAlert;
