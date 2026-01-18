# Guia de Deploy no Fly.io (Recomendado)

Preparei todos os arquivos (`Dockerfile`, `.dockerignore`, configurações do app) para que você possa subir sua aplicação no **Fly.io** facilmente, mantendo o banco de dados SQLite.

## Pré-requisitos
1. Crie uma conta no [Fly.io](https://fly.io/).
2. Instale a ferramenta de linha de comando `flyctl`:
   - **Linux/Mac:** `curl -L https://fly.io/install.sh | sh`
   - **Windows:** `pwsh -Command "iwr https://fly.io/install.ps1 -useb | iex"`

## Passo a Passo

### 1. Login
No terminal, execute:
```bash
fly auth login
```

### 2. Inicializar o App
Na pasta raiz do projeto (`/duoo-app`), execute:
```bash
fly launch
```
- O sistema vai detectar o `Dockerfile`.
- **App Name:** Escolha um nome único (ex: `duoo-app-seu-nome`).
- **Region:** Escolha `Sao Paulo (gru)` para menor latência.
- **Database:** Responda **NÃO** (pois usaremos SQLite).
- **Redis:** N/A.
- **Deploy now?** Responda **NÃO** (precisamos configurar o volume antes).

### 3. Criar Volume (Para salvar o SQLite)
O comando `fly launch` criou um arquivo `fly.toml`. Precisamos criar o volume de armazenamento para que o banco de dados não suma ao reiniciar.

Execute:
```bash
fly volumes create duoo_data -r gru -s 1
```
*(Isso cria um volume de 1GB em São Paulo)*.

### 4. Configurar Volume no `fly.toml`
Abra o arquivo `fly.toml` gerado e adicione este bloco no final (ou edite se já existir `[mounts]`):

```toml
[mounts]
  source = "duoo_data"
  destination = "/data"
```

### 5. Configurar Segredos (Chaves da API)
Antes de subir, precisamos enviar as chaves de segurança (que estão no seu `.env`) para o Fly.io.

Execute este comando no terminal (substituindo pelos valores reais que estão no seu arquivo `.env`):

```bash
fly secrets set JWT_SECRET="crie-uma-senha-secreta-aqui" \
  PLUGGY_CLIENT_ID="valor-que-esta-no-seu-env" \
  PLUGGY_CLIENT_SECRET="valor-que-esta-no-seu-env"
```

### 6. Deploy Final
Agora sim, suba a aplicação:
```bash
fly deploy
```

## Como funciona
- O `Dockerfile` que criei compila o Frontend (React) e configura o Backend (Node).
- O servidor rodará na porta 8080.
- O banco de dados será salvo em `/data/database.sqlite` (no volume persistente).

## Atualizações Futuras
Quando você fizer alterações no código, basta rodar:
```bash
fly deploy
```

---

## Migração para Oracle/Outros (Futuro)
Se um dia quiser sair do Fly.io:
1. Baixe seu banco: `fly sftp get /data/database.sqlite`.
2. O arquivo `database.sqlite` contém todos os seus dados. Basta levá-lo para o novo servidor.
