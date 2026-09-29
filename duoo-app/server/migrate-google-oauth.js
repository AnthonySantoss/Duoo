const { DataTypes } = require('sequelize');
const sequelize = require('./config/database');

async function migrateGoogleOAuth() {
    const queryInterface = sequelize.getQueryInterface();
    const table = await queryInterface.describeTable('Users');

    if (!table.google_id) {
        await queryInterface.addColumn('Users', 'google_id', {
            type: DataTypes.STRING(255),
            allowNull: true
        });
        await queryInterface.addIndex('Users', ['google_id'], {
            unique: true,
            name: 'users_google_id_unique'
        });
        console.log('✅ Coluna Users.google_id criada.');
    } else {
        const indexes = await queryInterface.showIndex('Users');
        const hasGoogleIndex = indexes.some((index) => index.name === 'users_google_id_unique');
        if (!hasGoogleIndex) {
            await queryInterface.addIndex('Users', ['google_id'], {
                unique: true,
                name: 'users_google_id_unique'
            });
        }
    }
}

if (require.main === module) {
    migrateGoogleOAuth()
        .then(() => sequelize.close())
        .catch((error) => {
            console.error('❌ Falha na migração do Google OAuth:', error);
            process.exitCode = 1;
        });
}

module.exports = migrateGoogleOAuth;
