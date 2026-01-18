const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const User = require('./User');

const TransactionCorrection = sequelize.define('TransactionCorrection', {
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
    description: {
        type: DataTypes.STRING(255),
        allowNull: false
    },
    description_normalized: {
        type: DataTypes.STRING(255),
        allowNull: false,
        comment: 'Descrição normalizada (sem acentos, lowercase) para busca'
    },
    original_category: {
        type: DataTypes.STRING(50),
        allowNull: true,
        comment: 'Categoria original sugerida pelo sistema'
    },
    corrected_category: {
        type: DataTypes.STRING(50),
        allowNull: false,
        comment: 'Categoria corrigida pelo usuário'
    },
    confidence: {
        type: DataTypes.INTEGER,
        defaultValue: 100,
        comment: 'Nível de confiança (0-100) - aumenta com uso repetido'
    },
    times_used: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        comment: 'Quantas vezes esta correção foi aplicada automaticamente'
    }
}, {
    tableName: 'transaction_corrections',
    timestamps: true,
    indexes: [
        {
            fields: ['user_id', 'description_normalized']
        },
        {
            fields: ['user_id', 'corrected_category']
        }
    ]
});

module.exports = TransactionCorrection;
