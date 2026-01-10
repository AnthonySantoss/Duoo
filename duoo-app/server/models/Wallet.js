const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const User = require('./User');

const Wallet = sequelize.define('Wallet', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    type: {
        type: DataTypes.ENUM('physical', 'digital'),
        defaultValue: 'digital'
    },
    provider: {
        type: DataTypes.STRING,
        allowNull: true
    },
    balance: {
        type: DataTypes.DECIMAL(10, 2),
        defaultValue: 0.00
    },
    user_id: {
        type: DataTypes.UUID,
        allowNull: true, // Nullable for joint wallets
        references: {
            model: User,
            key: 'id'
        }
    }
});

module.exports = Wallet;
