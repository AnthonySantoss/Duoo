const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const CreditCard = sequelize.define('CreditCard', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    limit: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
    },
    due_day: {
        type: DataTypes.INTEGER, // Day of month (1-31)
        allowNull: false
    },
    closing_day: {
        type: DataTypes.INTEGER, // Day of month (1-31)
        allowNull: false
    },
    user_id: {
        type: DataTypes.UUID,
        allowNull: false
    }
});

module.exports = CreditCard;
