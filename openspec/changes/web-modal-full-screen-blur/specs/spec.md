# Especificação: Blur em Tela Cheia nos Modais

## Requisitos Funcionais e Critérios de Aceite

### RF1: Renderização Global via React Portal (`document.body`)
- **Dado** qualquer modal aberto no sistema (`Modal`, `ConfirmModal`, `TransactionModalRedesigned`, `AchievementModal`, `NotificationModal`),
- **Quando** renderizado na tela (mesmo dentro de páginas com `animate-fade-in` ou `transform`),
- **Então** o overlay `fixed inset-0 bg-slate-900/60 backdrop-blur-sm` deve cobrir 100% da janela do navegador (incluindo Sidebar, Header superior e conteúdo principal).

### RF2: Hierarquia de Empilhamento (`z-index`)
- **Dado** que um modal principal (`z-50`) dispara um `ConfirmModal` de confirmação,
- **Quando** o `ConfirmModal` estiver aberto,
- **Então** o `ConfirmModal` deve ter `z-[70]` para nunca ser renderizado atrás de um `Modal` aberto.
