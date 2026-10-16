# Design Técnico: Correção da Exclusão de Recorrência

## 1. Frontend (`RecurringRedesigned.jsx` e `ConfirmModal.jsx`)
- Com `ConfirmModal.jsx` usando `createPortal(..., document.body)` e `z-[70]`, ele já ficará acima do `<Modal>` (`z-50`).
- Adicionalmente, em `RecurringRedesigned.jsx`, posicionar o `<ConfirmModal>` após os demais `<Modal>` e garantir feedback visual claro (`Toast`) em caso de sucesso ou erro.

## 2. Backend (`duoo-app/server/routes/recurringRoutes.js`)
- Na rota `DELETE /:id` (e `PUT /:id/toggle-status`):
  - Buscar `const currentUser = await User.findByPk(req.user.id);`
  - Montar `const allowedUserIds = [req.user.id]; if (currentUser?.partner_id) allowedUserIds.push(currentUser.partner_id);`
  - Buscar o item com `where: { id, user_id: { [Op.in]: allowedUserIds } }`.
