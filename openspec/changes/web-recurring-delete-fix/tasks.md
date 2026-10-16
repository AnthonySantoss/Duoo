# Tarefas: Correção da Exclusão de Recorrência

- [x] **Tarefa 1**: Garantir em `ConfirmModal.jsx` e `RecurringRedesigned.jsx` que o modal de confirmação de exclusão renderize em primeiro plano (`z-[70]` via Portal) sobre o modal "Detalhes da recorrência".
- [x] **Tarefa 2**: Em `duoo-app/server/routes/recurringRoutes.js`, permitir que parceiros vinculados (`partner_id`) também possam excluir ou alterar status de recorrências na visão conjunta (`DELETE /:id` e `PUT /:id/toggle-status`).
