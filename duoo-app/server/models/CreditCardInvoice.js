const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const CreditCardInvoice = sequelize.define('CreditCardInvoice', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    credit_card_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'CreditCards',
            key: 'id'
        }
    },
    month: {
        type: DataTypes.INTEGER, // 1-12
        allowNull: false
    },
    year: {
        type: DataTypes.INTEGER, // 2024, 2025, etc
        allowNull: false
    },
    amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0
    },
    due_date: {
        type: DataTypes.DATE,
        allowNull: false
    },
    paid: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    paid_date: {
        type: DataTypes.DATE,
        allowNull: true
    }
}, {
    timestamps: true,
    indexes: [
        {
            name: 'idx_invoices_card_month_year',
            unique: true,
            fields: ['credit_card_id', 'month', 'year']
        },
        {
            name: 'idx_invoices_due_date_paid',
            fields: ['due_date', 'paid']
        },
        {
            name: 'idx_invoices_card_year_month_paid',
            fields: ['credit_card_id', 'year', 'month', 'paid']
        }
    ]
});

module.exports = CreditCardInvoice;
