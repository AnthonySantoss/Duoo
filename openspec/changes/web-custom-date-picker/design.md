# Design Técnico: Componente `DatePicker` Customizado

## 1. Arquitetura do `<DatePicker />` (`duoo-app/client/src/components/ui/DatePicker.jsx`)
- **Props suportadas**: `value` (`YYYY-MM-DD`), `onChange`, `name`, `required`, `disabled`, `placeholder`, `className`, `min`, `max`.
- **Posicionamento via Portal (`createPortal`)**:
  - Calcula `getBoundingClientRect()` do gatilho. Se não houver espaço suficiente abaixo (`< 340px`), abre para cima; ajusta horizontalmente para não sair da tela no mobile.
  - `z-[80]` para ficar acima de qualquer `Modal` (`z-50`).
- **Calendário**:
  - Cabeçalho com mês/ano em português (`outubro de 2026`), seletor rápido de mês/ano ou botões de mês anterior/próximo.
  - Dias da semana: `['D', 'S', 'T', 'Q', 'Q', 'S', 'S']`.
  - Rodapé com botão `"Limpar"` (se `!required`) e botão `"Hoje"` (que seleciona a data local atual `YYYY-MM-DD` e fecha o popover).
