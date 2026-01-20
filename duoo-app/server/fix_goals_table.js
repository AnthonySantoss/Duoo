const sequelize = require('./config/database');
const { QueryTypes } = require('sequelize');

async function fixParams() {
    try {
        await sequelize.authenticate();
        console.log('Connected to database.');

        // Add accumulated_yield
        try {
            await sequelize.query('ALTER TABLE Goals ADD COLUMN accumulated_yield DECIMAL(10, 2) DEFAULT 0.00;');
            console.log('Success: Added accumulated_yield column.');
        } catch (e) {
            console.log('Info: accumulated_yield could not be added (likely already exists):', e.message);
        }

        // Add is_yielding
        try {
            await sequelize.query('ALTER TABLE Goals ADD COLUMN is_yielding BOOLEAN DEFAULT 0;');
            console.log('Success: Added is_yielding column.');
        } catch (e) {
            console.log('Info: is_yielding could not be added (likely already exists):', e.message);
        }

        // Add cdi_percentage
        try {
            await sequelize.query('ALTER TABLE Goals ADD COLUMN cdi_percentage DECIMAL(5, 2);');
            console.log('Success: Added cdi_percentage column.');
        } catch (e) {
            console.log('Info: cdi_percentage could not be added (likely already exists):', e.message);
        }

        // Add bank_name
        try {
            await sequelize.query('ALTER TABLE Goals ADD COLUMN bank_name VARCHAR(255);');
            console.log('Success: Added bank_name column.');
        } catch (e) {
            console.log('Info: bank_name could not be added (likely already exists):', e.message);
        }

    } catch (error) {
        console.error('Fatal Error:', error);
    } finally {
        await sequelize.close();
        console.log('Database connection closed.');
    }
}

fixParams();
