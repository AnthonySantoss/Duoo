# Proposta: Correção da Exclusão de Recorrência

## 1. Problema e Contexto
Na página de Recorrências (`RecurringRedesigned.jsx`), ao abrir o modal "Detalhes da recorrência" e clicar no botão **"Excluir recorrência"**, o modal de confirmação abre **atrás** do modal de detalhes (ficando invisível/desfocado no fundo e inacessível ao clique). Além disso, na visualização "Conjunto" (`viewMode === 'joint'`), o backend restringe a exclusão apenas ao criador original (`user_id: req.user.id`), impedindo que o parceiro exclua itens compartilhados do casal.

## 2. Causas Raízes
1. **Conflito de ordem no DOM e `z-index` idêntico (`z-50`)**: Em `RecurringRedesigned.jsx`, o `<ConfirmModal>` é renderizado na linha 359, **antes** do `<Modal title="Detalhes da recorrência">` (linha 369). Como ambos usam `z-50`, o navegador empilha o modal de detalhes por cima do `ConfirmModal`! (Visível claramente na Imagem 3, onde o botão vermelho do `ConfirmModal` aparece borrado lá no fundo abaixo do modal de detalhes).
2. **Permissão de exclusão do casal no backend (`recurringRoutes.js:244`)**: A rota `DELETE /api/recurring/:id` filtra apenas `where: { id, user_id: req.user.id }`, sem incluir o `partner_id` do usuário quando vinculado, causando erro `404 Item not found` ao tentar excluir uma recorrência criada pelo parceiro na visão conjunta.

## 3. Escopo da Mudança
- Com o `ConfirmModal` usando `createPortal(..., document.body)` e `z-[70]` (ou fechando/sobrepondo o modal de detalhes ao confirmar), o modal de confirmação aparecerá sempre na frente do modal "Detalhes da recorrência".
- Em `duoo-app/server/routes/recurringRoutes.js` (`DELETE /:id` e `PUT /:id/toggle-status`), permitir que tanto o usuário quanto seu parceiro vinculado (`[req.user.id, user.partner_id]`) possam gerenciar/excluir a recorrência do casal.
