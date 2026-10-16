const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const User = require('./User');

const CapturedTransaction = sequelize.define('CapturedTransaction', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    user_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: User,
            key: 'id'
        }
    },
    status: {
        type: DataTypes.STRING(32),
        defaultValue: 'pending'
    },
    captured_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    },
    notification_hash: {
        type: DataTypes.STRING(64),
        allowNull: true
    },
    title: {
        type: DataTypes.STRING,
        allowNull: true
    },
    amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true
    }
}, {
    tableName: 'captured_transactions',
    timestamps: true,
    indexes: [
        { name: 'idx_captured_tx_user_status_date', fields: ['user_id', 'status', 'captured_at'] },
        { name: 'idx_captured_tx_user_hash', fields: ['user_id', 'notification_hash'] }
    ]
});

module.exports = CapturedTransaction;
