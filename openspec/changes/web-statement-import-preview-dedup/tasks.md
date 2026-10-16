# Tarefas: Preview e Deduplicação na Importação de Extrato

- [x] **Tarefa 1**: Em `duoo-app/server/controllers/importController.js`, atualizar `parseOFXSimple` para extrair `<FITID>`, normalizar `finalAmount` e `title` antes da verificação de duplicidade, e implementar `previewStatement` e `confirmStatement`.
- [x] **Tarefa 2**: Em `duoo-app/server/routes/importRoutes.js`, registrar as rotas `POST /preview` (com `upload.single('file')`) e `POST /confirm` (mantendo compatibilidade ou substituindo `/upload`).
- [x] **Tarefa 3**: Em `duoo-app/client/src/pages/Statement.jsx`, atualizar o modal de importação para exibir a etapa de preview com resumo de duplicados, checkboxes individuais (duplicados desmarcados por padrão), edição de categoria e confirmação via `POST /import/confirm`.
- [x] **Tarefa 4**: Ajustar `duoo-app/client/src/pages/Statement.jsx` e `duoo-app/client/src/components/ui/Modal.jsx` para usar o componente `<Button>` e a paleta padrão do sistema (`blue-900` / `slate-100`) e tornar o preview 100% responsivo no mobile (cards em `< md`, tabela em `>= md`, rodapé empilhado no mobile e modal com `max-h-[90vh]` e scroll interno).
