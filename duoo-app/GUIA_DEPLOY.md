# 🚀 Guia de Deploy Atualizado - Fly.io

## 📋 Checklist Pré-Deploy

Antes de fazer o deploy, verifique se você tem:

- ✅ Conta no [Fly.io](https://fly.io/)
- ✅ `flyctl` instalado
- ✅ Chaves do Pluggy (se usar integração bancária)
- ✅ JWT_SECRET definido

## 🔧 Passo a Passo Completo

### 1. Login no Fly.io

```bash
fly auth login
```

### 2. Verificar/Criar Volume (Banco de Dados)

O volume já deve existir se você já fez deploy antes. Para verificar:

```bash
fly volumes list
```

Se não existir, crie:

```bash
fly volumes create duoo_data -r gru -s 1
```

### 3. Configurar Variáveis de Ambiente

**IMPORTANTE:** Configure os secrets antes do deploy:

```bash
fly secrets set \
  JWT_SECRET="sua-chave-secreta-jwt-aqui" \
  PLUGGY_CLIENT_ID="seu-client-id-pluggy" \
  PLUGGY_CLIENT_SECRET="seu-client-secret-pluggy"
```

**Gerar JWT_SECRET seguro:**
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### 4. Build Local (Opcional - para testar)

Antes de fazer deploy, você pode testar o build localmente:

```bash
# Build do frontend
cd client
npm run build

# Verificar se gerou a pasta dist
ls -la dist/
```

### 5. Deploy

Na raiz do projeto (`/duoo-app`):

```bash
fly deploy
```

**O que acontece:**
1. ✅ Build do frontend (React + Vite + PWA)
2. ✅ Instalação das dependências do backend
3. ✅ Cópia dos arquivos para o container
4. ✅ Deploy na região `gru` (São Paulo)

### 6. Verificar Deploy

```bash
# Ver logs em tempo real
fly logs

# Abrir o app no navegador
fly open

# Ver status
fly status
```

## 🆕 Novidades Neste Deploy

### PWA (Progressive Web App)
✅ **Já configurado automaticamente!**

O build do Vite agora gera:
- Service Worker
- Manifesto PWA
- Ícones otimizados
- Cache inteligente

**Nenhuma configuração adicional necessária no Fly.io!**

### Notificações do Navegador
✅ **Funcionam automaticamente em HTTPS**

O Fly.io já fornece HTTPS, então as notificações funcionarão imediatamente após o deploy.

## 📱 Testando PWA em Produção

Após o deploy:

1. **Acesse o app** em `https://duoo-app.fly.dev` (ou seu domínio)
2. **No Android/Chrome:**
   - Aguarde o banner de instalação
   - OU menu (⋮) → "Instalar app"
3. **No iOS/Safari:**
   - Compartilhar → "Adicionar à Tela de Início"

## 🔄 Atualizações Futuras

Sempre que fizer mudanças no código:

```bash
# Na raiz do projeto
fly deploy
```

**O que é atualizado automaticamente:**
- ✅ Frontend (React)
- ✅ Backend (Node.js)
- ✅ Service Worker (PWA)
- ✅ Dependências

**O que NÃO é perdido:**
- ✅ Banco de dados (está no volume `/data`)
- ✅ Secrets (JWT_SECRET, etc)

## 🐛 Troubleshooting

### Deploy falha no build do frontend

**Erro:** `FATAL ERROR: Reached heap limit`

**Solução:** Aumentar memória temporariamente:

```bash
# No fly.toml, altere:
[[vm]]
  memory = '512mb'  # Era 256mb

# Depois do deploy bem-sucedido, pode voltar para 256mb
```

### Service Worker não atualiza

**Causa:** Cache do navegador

**Solução:**
```bash
# Forçar nova versão do SW
# O Vite PWA já faz isso automaticamente com hash nos arquivos
# Mas se precisar forçar:
fly deploy --force
```

### Notificações não funcionam

**Verificar:**
1. ✅ App está em HTTPS? (Fly.io fornece automaticamente)
2. ✅ Usuário deu permissão?
3. ✅ Navegador suporta? (Chrome, Edge, Safari 16.4+)

### Banco de dados sumiu após deploy

**Causa:** Volume não está montado

**Solução:**
```bash
# Verificar se volume existe
fly volumes list

# Verificar se está no fly.toml
cat fly.toml | grep -A 2 "\[mounts\]"

# Deve mostrar:
# [mounts]
#   source = "duoo_data"
#   destination = "/data"
```

## 📊 Monitoramento

### Ver logs em tempo real
```bash
fly logs
```

### Ver métricas
```bash
fly dashboard
```

### SSH no container (debug)
```bash
fly ssh console

# Dentro do container:
ls -la /data/              # Ver banco de dados
cat /app/server/.env       # Ver variáveis (não funciona, use secrets)
pm2 logs                   # Se usar PM2
```

## 💰 Custos

**Plano Gratuito do Fly.io:**
- ✅ 3 máquinas compartilhadas
- ✅ 256MB RAM (suficiente para este app)
- ✅ 3GB volume (usando 1GB)
- ✅ HTTPS incluído

**Este app cabe no plano gratuito!**

## 🔒 Segurança

### HTTPS
✅ Automático no Fly.io

### Secrets
✅ Nunca commite `.env` no Git
✅ Use `fly secrets set`

### Banco de Dados
✅ Volume criptografado
✅ Backup recomendado:

```bash
# Fazer backup do banco
fly sftp get /data/database.sqlite ./backup-$(date +%Y%m%d).sqlite

# Restaurar backup
fly sftp shell
put backup-20260213.sqlite /data/database.sqlite
```

## 🌐 Domínio Customizado (Opcional)

Se quiser usar seu próprio domínio:

```bash
# Adicionar domínio
fly certs add seudominio.com

# Configurar DNS (no seu provedor):
# Tipo: CNAME
# Nome: @
# Valor: duoo-app.fly.dev
```

## 📈 Escala (Futuro)

Se o app crescer:

```bash
# Aumentar memória
fly scale memory 512

# Adicionar mais máquinas
fly scale count 2

# Mudar região
fly regions add mia  # Miami
```

## 🎯 Comandos Úteis

```bash
# Ver todas as apps
fly apps list

# Ver informações da app
fly info

# Ver secrets configurados
fly secrets list

# Remover secret
fly secrets unset NOME_DO_SECRET

# Reiniciar app
fly apps restart duoo-app

# Ver custos
fly dashboard billing
```

## ✅ Checklist Final

Antes de considerar o deploy completo:

- [ ] App abre em `https://duoo-app.fly.dev`
- [ ] Login funciona
- [ ] Transações são salvas
- [ ] PWA pode ser instalado
- [ ] Notificações funcionam (após dar permissão)
- [ ] Ícone aparece correto quando instalado
- [ ] Service Worker está registrado (DevTools → Application)
- [ ] Banco de dados persiste após reiniciar app

## 🎉 Pronto!

Seu app está no ar com:
- ✅ Frontend React otimizado
- ✅ Backend Node.js
- ✅ PWA instalável
- ✅ Notificações push
- ✅ HTTPS
- ✅ Banco SQLite persistente

**URL:** `https://duoo-app.fly.dev`

---

## 📞 Suporte

**Fly.io:**
- Docs: https://fly.io/docs
- Community: https://community.fly.io

**Problemas no deploy?**
```bash
fly logs
```
E verifique os erros!
