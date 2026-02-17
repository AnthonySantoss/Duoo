const sequelize = require('./config/database');
const { QueryTypes } = require('sequelize');

async function repair() {
    console.log('Adding custom challenge columns...');

    try {
        try {
            await sequelize.query('ALTER TABLE Challenges ADD COLUMN is_custom BOOLEAN DEFAULT 0', { type: QueryTypes.RAW });
            console.log('Added is_custom to Challenges');
        } catch (e) { console.log('is_custom might exist'); }

        try {
            await sequelize.query('ALTER TABLE Challenges ADD COLUMN user_id UUID', { type: QueryTypes.RAW });
            console.log('Added user_id to Challenges');
        } catch (e) { console.log('user_id might exist'); }

        console.log('Repair finished.');
    } catch (err) {
        console.error('Repair failed:', err);
    } finally {
        process.exit();
    }
}

repair();
