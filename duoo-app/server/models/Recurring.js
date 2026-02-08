const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const User = require('./User');

const Recurring = sequelize.define('Recurring', {
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
    type: {
        type: DataTypes.ENUM('income', 'expense'),
        allowNull: false
    },
    date: {
        type: DataTypes.DATEONLY,
        allowNull: false
    },
    status: {
        type: DataTypes.ENUM('pending', 'received', 'paid'),
        defaultValue: 'pending'
    },
    user_id: {
        type: DataTypes.UUID,
        references: {
            model: User,
            key: 'id'
        }
    },
    transaction_id: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    wallet_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'Wallets', // Use string name or require it, standard is string to avoid circular deps
            key: 'id'
        }
    }
});

module.exports = Recurring;
