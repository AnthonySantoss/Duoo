# Especificação: Preview e Deduplicação na Importação de Extrato

## Requisitos Funcionais e Critérios de Aceite

### RF1: Etapa de Preview antes da Persistência
- **Dado** que o usuário seleciona uma carteira e envia um arquivo `.ofx` ou `.csv` no modal de Importar Extrato,
- **Quando** o arquivo for processado pelo servidor em `POST /api/import/preview`,
- **Então** nenhum lançamento deve ser salvo ainda no banco de dados, e o frontend deve exibir uma lista/tabela de pré-visualização com data, descrição, categoria sugerida, valor, tipo (entrada/saída) e status de duplicidade.

### RF2: Deduplicação Inteligente (OFX FITID + Heurística Normalizada)
- **Dado** um conjunto de transações extraídas de um arquivo OFX ou CSV,
- **Quando** o backend verificar duplicidade contra o banco de dados na carteira selecionada,
- **Então** uma transação deve ser marcada como `isDuplicate: true` se:
  1. Possuir `source_external_id` (`FITID` do OFX) idêntico a um lançamento existente na mesma carteira; OU
  2. Possuir mesma `date`, mesmo `amount` (após normalização de sinal `-` para `expense` e `+` para `income`) e `title` equivalente (ignorando maiúsculas/minúsculas e espaços extras).

### RF3: Seleção e Confirmação pelo Usuário
- **Dado** que a tabela de preview está visível no modal,
- **Quando** houver transações identificadas como duplicadas (`isDuplicate: true`),
- **Então** elas devem vir desmarcadas por padrão com um aviso visual ("Possível duplicata"), permitindo que o usuário marque ou desmarque qualquer item individualmente e edite a categoria antes de clicar em "Confirmar Importação".

### RF4: Persistência Consistente e Atualização de Saldo
- **Dado** que o usuário revisou os itens e clicou em "Confirmar Importação",
- **Quando** `POST /api/import/confirm` for executado com os itens selecionados,
- **Então** apenas os itens selecionados devem ser inseridos na tabela `Transactions` (incluindo `source_external_id`), o saldo da `Wallet` deve ser atualizado pela soma líquida dos itens importados em uma transação atômica, e o resumo de importados/ignorados deve ser retornado.

### RF5: Padrão Visual de Botões e Responsividade Mobile no Preview
- **Dado** que o usuário abre a etapa de preview em qualquer dispositivo (desktop ou mobile),
- **Quando** o modal de pré-visualização for exibido,
- **Então**:
  1. Os botões de ação devem utilizar o componente `<Button>` padrão do sistema (`variant="primary"` com `bg-blue-900 text-white` para confirmar e `variant="secondary"` com `bg-slate-100 text-slate-900` para voltar) e cores de destaque alinhadas ao tema (`blue-900` em vez de `emerald-600`).
  2. Em telas mobile (`< 768px`), a listagem de itens do preview deve ser exibida em formato de cards compactos (`md:hidden`), ocultando a tabela de 5 colunas (`hidden md:block`), com botões de rodapé empilhados (`flex-col-reverse sm:flex-row`) e container do `Modal` limitado à altura da tela (`max-h-[90vh] flex flex-col` com corpo `overflow-y-auto`).
