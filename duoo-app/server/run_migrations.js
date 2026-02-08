const { execSync } = require('child_process');

console.log('--- Iniciando Ciclo de Migrações Seguras (Idempotentes) ---');

const migrations = [
    // --- Base & Setup ---
    'migrate.js',
    'setup-notifications.js',

    // --- Feature: Goals ---
    'add-goal-column.js',
    'fix_goals_table.js',
    'fix-nan-goals.js',

    // --- Feature: Pluggy & Banking Integrations ---
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
    'mark_old_notifications_seen.js'
];

for (const script of migrations) {
    try {
        console.log(`\n▶️ Rodando: ${script}...`);
        // Use relative path from server directory
        execSync(`node ${script}`, { stdio: 'inherit' });
        console.log(`✅ ${script} concluído.`);
    } catch (error) {
        console.log(`ℹ️  ${script} avisou algo ou já estava aplicado (pode ignorar se for erro de coluna duplicada).`);
    }
}

console.log('\n--- Todas as migrações foram processadas ---');
