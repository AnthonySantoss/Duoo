# Proposta: Blur e Overlay dos Pop-ups / Modais Cobrindo a Tela Inteira

## 1. Problema e Contexto
Ao abrir um modal (como o `ConfirmModal` de "Excluir transação" em `TransactionsRedesigned.jsx`), o fundo escuro com desfoque (`backdrop-blur-sm`) fica restrito apenas à área interna da lista de transações, deixando a Sidebar lateral e o Header superior ("Transações / Conjunto") sem blur e fora do overlay.

## 2. Causa Raiz
Em `TransactionsRedesigned.jsx` (linha 160), o container tem a classe `animate-fade-in` (`index.css:202-215`), cuja keyframe final mantém `transform: translateY(0)`. Pela especificação do CSS, qualquer elemento ancestral com `transform` diferente de `none` cria um novo *containing block* para descendentes com `position: fixed`. Como `ConfirmModal.jsx`, `Modal.jsx` e outros modais são renderizados diretamente na árvore do componente sem `createPortal(..., document.body)`, o `fixed inset-0` fica preso ao container animado em vez de cobrir o `viewport` inteiro.

## 3. Escopo da Mudança
- Utilizar `createPortal(..., document.body)` em todos os componentes de modal do sistema (`Modal.jsx`, `ConfirmModal.jsx`, `TransactionModalRedesigned.jsx`, `AchievementModal.jsx`, `NotificationModal.jsx`).
- Definir hierarquia clara de `z-index`: `z-50` para modais principais (`Modal`, `TransactionModalRedesigned`, etc.) e `z-[70]` para `ConfirmModal` (garantindo que confirmações abertas a partir de outro modal fiquem sempre no topo).
