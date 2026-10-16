const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const User = require('./User');

const Asset = sequelize.define('Asset', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    user_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: User,
            key: 'id'
        }
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    type: {
        type: DataTypes.STRING(50),
        allowNull: true
    },
    value: {
        type: DataTypes.DECIMAL(12, 2),
        defaultValue: 0.00
    }
}, {
    tableName: 'assets',
    timestamps: true,
    indexes: [
        { name: 'idx_assets_user_id', fields: ['user_id'] }
    ]
});

module.exports = Asset;
