const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const PushSubscription = sequelize.define('PushSubscription', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    user_id: {
        // User.id is UUID across all supported databases.
        type: DataTypes.UUID,
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
