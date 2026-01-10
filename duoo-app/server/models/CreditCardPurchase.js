const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const CreditCardPurchase = sequelize.define('CreditCardPurchase', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    description: {
        type: DataTypes.STRING,
        allowNull: false
    },
    total_amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
    },
    installments: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    installment_amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
    },
    remaining_installments: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    purchase_date: {
        type: DataTypes.DATEONLY,
        allowNull: false
    },
    credit_card_id: {
        type: DataTypes.INTEGER,
        allowNull: false
    }
});

module.exports = CreditCardPurchase;
