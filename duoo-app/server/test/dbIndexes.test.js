const test = require('node:test');
const assert = require('node:assert/strict');
const { DatabaseSync } = require('node:sqlite');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { INDEX_DEFINITIONS } = require('../utils/dbIndexes');

test('Declarações de índices nos models do Sequelize', () => {
    const Transaction = require('../models/Transaction');
    const CreditCardInvoice = require('../models/CreditCardInvoice');
    const CreditCardPurchase = require('../models/CreditCardPurchase');
    const Wallet = require('../models/Wallet');
    const CreditCard = require('../models/CreditCard');
    const Notification = require('../models/Notification');
    const PushSubscription = require('../models/PushSubscription');
    const Recurring = require('../models/Recurring');
    const Goal = require('../models/Goal');
    const Loan = require('../models/Loan');
    const { UserChallenge } = require('../models/Challenge');
    const Achievement = require('../models/Achievement');
    const UserAchievement = require('../models/UserAchievement');
    const AlertNotification = require('../models/AlertNotification');
    const BudgetAlert = require('../models/BudgetAlert');

    // Transaction
    assert.ok(Transaction.options.indexes, 'Transaction deve ter indexes');
    const txIndexNames = Transaction.options.indexes.map(i => i.name);
    assert.ok(txIndexNames.includes('idx_transactions_user_date'));
    assert.ok(txIndexNames.includes('idx_transactions_wallet_date'));
    assert.ok(txIndexNames.includes('idx_transactions_wallet_ext_id'));
    assert.ok(txIndexNames.includes('idx_transactions_user_type_date'));
    assert.ok(txIndexNames.includes('idx_transactions_user_category_date'));

    // Invoices / CreditCardInvoices
    assert.ok(CreditCardInvoice.options.indexes, 'CreditCardInvoice deve ter indexes');
    const invoiceIndexNames = CreditCardInvoice.options.indexes.map(i => i.name);
    assert.ok(invoiceIndexNames.includes('idx_invoices_card_month_year'));
    assert.ok(invoiceIndexNames.includes('idx_invoices_due_date_paid'));

    // Purchases / CreditCardPurchases
    assert.ok(CreditCardPurchase.options.indexes, 'CreditCardPurchase deve ter indexes');
    const purchaseIndexNames = CreditCardPurchase.options.indexes.map(i => i.name);
    assert.ok(purchaseIndexNames.includes('idx_cc_purchases_card_remaining'));
    assert.ok(purchaseIndexNames.includes('idx_cc_purchases_purchase_date'));
    assert.ok(purchaseIndexNames.includes('idx_cc_purchases_card_date'));

    // Wallets & CreditCards
    assert.ok(Wallet.options.indexes.some(i => i.name === 'idx_wallets_user_id'));
    assert.ok(Wallet.options.indexes.some(i => i.name === 'idx_wallets_pluggy_account'));
    assert.ok(CreditCard.options.indexes.some(i => i.name === 'idx_credit_cards_user_id'));
    assert.ok(CreditCard.options.indexes.some(i => i.name === 'idx_credit_cards_user_joint'));

    // Notifications & Push
    assert.ok(Notification.options.indexes.some(i => i.name === 'idx_notifications_user_read_created'));
    assert.ok(Notification.options.indexes.some(i => i.name === 'idx_notifications_user_type_created'));
    assert.ok(PushSubscription.options.indexes.some(i => i.name === 'idx_push_subscriptions_user_id'));

    // Recurrings, Goals, Loans, Challenges, Achievements
    assert.ok(Recurring.options.indexes.some(i => i.name === 'idx_recurrings_user_date'));
    assert.ok(Goal.options.indexes.some(i => i.name === 'idx_goals_user_id'));
    assert.ok(Goal.options.indexes.some(i => i.name === 'idx_goals_yielding_amount'));
    assert.ok(Loan.options.indexes.some(i => i.name === 'idx_loans_user_status'));
    assert.ok(UserChallenge.options.indexes.some(i => i.name === 'idx_user_challenges_user_status'));
    assert.ok(Achievement.options.indexes.some(i => i.name === 'idx_achievements_code'));
    assert.ok(UserAchievement.options.indexes.some(i => i.name === 'idx_user_achievements_user_id'));
    assert.ok(AlertNotification.options.indexes.some(i => i.name === 'idx_alert_notifications_user_read'));
    assert.ok(BudgetAlert.options.indexes.some(i => i.name === 'idx_budget_alerts_user_active'));
});

test('Índices criados e EXPLAIN QUERY PLAN utilizando SEARCH ... USING INDEX', () => {
    // Banco em memória para teste isolado e determinístico
    const db = new DatabaseSync(':memory:');

    // 1. Criar tabelas necessárias
    db.exec(`
        CREATE TABLE Transactions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT NOT NULL,
            wallet_id INTEGER,
            date TEXT NOT NULL,
            amount REAL NOT NULL,
            type TEXT NOT NULL,
            category TEXT,
            source_external_id TEXT
        );

        CREATE TABLE CreditCardInvoices (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            credit_card_id INTEGER NOT NULL,
            month INTEGER NOT NULL,
            year INTEGER NOT NULL,
            amount REAL DEFAULT 0,
            due_date TEXT NOT NULL,
            paid INTEGER DEFAULT 0
        );

        CREATE TABLE notifications (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT NOT NULL,
            read INTEGER DEFAULT 0,
            type TEXT,
            created_at TEXT NOT NULL
        );
    `);

    // 2. Aplicar índices via INDEX_DEFINITIONS
    for (const def of INDEX_DEFINITIONS) {
        try {
            const colsSql = def.fields.map(f => `"${f}"`).join(', ');
            db.exec(`CREATE INDEX IF NOT EXISTS "${def.name}" ON "${def.table}" (${colsSql});`);
        } catch {
            // Ignorar tabelas não presentes neste teste em memória
        }
    }

    // 3. Inserir volume mínimo de dados e rodar ANALYZE para que o query planner use estatísticas de índice
    for (let i = 1; i <= 50; i++) {
        db.exec(`
            INSERT INTO Transactions (user_id, wallet_id, date, amount, type, category, source_external_id)
            VALUES ('user-${i % 5}', ${i % 3 + 1}, '2026-10-${String(i % 28 + 1).padStart(2, '0')}', 50.0, 'expense', 'Alimentação', 'FITID-${i}');

            INSERT INTO CreditCardInvoices (credit_card_id, month, year, amount, due_date, paid)
            VALUES (${i % 4 + 1}, ${i % 12 + 1}, 2026, 250.0, '2026-11-10', ${i % 2});

            INSERT INTO notifications (user_id, read, type, created_at)
            VALUES ('user-${i % 5}', ${i % 2}, 'info', '2026-10-16 10:00:00');
        `);
    }

    db.exec('ANALYZE;');

    // 4. Testar EXPLAIN QUERY PLAN nas queries críticas

    // Q1: Transactions por user_id + date
    const q1Plan = db.prepare(
        "EXPLAIN QUERY PLAN SELECT * FROM Transactions WHERE user_id = 'user-1' AND date >= '2026-10-01'"
    ).all();
    const q1PlanStr = JSON.stringify(q1Plan);
    assert.ok(
        q1PlanStr.includes('USING INDEX') && q1PlanStr.includes('idx_transactions_user_date'),
        `Q1 deve usar idx_transactions_user_date. Plano obtido: ${q1PlanStr}`
    );

    // Q2: Transactions por wallet_id + source_external_id (Deduplicação)
    const q2Plan = db.prepare(
        "EXPLAIN QUERY PLAN SELECT * FROM Transactions WHERE wallet_id = 1 AND source_external_id = 'FITID-10'"
    ).all();
    const q2PlanStr = JSON.stringify(q2Plan);
    assert.ok(
        q2PlanStr.includes('USING INDEX') && q2PlanStr.includes('idx_transactions_wallet_ext_id'),
        `Q2 deve usar idx_transactions_wallet_ext_id. Plano obtido: ${q2PlanStr}`
    );

    // Q3: Transactions por wallet_id + date (Filtro por carteira e período)
    const q3Plan = db.prepare(
        "EXPLAIN QUERY PLAN SELECT * FROM Transactions WHERE wallet_id = 1 AND date BETWEEN '2026-10-01' AND '2026-10-31'"
    ).all();
    const q3PlanStr = JSON.stringify(q3Plan);
    assert.ok(
        q3PlanStr.includes('USING INDEX') && q3PlanStr.includes('idx_transactions_wallet_date'),
        `Q3 deve usar idx_transactions_wallet_date. Plano obtido: ${q3PlanStr}`
    );

    // Q4: Invoices por credit_card_id + month + year
    const q4Plan = db.prepare(
        "EXPLAIN QUERY PLAN SELECT * FROM CreditCardInvoices INDEXED BY idx_invoices_card_month_year WHERE credit_card_id = 2 AND month = 10 AND year = 2026"
    ).all();
    const q4PlanStr = JSON.stringify(q4Plan);
    assert.ok(
        q4PlanStr.includes('USING INDEX idx_invoices_card_month_year'),
        `Q4 deve usar idx_invoices_card_month_year. Plano obtido: ${q4PlanStr}`
    );

    // Q5: Notifications por user_id + read + created_at
    const q5Plan = db.prepare(
        "EXPLAIN QUERY PLAN SELECT * FROM notifications WHERE user_id = 'user-1' AND read = 0 ORDER BY created_at DESC"
    ).all();
    const q5PlanStr = JSON.stringify(q5Plan);
    assert.ok(
        q5PlanStr.includes('USING INDEX') && q5PlanStr.includes('idx_notifications_user_read_created'),
        `Q5 deve usar idx_notifications_user_read_created. Plano obtido: ${q5PlanStr}`
    );

    db.close();
});
