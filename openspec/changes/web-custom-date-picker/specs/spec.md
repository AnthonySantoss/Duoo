# Especificação: Componente `DatePicker` Customizado

## Requisitos Funcionais e Critérios de Aceite

### RF1: Calendário Visual Customizado no Padrão Duoo
- **Dado** qualquer campo de seleção de data no sistema web,
- **Quando** o usuário clicar no campo,
- **Então** deve abrir um calendário customizado via Portal (`rounded-2xl`, sombra suave, suporte a Light/Dark mode, dia selecionado em `bg-emerald-500 text-white`, atalhos "Hoje" e "Limpar"), sem acionar o calendário nativo do navegador.

### RF2: Exibição `DD/MM/AAAA` e Valor ISO `YYYY-MM-DD`
- **Dado** um valor `value="2026-10-16"` passado ao `<DatePicker />`,
- **Quando** renderizado fechado,
- **Então** deve exibir `16/10/2026` (ou placeholder `"dd/mm/aaaa"` quando vazio) e, ao selecionar um dia, emitir `onChange({ target: { value: 'YYYY-MM-DD', name } })`.

### RF3: Substituição Completa de `<input type="date">`
- **Dado** todos os 6 arquivos que usam `<input type="date">` (`TransactionModalRedesigned.jsx`, `TransactionsRedesigned.jsx`, `InvestmentsRedesigned.jsx`, `RecurringRedesigned.jsx`, `GoalsRedesigned.jsx`, `Loans.jsx`),
- **Quando** a mudança for aplicada,
- **Então** todos devem utilizar `<DatePicker />`.
