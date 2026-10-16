# Design Técnico: Blur em Tela Cheia nos Modais

## 1. Portal em Todos os Modais de UI (`duoo-app/client/src/components/ui/`)
- Em `Modal.jsx`, `ConfirmModal.jsx`, `TransactionModalRedesigned.jsx`, `AchievementModal.jsx` e `NotificationModal.jsx`:
  - Importar `{ createPortal } from 'react-dom'`.
  - Envolver o JSX retornado em `createPortal(..., document.body)`.
- Em `ConfirmModal.jsx`:
  - Elevar `z-50` para `z-[70]`.
- Em `index.css`:
  - No `@keyframes fadeIn`, usar `to { opacity: 1; transform: none; }` para evitar a criação desnecessária de *stacking context / containing block* após o término da animação.
