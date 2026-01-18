const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const AlertNotification = sequelize.define('AlertNotification', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    user_id: {
        type: DataTypes.UUID,
        allowNull: false,
        comment: 'ID do usuário'
    },
    alert_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: 'ID do alerta que gerou a notificação'
    },
    title: {
        type: DataTypes.STRING(100),
        allowNull: false,
        comment: 'Título da notificação'
    },
    message: {
        type: DataTypes.TEXT,
        allowNull: false,
        comment: 'Mensagem da notificação'
    },
    severity: {
        type: DataTypes.ENUM('info', 'warning', 'critical'),
        defaultValue: 'info',
        comment: 'Severidade da notificação'
    },
    is_read: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        comment: 'Se a notificação foi lida'
    },
    data: {
        type: DataTypes.JSON,
        allowNull: true,
        comment: 'Dados adicionais da notificação'
    }
}, {
    tableName: 'alert_notifications',
    timestamps: true
});

module.exports = AlertNotification;
