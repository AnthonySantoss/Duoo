# Proposta: Índices de Performance no Banco de Dados (SQLite / Sequelize)

## 1. Problema e Contexto
O banco de dados SQLite (`database.sqlite`) atualmente não possui **nenhum índice secundário** nas tabelas de domínio (apenas chaves primárias `id` e `UNIQUE` em `Users.email`, `Users.link_code` e `CategoryConfigs(user_id, category)`).
Com isso, todas as buscas de extrato, resumos do dashboard, filtros por período/carteira/categoria, deduplicação de importação de extrato/cartão, faturas e notificações executam *Full Table Scan* (varredura completa da tabela).

## 2. Detalhe Técnico Importante (SQLite + `sequelize.sync()`)
Em `duoo-app/server/index.js`, o servidor utiliza `sequelize.sync()` padrão (que executa `CREATE TABLE IF NOT EXISTS`). No Sequelize, adicionar apenas `indexes: [...]` nos models aplica os índices somente quando a tabela é criada do zero, não criando índices em bancos `database.sqlite` já existentes!
Portanto, a solução deve:
1. Declarar `indexes: [...]` nos models do Sequelize (para novos bancos e testes).
2. Executar `CREATE INDEX IF NOT EXISTS ...` dentro da rotina `syncDatabase()` em `duoo-app/server/index.js` (para criar todos os índices imediatamente no banco existente ao iniciar o servidor, de forma idempotente e segura).

## 3. Índices a Criar
- **`Transactions`**:
  - `idx_transactions_user_date` (`user_id`, `date`)
  - `idx_transactions_wallet_date` (`wallet_id`, `date`)
  - `idx_transactions_wallet_ext_id` (`wallet_id`, `source_external_id`)
  - `idx_transactions_user_type_date` (`user_id`, `type`, `date`)
  - `idx_transactions_user_category_date` (`user_id`, `category`, `date`)
  - `idx_transactions_recurring_date` (`recurring_id`, `date`)
- **`Invoices` e `InvoiceItems`**:
  - `idx_invoices_card_month_year` (`credit_card_id`, `month`, `year`)
  - `idx_invoices_status_due_date` (`status`, `due_date`)
  - `idx_invoice_items_invoice_date` (`invoice_id`, `purchase_date`)
  - `idx_invoice_items_tx_hash` (`transaction_hash`)
- **`Wallets` e `CreditCards`**:
  - `idx_wallets_user_id` (`user_id`)
  - `idx_wallets_pluggy_account` (`pluggy_account_id`)
  - `idx_credit_cards_user_id` (`user_id`)
- **`Notifications` e `PushSubscriptions`**:
  - `idx_notifications_user_read_created` (`user_id`, `is_read`, `created_at`)
  - `idx_notifications_user_type_created` (`user_id`, `type`, `created_at`)
  - `idx_push_subscriptions_user_id` (`user_id`)
  - `idx_push_subscriptions_endpoint` (`endpoint`)
- **`CapturedTransactions`, `Recurrings`, `Goals`, `Assets`, `Loans`, `UserChallenges`, `Achievements`**:
  - `idx_captured_tx_user_status_date` (`user_id`, `status`, `captured_at`)
  - `idx_captured_tx_user_hash` (`user_id`, `notification_hash`)
  - `idx_recurrings_user_active` (`user_id`, `active`)
  - `idx_recurrings_active_next_exec` (`active`, `next_execution`)
  - `idx_goals_user_id` (`user_id`)
  - `idx_assets_user_id` (`user_id`)
  - `idx_loans_user_status` (`user_id`, `status`)
  - `idx_user_challenges_user_status` (`user_id`, `status`)
  - `idx_achievements_user_code` (`user_id`, `code`)
