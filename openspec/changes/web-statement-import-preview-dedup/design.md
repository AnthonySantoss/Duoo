# Design Técnico: Preview e Deduplicação na Importação de Extrato

## 1. Backend (`importController.js` e `importRoutes.js`)
- **Parser OFX (`parseOFXSimple`)**:
  - Extrair a tag `<FITID>(.*?)(?:<|\r|\n)` de cada bloco `<STMTTRN>` e armazenar em `external_id`.
- **Normalização antes da checagem de duplicidade**:
  - Calcular `finalAmount` (negativo para `expense`, positivo para `income`) e normalizar `title` (`title.trim().replace(/\s+/g, ' ')`) **antes** de consultar o banco.
- **Endpoint `POST /api/import/preview`**:
  - Recebe `file` (via `multer`) e `wallet_id`.
  - Faz o parse (OFX ou CSV), aplica `categorizeTransaction(title)`, normaliza valores e consulta transações existentes na carteira no intervalo de datas do arquivo.
  - Marca cada item com `isDuplicate: boolean` e `duplicateReason` (`'fitid'` | `'same_date_amount_title'` | `null`).
  - Remove o arquivo temporário e retorna `{ items, summary: { total, newCount, duplicateCount } }`.
- **Endpoint `POST /api/import/confirm`**:
  - Recebe `{ wallet_id, transactions: [...] }` contendo os itens confirmados pelo usuário.
  - Em `sequelize.transaction()`, insere os registros preenchendo `source_external_id: item.external_id || null` e atualiza `wallet.balance`.

## 2. Frontend (`Statement.jsx`)
- Expandir o modal de importação em duas etapas (`step: 'upload' | 'preview'`):
  - **Etapa 1 (`upload`)**: Seleção de carteira e upload do arquivo `.ofx` / `.csv`. Chama `api.post('/import/preview', formData)`.
  - **Etapa 2 (`preview`)**: Exibe resumo (Total lido, Novos, Duplicados detectados) e lista rolável com checkbox por linha, badge de "Duplicado", seletor de categoria editável, data e valor formatado.
  - Botão "Confirmar Importação (N selecionados)" envia `api.post('/import/confirm', { wallet_id, transactions: selectedItems })`.
