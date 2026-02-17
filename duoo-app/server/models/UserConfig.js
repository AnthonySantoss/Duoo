const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const UserConfig = sequelize.define('UserConfig', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    user_id: {
        type: DataTypes.UUID,
        allowNull: false,
        unique: true
    },
    large_transaction_limit: {
        type: DataTypes.DECIMAL(10, 2),
        defaultValue: 500.00
    },
    weekly_report_day: {
        type: DataTypes.INTEGER,
        defaultValue: 0 // 0 = Sunday
    },
    weekly_report_hour: {
        type: DataTypes.INTEGER,
        defaultValue: 20 // 20:00
    },
    notifications_enabled: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    }
});

module.exports = UserConfig;
