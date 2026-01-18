const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const User = require('./User');
const Achievement = require('./Achievement');

const UserAchievement = sequelize.define('UserAchievement', {
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
    achievement_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: Achievement,
            key: 'id'
        }
    },
    unlocked_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        comment: 'Data que a conquista foi desbloqueada'
    },
    is_new: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        comment: 'Se o usuário ainda não viu a conquista'
    }
}, {
    tableName: 'user_achievements',
    timestamps: false,
    indexes: [
        {
            unique: true,
            fields: ['user_id', 'achievement_id']
        }
    ]
});

module.exports = UserAchievement;
