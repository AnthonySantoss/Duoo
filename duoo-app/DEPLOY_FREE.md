# Deploy do Duoo com serviços gratuitos

Arquitetura recomendada para o MVP:

```text
Frontend React/Vite -> Vercel ou Cloudflare Pages
Backend Express    -> Render Web Service
Banco de dados     -> Supabase PostgreSQL
```

## 1. Supabase

Crie um projeto no Supabase e copie a connection string PostgreSQL. Ela será usada
como `DATABASE_URL` no Render. O backend reconhece `DATABASE_URL` automaticamente;
sem essa variável, o desenvolvimento local continua usando SQLite.

O schema inicial é criado pelo Sequelize na primeira inicialização do backend.
As migrações antigas específicas de SQLite são ignoradas quando PostgreSQL é detectado.

## 2. Render

O arquivo `render.yaml` na raiz do repositório já aponta o serviço para
`duoo-app/server` e usa:

```text
Build: npm ci
Start: npm start
Health check: /health
```

Configure no Render:

```env
DATABASE_URL=<connection-string-do-supabase>
CORS_ORIGINS=https://<dominio-do-frontend>
JWT_SECRET=<segredo-com-no-minimo-32-caracteres>
```

As variáveis `VAPID_*` são opcionais e só devem ser configuradas se o Web Push for
utilizado.

O Render Free pode suspender o Web Service após inatividade. Por isso, essa
configuração é adequada para MVP e testes, não para garantir captura instantânea
de notificações bancárias em produção.

## 3. Frontend

No Vercel ou Cloudflare Pages, use `duoo-app/client` como diretório do projeto:

```text
Build command: npm run build
Output directory: dist
```

Configure a variável de ambiente:

```env
VITE_API_URL=https://<nome-do-servico>.onrender.com/api
```

Depois de publicar o frontend, atualize `CORS_ORIGINS` no Render com a URL exata
do frontend e faça um novo deploy do backend.

## Desenvolvimento local

Não configure `DATABASE_URL` localmente se quiser continuar usando o banco SQLite
existente. O proxy do Vite continua encaminhando `/api` para `localhost:5000`.
