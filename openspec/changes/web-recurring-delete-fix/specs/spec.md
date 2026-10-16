# Especificação: Correção da Exclusão de Recorrência

## Requisitos Funcionais e Critérios de Aceite

### RF1: Exibição do Modal de Confirmação Acima do Modal de Detalhes
- **Dado** que o usuário abriu o modal "Detalhes da recorrência" em `RecurringRedesigned.jsx`,
- **Quando** clicar no botão "Excluir recorrência",
- **Então** o `ConfirmModal` ("Excluir recorrência") deve aparecer em primeiro plano (`z-[70]`) acima do modal de detalhes (ou fechar o modal de detalhes ao confirmar), permitindo clicar em "Excluir" ou "Cancelar" normalmente.

### RF2: Exclusão de Recorrências no Modo Conjunto (Casal)
- **Dado** um casal com contas vinculadas (`partner_id`),
- **Quando** qualquer um dos parceiros confirmar a exclusão de uma recorrência visível no painel,
- **Então** o endpoint `DELETE /api/recurring/:id` deve autorizar a exclusão para `[req.user.id, user.partner_id]`, reverter a transação na carteira (se já estava paga/recebida) e remover o registro sem erro `404`.
