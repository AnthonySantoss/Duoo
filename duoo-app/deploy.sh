#!/bin/bash

# Script de Deploy Automatizado - Duoo App
# Uso: ./deploy.sh

set -e  # Para na primeira falha

echo "🚀 Iniciando deploy do Duoo App no Fly.io..."
echo ""

# Cores para output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Verificar se flyctl está instalado
if ! command -v fly &> /dev/null; then
    echo -e "${RED}❌ flyctl não está instalado!${NC}"
    echo "Instale com: curl -L https://fly.io/install.sh | sh"
    exit 1
fi

echo -e "${GREEN}✅ flyctl encontrado${NC}"

# Verificar se está logado
if ! fly auth whoami &> /dev/null; then
    echo -e "${YELLOW}⚠️  Você não está logado no Fly.io${NC}"
    echo "Executando login..."
    fly auth login
fi

echo -e "${GREEN}✅ Autenticado no Fly.io${NC}"

# Verificar se o volume existe
echo ""
echo "📦 Verificando volume de dados..."
if ! fly volumes list | grep -q "duoo_data"; then
    echo -e "${YELLOW}⚠️  Volume não encontrado. Criando...${NC}"
    fly volumes create duoo_data -r gru -s 1
    echo -e "${GREEN}✅ Volume criado${NC}"
else
    echo -e "${GREEN}✅ Volume já existe${NC}"
fi

# Verificar secrets
echo ""
echo "🔐 Verificando secrets..."
if ! fly secrets list | grep -q "JWT_SECRET"; then
    echo -e "${YELLOW}⚠️  JWT_SECRET não configurado!${NC}"
    echo ""
    echo "Gerando JWT_SECRET automaticamente..."
    JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")
    
    echo "Configurando secrets..."
    echo "Por favor, insira suas credenciais do Pluggy (ou deixe em branco para pular):"
    read -p "PLUGGY_CLIENT_ID: " PLUGGY_CLIENT_ID
    read -p "PLUGGY_CLIENT_SECRET: " PLUGGY_CLIENT_SECRET
    
    if [ -z "$PLUGGY_CLIENT_ID" ]; then
        fly secrets set JWT_SECRET="$JWT_SECRET"
    else
        fly secrets set \
            JWT_SECRET="$JWT_SECRET" \
            PLUGGY_CLIENT_ID="$PLUGGY_CLIENT_ID" \
            PLUGGY_CLIENT_SECRET="$PLUGGY_CLIENT_SECRET"
    fi
    
    echo -e "${GREEN}✅ Secrets configurados${NC}"
else
    echo -e "${GREEN}✅ Secrets já configurados${NC}"
fi

# Build local do frontend (opcional, para verificar erros antes)
echo ""
echo "🔨 Testando build do frontend..."
cd client
if npm run build; then
    echo -e "${GREEN}✅ Build do frontend OK${NC}"
    cd ..
else
    echo -e "${RED}❌ Erro no build do frontend!${NC}"
    echo "Corrija os erros antes de fazer deploy."
    cd ..
    exit 1
fi

# Deploy
echo ""
echo "🚀 Iniciando deploy..."
echo -e "${YELLOW}Isso pode levar alguns minutos...${NC}"
echo ""

if fly deploy; then
    echo ""
    echo -e "${GREEN}✅ Deploy concluído com sucesso!${NC}"
    echo ""
    echo "📱 Seu app está disponível em:"
    fly status | grep "Hostname" || echo "https://duoo-app.fly.dev"
    echo ""
    echo "🔍 Para ver os logs:"
    echo "   fly logs"
    echo ""
    echo "🌐 Para abrir no navegador:"
    echo "   fly open"
    echo ""
    echo "📊 Para ver o dashboard:"
    echo "   fly dashboard"
else
    echo ""
    echo -e "${RED}❌ Deploy falhou!${NC}"
    echo ""
    echo "Ver logs de erro:"
    echo "   fly logs"
    echo ""
    echo "Possíveis soluções:"
    echo "1. Verificar se há erros no código"
    echo "2. Aumentar memória temporariamente (fly.toml → memory = '512mb')"
    echo "3. Verificar secrets: fly secrets list"
    exit 1
fi
