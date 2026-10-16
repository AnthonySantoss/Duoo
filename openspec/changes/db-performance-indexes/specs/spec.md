# Especificação: Índices de Performance no Banco de Dados

## Requisitos Funcionais e Critérios de Aceite

### RF1: Declaração de Índices nos Models Sequelize
- **Dado** qualquer ambiente novo ou suíte de testes que execute `sequelize.sync({ force: true })`,
- **Quando** as tabelas forem criadas pelo Sequelize,
- **Então** todos os índices compostos e simples das tabelas `Transactions`, `Invoices`, `InvoiceItems`, `Wallets`, `CreditCards`, `Notifications`, `PushSubscriptions`, `CapturedTransactions`, `Recurrings`, `Goals`, `Assets`, `Loans`, `UserChallenges` e `Achievements` devem ser criados automaticamente.

### RF2: Migração Idempotente em Bancos Existentes (`CREATE INDEX IF NOT EXISTS`)
- **Dado** um banco de dados SQLite já existente (`database.sqlite` na raiz ou em `duoo-app/`),
- **Quando** o servidor inicializar e executar `syncDatabase()` (ou script de aplicação de índices),
- **Então** todos os 26 índices planejados devem ser criados via `CREATE INDEX IF NOT EXISTS` sem perda de dados e sem erro caso já existam.

### RF3: Uso Efetivo do Índice pelo Query Planner do SQLite (`SEARCH ... USING INDEX`)
- **Dado** as consultas críticas do sistema (extrato por usuário/data, deduplicação por `wallet_id` + `source_external_id` ou `wallet_id` + `date`, busca de faturas por `credit_card_id` + `month` + `year`, contagem de notificações não lidas por `user_id` + `is_read`),
- **Quando** inspecionadas com `EXPLAIN QUERY PLAN` no SQLite,
- **Então** o SQLite deve utilizar `SEARCH ... USING INDEX` em vez de `SCAN` (*Full Table Scan*).
