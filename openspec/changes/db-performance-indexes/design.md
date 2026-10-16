# Design Técnico: Índices de Performance no Banco de Dados

## 1. Utilitário Central de Índices (`duoo-app/server/utils/dbIndexes.js`)
- Criar um módulo `duoo-app/server/utils/dbIndexes.js` que exporta `ensureDatabaseIndexes(sequelize)`.
- Essa função executa todos os comandos `CREATE INDEX IF NOT EXISTS ...` e um `PRAGMA optimize;` no SQLite.
- Chamar `await ensureDatabaseIndexes(sequelize)` dentro de `syncDatabase()` em `duoo-app/server/index.js` logo após as migrações de colunas existentes.

## 2. Definições `indexes` nos Models (`duoo-app/server/models/*.js`)
Adicionar a propriedade `indexes: [...]` no 3º argumento de `sequelize.define(...)` em:
- `Transaction.js`
- `Invoice.js`
- `InvoiceItem.js`
- `Wallet.js`
- `CreditCard.js`
- `Notification.js`
- `PushSubscription.js`
- `CapturedTransaction.js`
- `Recurring.js`
- `Goal.js`
- `Asset.js`
- `Loan.js`
- `UserChallenge.js`
- `Achievement.js`

## 3. Aplicação Imediata e Testes Automatizados
- Executar `ensureDatabaseIndexes` também nos arquivos `database.sqlite` existentes no workspace para que o ganho de velocidade já esteja ativo imediatamente.
- Criar `duoo-app/server/test/dbIndexes.test.js` verificando via `PRAGMA index_list(...)` e `EXPLAIN QUERY PLAN` que o SQLite utiliza os índices nas buscas de transações, deduplicação de extrato, faturas e notificações.
