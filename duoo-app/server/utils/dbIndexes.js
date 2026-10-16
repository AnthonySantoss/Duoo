/**
 * Utilitário para criação idempotente de índices de alta performance no banco de dados.
 * Suporta SQLite e PostgreSQL com verificação de tabelas e colunas para máxima segurança.
 */

const INDEX_DEFINITIONS = [
    // --- Transactions ---
    { name: 'idx_transactions_user_date', table: 'Transactions', fields: ['user_id', 'date'] },
    { name: 'idx_transactions_wallet_date', table: 'Transactions', fields: ['wallet_id', 'date'] },
    { name: 'idx_transactions_wallet_ext_id', table: 'Transactions', fields: ['wallet_id', 'source_external_id'] },
    { name: 'idx_transactions_user_type_date', table: 'Transactions', fields: ['user_id', 'type', 'date'] },
    { name: 'idx_transactions_user_category_date', table: 'Transactions', fields: ['user_id', 'category', 'date'] },
    { name: 'idx_transactions_recurring_date', table: 'Transactions', fields: ['recurring_id', 'date'] },

    // --- CreditCardInvoices / Invoices ---
    { name: 'idx_invoices_card_month_year', table: 'CreditCardInvoices', fields: ['credit_card_id', 'month', 'year'] },
    { name: 'idx_invoices_status_due_date', table: 'CreditCardInvoices', fields: ['status', 'due_date'] },
    { name: 'idx_invoices_due_date_paid', table: 'CreditCardInvoices', fields: ['due_date', 'paid'] },
    { name: 'idx_invoices_card_year_month_paid', table: 'CreditCardInvoices', fields: ['credit_card_id', 'year', 'month', 'paid'] },
    { name: 'idx_invoices_card_month_year', table: 'Invoices', fields: ['credit_card_id', 'month', 'year'] },
    { name: 'idx_invoices_status_due_date', table: 'Invoices', fields: ['status', 'due_date'] },

    // --- CreditCardPurchases / InvoiceItems ---
    { name: 'idx_cc_purchases_card_remaining', table: 'CreditCardPurchases', fields: ['credit_card_id', 'remaining_installments'] },
    { name: 'idx_cc_purchases_purchase_date', table: 'CreditCardPurchases', fields: ['purchase_date'] },
    { name: 'idx_cc_purchases_card_date', table: 'CreditCardPurchases', fields: ['credit_card_id', 'purchase_date'] },
    { name: 'idx_invoice_items_invoice_date', table: 'CreditCardPurchases', fields: ['invoice_id', 'purchase_date'] },
    { name: 'idx_invoice_items_tx_hash', table: 'CreditCardPurchases', fields: ['transaction_hash'] },
    { name: 'idx_invoice_items_invoice_date', table: 'InvoiceItems', fields: ['invoice_id', 'purchase_date'] },
    { name: 'idx_invoice_items_tx_hash', table: 'InvoiceItems', fields: ['transaction_hash'] },

    // --- Wallets & CreditCards ---
    { name: 'idx_wallets_user_id', table: 'Wallets', fields: ['user_id'] },
    { name: 'idx_wallets_pluggy_account', table: 'Wallets', fields: ['pluggy_account_id'] },
    { name: 'idx_credit_cards_user_id', table: 'CreditCards', fields: ['user_id'] },
    { name: 'idx_credit_cards_user_joint', table: 'CreditCards', fields: ['user_id', 'is_joint'] },

    // --- Notifications & PushSubscriptions ---
    { name: 'idx_notifications_user_read_created', table: 'notifications', fields: ['user_id', 'read', 'created_at'] },
    { name: 'idx_notifications_user_is_read_created', table: 'notifications', fields: ['user_id', 'is_read', 'created_at'] },
    { name: 'idx_notifications_user_type_created', table: 'notifications', fields: ['user_id', 'type', 'created_at'] },
    { name: 'idx_notifications_user_read_created', table: 'Notifications', fields: ['user_id', 'read', 'created_at'] },
    { name: 'idx_notifications_user_is_read_created', table: 'Notifications', fields: ['user_id', 'is_read', 'created_at'] },
    { name: 'idx_notifications_user_type_created', table: 'Notifications', fields: ['user_id', 'type', 'created_at'] },
    { name: 'idx_push_subscriptions_user_id', table: 'push_subscriptions', fields: ['user_id'] },
    { name: 'idx_push_subscriptions_endpoint', table: 'push_subscriptions', fields: ['endpoint'] },
    { name: 'idx_push_subscriptions_user_id', table: 'PushSubscriptions', fields: ['user_id'] },
    { name: 'idx_push_subscriptions_endpoint', table: 'PushSubscriptions', fields: ['endpoint'] },

    // --- Recurrings ---
    { name: 'idx_recurrings_user_active', table: 'Recurrings', fields: ['user_id', 'active'] },
    { name: 'idx_recurrings_active_next_exec', table: 'Recurrings', fields: ['active', 'next_execution'] },
    { name: 'idx_recurrings_user_date', table: 'Recurrings', fields: ['user_id', 'date'] },
    { name: 'idx_recurrings_wallet_id', table: 'Recurrings', fields: ['wallet_id'] },
    { name: 'idx_recurrings_transaction_id', table: 'Recurrings', fields: ['transaction_id'] },
    { name: 'idx_recurrings_status_date', table: 'Recurrings', fields: ['status', 'date'] },

    // --- Goals, Assets, Loans, Challenges, Achievements ---
    { name: 'idx_goals_user_id', table: 'Goals', fields: ['user_id'] },
    { name: 'idx_goals_yielding_amount', table: 'Goals', fields: ['is_yielding', 'current_amount'] },
    { name: 'idx_assets_user_id', table: 'Assets', fields: ['user_id'] },
    { name: 'idx_assets_user_id', table: 'assets', fields: ['user_id'] },
    { name: 'idx_loans_user_status', table: 'Loans', fields: ['user_id', 'status'] },
    { name: 'idx_user_challenges_user_status', table: 'UserChallenges', fields: ['user_id', 'status'] },
    { name: 'idx_achievements_code', table: 'achievements', fields: ['code'] },
    { name: 'idx_achievements_is_active', table: 'achievements', fields: ['is_active'] },
    { name: 'idx_achievements_user_code', table: 'achievements', fields: ['user_id', 'code'] },
    { name: 'idx_achievements_code', table: 'Achievements', fields: ['code'] },
    { name: 'idx_achievements_is_active', table: 'Achievements', fields: ['is_active'] },
    { name: 'idx_achievements_user_code', table: 'Achievements', fields: ['user_id', 'code'] },
    { name: 'idx_user_achievements_user_id', table: 'user_achievements', fields: ['user_id'] },
    { name: 'idx_user_achievements_user_id', table: 'UserAchievements', fields: ['user_id'] },

    // --- Alert Notifications & Budget Alerts ---
    { name: 'idx_alert_notifications_user_read', table: 'alert_notifications', fields: ['user_id', 'is_read'] },
    { name: 'idx_alert_notifications_user_read', table: 'AlertNotifications', fields: ['user_id', 'is_read'] },
    { name: 'idx_budget_alerts_user_active', table: 'budget_alerts', fields: ['user_id', 'is_active'] },
    { name: 'idx_budget_alerts_user_active', table: 'BudgetAlerts', fields: ['user_id', 'is_active'] },

    // --- Captured Transactions ---
    { name: 'idx_captured_tx_user_status_date', table: 'captured_transactions', fields: ['user_id', 'status', 'captured_at'] },
    { name: 'idx_captured_tx_user_hash', table: 'captured_transactions', fields: ['user_id', 'notification_hash'] },
    { name: 'idx_captured_tx_user_status_date', table: 'CapturedTransactions', fields: ['user_id', 'status', 'captured_at'] },
    { name: 'idx_captured_tx_user_hash', table: 'CapturedTransactions', fields: ['user_id', 'notification_hash'] }
];

/**
 * Aplica todos os índices no banco conectado ao Sequelize de forma idempotente e segura.
 * @param {import('sequelize').Sequelize} sequelize
 * @returns {Promise<{ created: number, skipped: number, errors: number }>}
 */
async function ensureDatabaseIndexes(sequelize) {
    if (!sequelize) {
        throw new Error('Instância do Sequelize é obrigatória para ensureDatabaseIndexes.');
    }

    const dialect = sequelize.getDialect();
    let stats = { created: 0, skipped: 0, errors: 0 };

    console.log(`[dbIndexes] Verificando e criando índices de performance (${dialect})...`);

    // Obter lista de tabelas existentes
    let existingTables = new Set();
    let tableColumnsMap = new Map();

    try {
        if (dialect === 'sqlite') {
            const [tables] = await sequelize.query("SELECT name FROM sqlite_master WHERE type='table'");
            tables.forEach(t => existingTables.add(t.name.toLowerCase()));

            for (const t of tables) {
                try {
                    const [cols] = await sequelize.query(`PRAGMA table_info("${t.name}")`);
                    const colSet = new Set(cols.map(c => c.name.toLowerCase()));
                    tableColumnsMap.set(t.name.toLowerCase(), colSet);
                    tableColumnsMap.set(t.name, colSet);
                } catch {
                    // Ignora erro em tabelas de sistema
                }
            }
        } else if (dialect === 'postgres') {
            const [tables] = await sequelize.query(
                "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'"
            );
            tables.forEach(t => existingTables.add(t.table_name.toLowerCase()));

            for (const t of tables) {
                try {
                    const [cols] = await sequelize.query(
                        `SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = '${t.table_name}'`
                    );
                    const colSet = new Set(cols.map(c => c.column_name.toLowerCase()));
                    tableColumnsMap.set(t.table_name.toLowerCase(), colSet);
                } catch {
                    // Ignora
                }
            }
        }
    } catch (err) {
        console.warn('[dbIndexes] Não foi possível inspecionar schema antecipadamente:', err.message);
    }

    // Criar cada índice
    for (const def of INDEX_DEFINITIONS) {
        const tableLower = def.table.toLowerCase();

        // Se pudemos inspecionar o schema, validar tabela e colunas
        if (existingTables.size > 0 && !existingTables.has(tableLower)) {
            stats.skipped++;
            continue;
        }

        const cols = tableColumnsMap.get(tableLower);
        if (cols) {
            const hasAllColumns = def.fields.every(f => cols.has(f.toLowerCase()));
            if (!hasAllColumns) {
                stats.skipped++;
                continue;
            }
        }

        const columnsSql = def.fields.map(f => `"${f}"`).join(', ');
        const createIndexSql = `CREATE INDEX IF NOT EXISTS "${def.name}" ON "${def.table}" (${columnsSql});`;

        try {
            await sequelize.query(createIndexSql);
            stats.created++;
        } catch (err) {
            stats.errors++;
            console.warn(`[dbIndexes] Aviso ao criar índice ${def.name} em ${def.table}: ${err.message}`);
        }
    }

    // Otimização final
    if (dialect === 'sqlite') {
        try {
            await sequelize.query('PRAGMA optimize;');
            await sequelize.query('ANALYZE;');
            console.log('[dbIndexes] PRAGMA optimize e ANALYZE executados com sucesso.');
        } catch (err) {
            console.warn('[dbIndexes] Aviso ao executar otimização SQLite:', err.message);
        }
    }

    console.log(`[dbIndexes] Concluído: ${stats.created} processados, ${stats.skipped} ignorados (tabela/coluna ausente), ${stats.errors} avisos.`);
    return stats;
}

module.exports = {
    ensureDatabaseIndexes,
    INDEX_DEFINITIONS
};
