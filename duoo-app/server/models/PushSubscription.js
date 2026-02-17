const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const PushSubscription = sequelize.define('PushSubscription', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    user_id: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    subscription_data: {
        type: DataTypes.TEXT, // Store JSON stringified subscription
        allowNull: false
    },
    device_type: {
        type: DataTypes.STRING, // e.g., 'android', 'ios', 'desktop'
        allowNull: true
    }
}, {
    tableName: 'push_subscriptions',
    timestamps: true,
    underscored: true
});

module.exports = PushSubscription;
