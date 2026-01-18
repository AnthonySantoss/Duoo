const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Achievement = sequelize.define('Achievement', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    code: {
        type: DataTypes.STRING(50),
        allowNull: false,
        unique: true,
        comment: 'Código único da conquista (ex: first_transaction)'
    },
    title: {
        type: DataTypes.STRING(100),
        allowNull: false,
        comment: 'Título da conquista'
    },
    description: {
        type: DataTypes.STRING(255),
        allowNull: false,
        comment: 'Descrição da conquista'
    },
    icon: {
        type: DataTypes.STRING(50),
        defaultValue: '🏆',
        comment: 'Emoji ou ícone da conquista'
    },
    category: {
        type: DataTypes.ENUM('financial', 'engagement', 'milestone', 'social'),
        defaultValue: 'milestone',
        comment: 'Categoria da conquista'
    },
    points: {
        type: DataTypes.INTEGER,
        defaultValue: 10,
        comment: 'Pontos ganhos ao desbloquear'
    },
    requirement_type: {
        type: DataTypes.ENUM('transaction_count', 'goal_count', 'savings_amount', 'days_streak', 'category_count', 'bank_connection', 'goal_completed'),
        allowNull: false,
        comment: 'Tipo de requisito para desbloquear'
    },
    requirement_value: {
        type: DataTypes.INTEGER,
        allowNull: false,
        comment: 'Valor necessário para desbloquear'
    },
    is_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        comment: 'Se a conquista está ativa'
    }
}, {
    tableName: 'achievements',
    timestamps: true
});

module.exports = Achievement;
