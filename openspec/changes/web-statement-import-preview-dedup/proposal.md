# Proposta: Preview e Deduplicação Inteligente na Importação de Extrato (Web)

## 1. Problema e Contexto
Na página de Extrato (`Statement.jsx`), ao importar um arquivo OFX ou CSV, os lançamentos são salvos diretamente no banco de dados sem exibir uma etapa de pré-visualização (preview) para conferência do usuário. Além disso, a deduplicação existente no backend é rígida e limitada.

## 2. Diagnóstico da Deduplicação Atual e Causas Raízes
1. **Fluxo sem preview**: O frontend envia o arquivo direto para `POST /api/import/upload`, que faz o parse e insere imediatamente via `Transaction.create` dentro de uma transação SQLite.
2. **Deduplicação frágil hoje**:
   - Já existe um `Transaction.findOne` em `importController.js`, mas ele compara igualdade estrita de `title`, `amount`, `date`, `wallet_id` e `user_id`.
   - **Ignora o `FITID` do OFX**: O model `Transaction` já possui a coluna `source_external_id`, mas o parser OFX nunca extrai a tag `<FITID>` para deduplicação exata.
   - **Divergência de sinal no CSV**: No CSV, o `existing` é consultado **antes** de normalizar o sinal negativo das despesas (`finalAmount`), comparando valores positivos com valores negativos já salvos no banco e falhando em detectar duplicatas.
   - **Variações de texto/espaços**: Não há normalização (`trim`, colapso de espaços múltiplos, case-insensitive) no `title`.
   - **Falta de decisão pelo usuário**: Compras legítimas de mesmo valor no mesmo estabelecimento e mesmo dia são descartadas silenciosamente sem que o usuário possa optar por importá-las.

## 3. Escopo da Mudança
- Dividir o fluxo em duas etapas no backend (seguindo o padrão já existente em `creditCardImportController.js`):
  - `POST /api/import/preview`: faz o parse de OFX/CSV, normaliza valores e títulos, extrai `FITID` (quando OFX), verifica possíveis duplicatas no banco e retorna a lista de itens com a flag `isDuplicate` e categoria sugerida.
  - `POST /api/import/confirm`: recebe os itens revisados/selecionados pelo usuário, grava no banco preenchendo `source_external_id` e atualiza o saldo da carteira.
- Atualizar o modal em `Statement.jsx` para exibir a tabela de preview permitindo marcar/desmarcar lançamentos (com duplicatas vindo desmarcadas por padrão e sinalizadas visualmente), editar categoria/título se necessário e confirmar a importação.
