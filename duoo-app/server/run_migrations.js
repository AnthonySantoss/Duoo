const { execSync } = require('child_process');
const sequelize = require('./config/database');

console.log('--- Iniciando Ciclo de Migrações Seguras (Idempotentes) ---');

const migrations = [
    // --- Base & Setup ---
    'migrate.js',
    'setup-notifications.js',

    // --- Feature: Goals ---
    'add-goal-column.js',
    'fix_goals_table.js',
    'fix-nan-goals.js',

    // --- Feature: Legacy banking columns (kept for existing databases) ---
    'migrate-pluggy.js',
    'migrate-creditcards-pluggy.js',
    'migrate-goals-pluggy.js',
    'migrate-loan-transaction-link.js',
    'migrate-category-corrections.js',

    // --- Feature: Recent Improvements (Transactions, Notes, Recurrings) ---
    'migrate_notes.js',
    'migrate_recurring.js',
    'migrate_recurring_transaction.js',
    'migrate_transaction_split.js',
    'scripts/add-category-to-purchases.js',

    // --- Feature: Notification System Overhaul ---
    'fix_notification_constraint.js',
    'add_notified_to_notifications.js',

    // --- Cleanup & Fixes ---
    'mark_old_notifications_seen.js',
    'fix-challenges-table.js',
    'migrate-challenge-type.js',
    'migrate-feb16_v2.js',
    'migrate-notification-capture.js'
];

async function runAll() {
    console.log('\n--- Sincronizando Modelos (Base) ---');
    try {
        require('./models');
        await sequelize.sync({ force: false });
        await require('./migrate-google-oauth')();
        console.log('✅ Base de dados sincronizada.');
    } catch (error) {
        console.error('❌ Erro ao sincronizar base:', error.message);
        throw error;
    }

    // As migrações legadas usam SQL específico do SQLite. Em um banco novo
    // PostgreSQL, o schema atual dos modelos já é criado pelo sync acima.
    // Isso evita executar PRAGMA/AUTOINCREMENT/renomeações incompatíveis.
    if (sequelize.getDialect() === 'postgres') {
        console.log('✅ PostgreSQL detectado: migrações legadas SQLite ignoradas.');
        await sequelize.close();
        return;
    }

    for (const script of migrations) {
        try {
            console.log(`\n▶️ Rodando: ${script}...`);
            execSync(`node ${script}`, { stdio: 'inherit' });
            console.log(`✅ ${script} concluído.`);
        } catch (error) {
            console.log(`⚠️  ${script} falhou ou já aplicado. Detalhe: ${error.message}`);
        }
    }

    console.log('\n--- Todas as migrações foram processadas ---');
}

runAll().then(() => {
    process.exit(0);
}).catch(err => {
    console.error('❌ Erro fatal nas migrações:', err);
    process.exit(1);
});
