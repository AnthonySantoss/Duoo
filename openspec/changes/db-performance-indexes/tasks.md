# Tarefas: Índices de Performance no Banco de Dados

- [x] **Tarefa 1**: Adicionar as declarações `indexes: [...]` nos 14 models do Sequelize em `duoo-app/server/models/` (`Transaction`, `Invoice`, `InvoiceItem`, `Wallet`, `CreditCard`, `Notification`, `PushSubscription`, `CapturedTransaction`, `Recurring`, `Goal`, `Asset`, `Loan`, `UserChallenge`, `Achievement`).
- [x] **Tarefa 2**: Criar `duoo-app/server/utils/dbIndexes.js` com `ensureDatabaseIndexes(sequelize)` (`CREATE INDEX IF NOT EXISTS ...` + `PRAGMA optimize`) e integrá-lo em `syncDatabase()` no `duoo-app/server/index.js`, aplicando também nos arquivos `database.sqlite` existentes.
- [x] **Tarefa 3**: Criar e executar o teste automatizado `duoo-app/server/test/dbIndexes.test.js` validando a criação dos índices e o plano de execução (`EXPLAIN QUERY PLAN` com `USING INDEX`).
