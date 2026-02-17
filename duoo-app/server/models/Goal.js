const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const User = require('./User');

const Goal = sequelize.define('Goal', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    title: {
        type: DataTypes.STRING,
        allowNull: false
    },
    target_amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
    },
    current_amount: {
        type: DataTypes.DECIMAL(10, 2),
        defaultValue: 0.00
    },
    is_joint: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    user_id: {
        type: DataTypes.UUID,
        allowNull: false
    },
    is_yielding: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    accumulated_yield: {
        type: DataTypes.DECIMAL(10, 2),
        defaultValue: 0.00
    },
    cdi_percentage: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: true
    },
    bank_name: {
        type: DataTypes.STRING,
        allowNull: true
    },
    pluggy_investment_id: {
        type: DataTypes.STRING,
        allowNull: true
    },
    pluggy_item_id: {
        type: DataTypes.STRING,
        allowNull: true
    },
    name: {
        type: DataTypes.STRING,
        allowNull: true
    },
    deadline: {
        type: DataTypes.DATE,
        allowNull: true
    },
    category: {
        type: DataTypes.STRING,
        allowNull: true
    },
    is_event_bucket: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    }
});

module.exports = Goal;
