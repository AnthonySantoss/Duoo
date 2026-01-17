# 🔑 Cole suas chaves do Pluggy aqui

Após obter suas credenciais no dashboard do Pluggy (https://dashboard.pluggy.ai), 
copie e cole as informações abaixo no arquivo `/server/.env`

---

## Suas Credenciais Pluggy:

PLUGGY_CLIENT_ID=
PLUGGY_CLIENT_SECRET=

---

## Instruções:

1. Acesse: https://dashboard.pluggy.ai/login
2. Faça login ou crie sua conta
3. Vá em "API Keys" ou "Settings"
4. Copie seu CLIENT_ID e CLIENT_SECRET
5. Cole os valores acima
6. Copie o conteúdo deste arquivo para o arquivo `/server/.env`

---

## Arquivo .env completo deve ficar assim:

```env
# Database
DATABASE_URL=./database.sqlite

# JWT
JWT_SECRET=your_jwt_secret_key_here

# Pluggy API Keys
PLUGGY_CLIENT_ID=sua_chave_aqui
PLUGGY_CLIENT_SECRET=seu_secret_aqui
PLUGGY_API_URL=https://api.pluggy.ai

# Google OAuth (optional)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
```

---

## Próximos Passos:

Após configurar o .env:

1. Execute a migração:
   ```bash
   cd server
   node migrate-pluggy.js
   ```

2. Reinicie o servidor:
   ```bash
   npm start
   ```

3. Teste a integração no frontend na página "Extrato"!
