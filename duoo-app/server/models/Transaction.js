const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const Wallet = require('./Wallet');
const User = require('./User');

const Transaction = sequelize.define('Transaction', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    title: {
        type: DataTypes.STRING,
        allowNull: false
    },
    amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
    },
    category: {
        type: DataTypes.STRING,
        defaultValue: 'Outros'
    },
    date: {
        type: DataTypes.DATEONLY,
        defaultValue: DataTypes.NOW
    },
    type: {
        type: DataTypes.ENUM('income', 'expense'),
        allowNull: false
    },
    wallet_id: {
        type: DataTypes.INTEGER,
        references: {
            model: Wallet,
            key: 'id'
        }
    },
    user_id: {
        type: DataTypes.UUID,
        references: {
            model: User,
            key: 'id'
        }
    },
    pluggy_transaction_id: {
        type: DataTypes.STRING,
        allowNull: true,
        unique: true
    },
    pluggy_account_id: {
        type: DataTypes.STRING,
        allowNull: true
    },
    capture_source: {
        type: DataTypes.STRING(32),
        allowNull: true
    },
    source_external_id: {
        type: DataTypes.STRING(128),
        allowNull: true
    },
    source_package: {
        type: DataTypes.STRING(160),
        allowNull: true
    },
    capture_confidence: {
        type: DataTypes.DECIMAL(5, 4),
        allowNull: true
    },
    split_with_partner: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    split_amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true
    },
    notes: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    goal_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'Goals',
            key: 'id'
        }
    }
}, {
    indexes: [
        { name: 'idx_transactions_user_date', fields: ['user_id', 'date'] },
        { name: 'idx_transactions_wallet_date', fields: ['wallet_id', 'date'] },
        { name: 'idx_transactions_wallet_ext_id', fields: ['wallet_id', 'source_external_id'] },
        { name: 'idx_transactions_user_source_external_unique', unique: true, fields: ['user_id', 'source_external_id'] },
        { name: 'idx_transactions_user_type_date', fields: ['user_id', 'type', 'date'] },
        { name: 'idx_transactions_user_category_date', fields: ['user_id', 'category', 'date'] }
    ]
});

module.exports = Transaction;
