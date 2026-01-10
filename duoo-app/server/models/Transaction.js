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
    }
});

module.exports = Transaction;
