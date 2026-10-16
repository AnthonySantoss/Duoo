# Especificação: Componentes Customizados `Select` e `Checkbox`

## Requisitos Funcionais e Critérios de Aceite

### RF1: Componente Dropdown Customizado (`<Select />`)
- **Dado** qualquer campo de seleção de opções no sistema web,
- **Quando** o usuário clicar no seletor,
- **Então** deve abrir um menu flutuante estilizado no padrão Duoo (bordas arredondadas `rounded-xl`, sombra suave, suporte a Light/Dark mode, ícone `ChevronDown` rotacionando ao abrir e `Check` esmeralda no item ativo), sem acionar o menu nativo do sistema operacional.

### RF2: Posicionamento Seguro em Modais e Tabelas com Scroll (Portal)
- **Dado** um `<Select />` dentro de um modal com `overflow-y-auto` ou tabela de preview (`Statement.jsx`, `InvestmentsRedesigned.jsx`, `TransactionModalRedesigned.jsx`),
- **Quando** o menu for aberto,
- **Então** a lista de opções deve ser renderizada via `createPortal(document.body)` posicionada exatamente abaixo (ou acima, se não houver espaço inferior na tela) do botão gatilho, sem ser cortada pelo scroll do modal/tabela.

### RF3: Compatibilidade Drop-in com `<select>`
- **Dado** o uso existente de `<select value={...} onChange={e => ...}>` com tags `<option>` ou `<optgroup>` nas 12 páginas/componentes do sistema,
- **Quando** substituído por `<Select>`,
- **Então** deve aceitar tanto `<option>` filhos quanto a prop `options`, disparar `onChange({ target: { value, name } })` mantendo 100% de compatibilidade com os handlers existentes, e respeitar `disabled`, `required` e `className`.

### RF4: Componente `<Checkbox />` Customizado
- **Dado** um campo de marcação booleana (como seleção de transações no preview de extrato/fatura, recorrência, metas, desafios),
- **Quando** renderizado e clicado pelo usuário,
- **Então** deve exibir uma caixa customizada (`w-5 h-5 rounded-md border-2`), com fundo `bg-emerald-500 border-emerald-500 text-white` e ícone `<Check>` animado quando `checked={true}`, preservando acessibilidade (`sr-only` input nativo por baixo) e compatibilidade com `onChange={(e) => ...}`.

### RF5: Adoção Global no Sistema Web
- **Dado** todas as 12 telas e modais do cliente web que utilizam `<select>` ou `<input type="checkbox">`,
- **Quando** a atualização for concluída,
- **Então** nenhum `<select>` ou checkbox padrão do navegador deve restar sem estilização customizada nessas telas.
