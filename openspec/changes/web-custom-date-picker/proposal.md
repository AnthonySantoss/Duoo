# Proposta: Componente de Calendário Customizado (`DatePicker`) para o Sistema Web

## 1. Problema e Contexto
Os campos de data utilizam `<input type="date">` nativo do navegador (como visto no modal "Editar transação"), que abre o calendário padrão quadrado/azul do sistema operacional, destoando completamente da identidade visual moderna em `emerald-500` / `rounded-xl` do Duoo.

## 2. Locais Afetados
Foram identificados 9 pontos usando `<input type="date">` em 6 arquivos:
1. `duoo-app/client/src/components/ui/TransactionModalRedesigned.jsx` (linha 269)
2. `duoo-app/client/src/pages/TransactionsRedesigned.jsx` (linhas 248 e 255 — filtros de data inicial/final)
3. `duoo-app/client/src/pages/InvestmentsRedesigned.jsx` (linha 442 — data da compra no cartão)
4. `duoo-app/client/src/pages/RecurringRedesigned.jsx` (linha 294 — data de vencimento)
5. `duoo-app/client/src/pages/GoalsRedesigned.jsx` (linha 473 — prazo da meta)
6. `duoo-app/client/src/pages/Loans.jsx` (linhas 237, 294 e 349 — data do empréstimo/vencimento)

## 3. Escopo da Mudança
- Criar o componente `duoo-app/client/src/components/ui/DatePicker.jsx`:
  - Renderiza um botão/input estilizado exibindo a data no formato brasileiro (`DD/MM/AAAA`) com ícone `<Calendar />` em esmeralda.
  - Ao clicar, abre um popover de calendário customizado via **React Portal** (`createPortal(..., document.body)`) com `z-[80]`, navegação entre meses e anos (`ChevronLeft` / `ChevronRight`), grade de dias da semana (`D S T Q Q S S`), dia selecionado em `bg-emerald-500 text-white font-bold`, dia de hoje destacado, e botões rápidos **"Limpar"** e **"Hoje"** no rodapé.
  - Mantém 100% de compatibilidade com o formato ISO `YYYY-MM-DD` no `value` e dispara `onChange({ target: { value: 'YYYY-MM-DD', name } })`.
- Substituir todos os 9 `<input type="date">` pelo novo `<DatePicker />`.
