const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const CreditCardPurchase = require('../models/CreditCardPurchase');

const migrate = async () => {
    try {
        await sequelize.authenticate();
        console.log('Database connection has been established successfully.');

        // Add 'category' column if it doesn't exist
        await sequelize.getQueryInterface().addColumn('CreditCardPurchases', 'category', {
            type: DataTypes.STRING,
            defaultValue: 'Outros'
        });

        console.log('Added category column to CreditCardPurchases table.');
    } catch (error) {
        if (error.message.includes('Duplicate column name')) {
            console.log('Column category already exists in CreditCardPurchases.');
        } else {
            console.error('Unable to migrate database:', error);
        }
    } finally {
        await sequelize.close();
    }
};

migrate();
