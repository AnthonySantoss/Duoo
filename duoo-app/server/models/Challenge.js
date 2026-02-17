const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const User = require('./User');

const Challenge = sequelize.define('Challenge', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    title: {
        type: DataTypes.STRING,
        allowNull: false
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    type: {
        type: DataTypes.ENUM('saving', 'no_spending', 'category_limit'),
        allowNull: false
    },
    target_amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true
    },
    category: {
        type: DataTypes.STRING,
        allowNull: true
    },
    duration_days: {
        type: DataTypes.INTEGER,
        defaultValue: 30
    },
    points: {
        type: DataTypes.INTEGER,
        defaultValue: 100
    },
    icon: {
        type: DataTypes.STRING,
        defaultValue: 'Trophy'
    },
    is_custom: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    user_id: {
        type: DataTypes.UUID,
        allowNull: true
    }
});

const UserChallenge = sequelize.define('UserChallenge', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    status: {
        type: DataTypes.ENUM('active', 'completed', 'failed'),
        defaultValue: 'active'
    },
    progress: {
        type: DataTypes.DECIMAL(10, 2),
        defaultValue: 0
    },
    start_date: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    },
    end_date: {
        type: DataTypes.DATE
    }
});

// UserChallenge associations will be added in models/index.js

module.exports = { Challenge, UserChallenge };
