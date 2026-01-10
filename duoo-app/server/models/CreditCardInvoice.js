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
            unique: true,
            fields: ['credit_card_id', 'month', 'year']
        }
    ]
});

module.exports = CreditCardInvoice;
