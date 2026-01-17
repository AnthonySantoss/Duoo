# Pluggy Integration - Configuração

## 📋 Pré-requisitos

1. Criar conta no Pluggy: https://dashboard.pluggy.ai/signup
2. Obter suas credenciais (Client ID e Client Secret)

## 🔧 Configuração

### 1. Configurar Variáveis de Ambiente

Copie o arquivo `.env.example` para `.env` no diretório `server/`:

```bash
cd server
cp .env.example .env
```

Edite o arquivo `.env` e adicione suas credenciais do Pluggy:

```env
PLUGGY_CLIENT_ID=seu_client_id_aqui
PLUGGY_CLIENT_SECRET=seu_client_secret_aqui
PLUGGY_API_URL=https://api.pluggy.ai
```

### 2. Executar Migração do Banco de Dados

Execute o script de migração para adicionar os campos necessários:

```bash
cd server
node migrate-pluggy.js
```

### 3. Reiniciar os Servidores

```bash
# Terminal 1 - Backend
cd server
npm start

# Terminal 2 - Frontend
cd client
npm run dev
```

## 🎯 Como Funciona

### Frontend

- **PluggyConnect** (`client/src/components/ui/PluggyConnect.jsx`): Componente React que carrega o widget do Pluggy
- **Statement** (`client/src/pages/Statement.jsx`): Página com integração do componente

### Backend

- **pluggyService** (`server/services/pluggyService.js`): Service para comunicação com API Pluggy
- **pluggyController** (`server/controllers/pluggyController.js`): Controller com endpoints
- **pluggyRoutes** (`server/routes/pluggyRoutes.js`): Rotas da API

### Endpoints

- `GET /api/pluggy/connect-token` - Gera token para conectar banco
- `POST /api/pluggy/sync-item` - Sincroniza contas e transações
- `GET /api/pluggy/connected-items` - Lista bancos conectados
- `DELETE /api/pluggy/disconnect/:itemId` - Remove conexão
- `POST /api/pluggy/webhook` - Recebe webhooks do Pluggy

## 🔄 Fluxo de Sincronização

1. Usuário clica em "Conectar Banco via Open Finance"
2. Backend gera `connectToken` usando API Pluggy
3. Widget Pluggy é carregado e usuário faz login no banco
4. Após sucesso, frontend envia `itemId` para backend
5. Backend busca todas as contas (`accounts`) do item
6. Para cada conta, cria/atualiza um `Wallet`
7. Backend busca transações de cada conta
8. Transações são salvas na tabela `Transactions` com categorização automática
9. Dados aparecem automaticamente no Dashboard e outras páginas

##  Categorização Automática

O sistema categoriza transações baseado em palavras-chave:

- **Alimentação**: mercado, supermercado, restaurante, ifood, uber eats
- **Lazer**: cinema, netflix, spotify
- **Moradia**: aluguel, condomínio, água, luz, gás
- **Contas**: conta, fatura, telefone, internet
- **Saúde**: farmácia, hospital, médico, plano de saúde
- **Transporte**: uber, 99, combustível, posto
- **Educação**: escola, faculdade, curso, livro
- **Outros**: demais transações

## 🔒 Segurança

- Credenciais armazenadas em variáveis de ambiente
- API Key do Pluggy renovada automaticamente a cada 23 horas
- Conexão criptografada (HTTPS)
- Webhook endpoint disponível para atualizações em tempo real

## 🐛 Troubleshooting

### Erro: "Failed to authenticate with Pluggy"
- Verifique se `PLUGGY_CLIENT_ID` e `PLUGGY_CLIENT_SECRET` estão corretos
- Confirme que as credenciais estão ativas no dashboard do Pluggy

### Widget não abre
- Verifique console do navegador
- Confirme que o endpoint `/api/pluggy/connect-token` está respondendo
- Teste em modo sandbox primeiro (`includeSandbox: true`)

### Transações não aparecem
- Verifique logs do servidor durante sincronização
- Confirme que o banco escolhido tem transações disponíveis
- Algumas instituições podem demorar para liberar dados

## 📚 Documentação Oficial

- Pluggy Docs: https://docs.pluggy.ai
- Connect Widget: https://docs.pluggy.ai/docs/connect-widget
- API Reference: https://docs.pluggy.ai/reference
