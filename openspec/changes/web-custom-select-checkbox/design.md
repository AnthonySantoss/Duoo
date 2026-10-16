# Design Técnico: Componentes `Select` e `Checkbox` Customizados

## 1. Arquitetura do `<Select />` (`duoo-app/client/src/components/ui/Select.jsx`)
- **Extração de opções**:
  - Suporta `options` via array (`[{ value, label, disabled }]`) OU leitura recursiva de `React.Children` para suportar `<option>` e `<optgroup>` diretamente (permitindo substituir `<select>` por `<Select>` sem reescrever a lógica de cada página).
- **Renderização via Portal (`createPortal`)**:
  - Ao abrir, calcula `triggerRef.current.getBoundingClientRect()`.
  - Se o espaço abaixo na viewport for menor que `240px` e houver mais espaço acima, abre para cima (`bottom`); caso contrário, abre para baixo (`top`).
  - Fecha automaticamente ao clicar fora (`mousedown`), pressionar `Escape` ou rolar/redimensionar a janela.
- **Variantes de Tamanho / Estilo**:
  - Respeita `className` passado pela página, mas oferece um visual base consistente (`bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 rounded-xl`).
  - Detecta tamanhos compactos (`size="sm"` ou quando `className` contém `text-xs`) para uso enxuto dentro de tabelas de preview.

## 2. Arquitetura do `<Checkbox />` (`duoo-app/client/src/components/ui/Checkbox.jsx`)
- Estrutura com `<label className="inline-flex items-center cursor-pointer select-none">` (ou `div` quando dentro de outro `<label>` para evitar `<label>` aninhado inválido!).
- **Importante**: Como vários lugares no código já envolvem o `<input type="checkbox">` dentro de um `<label>`, o componente `Checkbox` deve usar um `<span className="relative inline-flex items-center justify-center ...">` contendo o `<input type="checkbox" className="peer sr-only" ... />` e a caixa visual estilizada (`w-5 h-5 rounded-md border-2 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 peer-checked:bg-emerald-500 peer-checked:border-emerald-500 transition-all`), com o ícone `<Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />` visível quando `checked`. Assim funciona perfeitamente tanto sozinho quanto dentro de um `<label>` existente!

## 3. Substituição nas Páginas e Modais
- Substituir `<select>` por `<Select>` e `<input type="checkbox">` (exceto toggles que já são switches customizados `sr-only peer`) por `<Checkbox>` nos 12 arquivos identificados.
