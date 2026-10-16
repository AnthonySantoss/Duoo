# Proposta: Componentes Customizados de Seletor (`Select` e `Checkbox`) para o Sistema Web

## 1. Problema e Contexto
Os elementos nativos do navegador (`<select>` e `<input type="checkbox">`) têm aparência inconsistente entre sistemas operacionais/navegadores, menu suspenso nativo rústico que não respeita o tema arredondado/moderno do Duoo (especialmente em Dark Mode e no mobile), e destoa da identidade visual `emerald-500` / `slate-900` do sistema.

## 2. Escopo da Mudança
1. **Criar `duoo-app/client/src/components/ui/Select.jsx`**:
   - Dropdown 100% customizado (sem usar o menu nativo do OS), com suporte a:
     - Modo formulário padrão (`size="md"`, `rounded-xl`, `px-4 py-3`) e modo compacto para tabelas/filtros (`size="sm"`, `rounded-lg`, `px-2.5 py-1.5 text-xs`).
     - Renderização do menu flutuante via React Portal (`createPortal`) ou posicionamento inteligente para nunca ser cortado por containers com `overflow-hidden` / `overflow-y-auto` (como dentro de tabelas e modais de preview).
     - Suporte tanto à prop `options={[{ value, label, disabled }]}` quanto à passagem de filhos `<option value="...">...</option>` (extraindo automaticamente as opções de `children`), facilitando a substituição drop-in de `<select>` por `<Select>` em todas as páginas sem quebrar a lógica de `onChange={(e) => ...}` (emitindo um evento sintético compatível `{ target: { value, name } }`).
     - Destaque visual da opção selecionada com ícone `<Check />` e cor `emerald-500`, suporte a teclado (`Escape`, setas, `Enter`), fechamento ao clicar fora e suporte completo a Dark Mode.
2. **Criar `duoo-app/client/src/components/ui/Checkbox.jsx`**:
   - Checkbox customizado e acessível com visual moderno (`rounded-md`, transição suave, fundo `bg-emerald-500 border-emerald-500` quando marcado com ícone `<Check strokeWidth={3} />` branco, estado `indeterminate` opcional e suporte a `label` opcional), mantendo compatibilidade total com `checked`, `onChange` e `disabled`.
3. **Substituir `<select>` e `<input type="checkbox">` em todas as páginas e modais do sistema web**:
   - `Statement.jsx` (seletores de carteira, mês, ano e categorias da tabela/cards de preview + checkboxes do preview)
   - `TransactionModalRedesigned.jsx`
   - `NotificationSettings.jsx`
   - `TransactionsRedesigned.jsx`
   - `OverviewRedesigned.jsx`
   - `WalletsRedesigned.jsx`
   - `InvestmentsRedesigned.jsx`
   - `SimulationRedesigned.jsx`
   - `GoalsRedesigned.jsx`
   - `BankRedesigned.jsx`
   - `RecurringRedesigned.jsx`
   - `ChallengesRedesigned.jsx`
