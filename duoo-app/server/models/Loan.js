const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Loan = sequelize.define('Loan', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    user_id: {
        type: DataTypes.UUID,
        allowNull: false
    },
    goal_id: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    original_amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
    },
    total_amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
    },
    remaining_amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
    },
    installments_total: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    installments_paid: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    },
    installment_value: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
    },
    interest_rate: {
        type: DataTypes.DECIMAL(5, 2),
        defaultValue: 0.00
    },
    status: {
        type: DataTypes.ENUM('active', 'paid'),
        defaultValue: 'active'
    },
    date: {
        type: DataTypes.DATEONLY,
        defaultValue: DataTypes.NOW
    },
    linked_transaction_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: 'ID da transação bancária vinculada (saque/transferência de origem)'
    }
});

module.exports = Loan;
