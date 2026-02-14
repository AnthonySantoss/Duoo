# 📱 PWA (Progressive Web App) - Duoo

## 🎯 Visão Geral

O Duoo agora é um **Progressive Web App (PWA)** completo, permitindo que usuários instalem o aplicativo em seus dispositivos Android e iOS como se fosse um app nativo.

## ✨ Funcionalidades PWA Implementadas

### 1. **Instalação como App Nativo**
- ✅ Ícone na tela inicial do dispositivo
- ✅ Splash screen personalizada
- ✅ Execução em modo standalone (sem barra de navegador)
- ✅ Suporte para Android e iOS

### 2. **Experiência Offline**
- ✅ Service Worker com cache inteligente
- ✅ Estratégias de cache otimizadas:
  - **CacheFirst**: Fontes do Google (1 ano de cache)
  - **NetworkFirst**: APIs (5 minutos de cache com fallback)
  - **Precache**: Assets estáticos (JS, CSS, HTML, imagens)

### 3. **Otimizações Mobile**
- ✅ Ícones otimizados para diferentes resoluções
- ✅ Meta tags específicas para iOS
- ✅ Theme color para barra de status
- ✅ Orientação portrait otimizada

### 4. **Atalhos de App**
- ✅ Atalho direto para "Transações"
- ✅ Atalho direto para "Metas"

## 📂 Arquivos Criados/Modificados

### Ícones
```
client/public/
├── icon-192x192.svg       # Ícone Android (192x192)
├── icon-512x512.svg       # Ícone Android/Splash (512x512)
├── apple-touch-icon.svg   # Ícone iOS (180x180)
└── manifest.webmanifest   # Manifesto PWA
```

### Configuração
- **`vite.config.js`**: Configurado com `vite-plugin-pwa`
- **`index.html`**: Meta tags PWA e iOS
- **`PWAInstallPrompt.jsx`**: Componente de prompt de instalação

## 🚀 Como Instalar

### Android (Chrome/Edge)

1. **Acesse o site** em `https://seu-dominio.com`
2. **Aguarde o prompt** de instalação aparecer (após 5 segundos)
3. **Clique em "Instalar"** no banner
4. **OU** clique no menu (⋮) → "Instalar app" / "Adicionar à tela inicial"

### iOS (Safari)

1. **Acesse o site** em Safari
2. **Toque no ícone de compartilhar** (quadrado com seta para cima)
3. **Role para baixo** e toque em "Adicionar à Tela de Início"
4. **Confirme** tocando em "Adicionar"

### Desktop (Chrome/Edge)

1. **Acesse o site**
2. **Clique no ícone de instalação** na barra de endereço (⊕)
3. **OU** clique no menu (⋮) → "Instalar Duoo"

## 🔧 Configurações Técnicas

### Manifesto PWA
```json
{
  "name": "Duoo - Gestão Financeira",
  "short_name": "Duoo",
  "display": "standalone",
  "theme_color": "#059669",
  "background_color": "#ecfdf5",
  "orientation": "portrait-primary"
}
```

### Service Worker (Workbox)

#### Estratégias de Cache

**1. Google Fonts (CacheFirst)**
- Cache por 1 ano
- Máximo 10 entradas
- Fallback para rede se cache falhar

**2. APIs (NetworkFirst)**
- Tenta rede primeiro (timeout 10s)
- Fallback para cache se offline
- Cache por 5 minutos
- Máximo 50 entradas

**3. Assets Estáticos (Precache)**
- JS, CSS, HTML, SVG, PNG, WEBP
- Atualizados automaticamente em nova versão

### Meta Tags iOS

```html
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="default" />
<meta name="apple-mobile-web-app-title" content="Duoo" />
<link rel="apple-touch-icon" href="/apple-touch-icon.svg" />
```

## 📊 Verificação de PWA

### Lighthouse Audit
Execute no Chrome DevTools:
1. Abra DevTools (F12)
2. Vá para aba "Lighthouse"
3. Selecione "Progressive Web App"
4. Clique em "Generate report"

### Checklist PWA
- ✅ Manifesto válido
- ✅ Service Worker registrado
- ✅ Ícones adequados (192x192 e 512x512)
- ✅ HTTPS (obrigatório em produção)
- ✅ Viewport configurado
- ✅ Theme color definido
- ✅ Display standalone

## 🎨 Personalização

### Alterar Cores do Tema

**`manifest.webmanifest` e `vite.config.js`:**
```json
{
  "theme_color": "#059669",      // Cor da barra de status
  "background_color": "#ecfdf5"  // Cor do splash screen
}
```

**`index.html`:**
```html
<meta name="theme-color" content="#059669" />
```

### Adicionar Novos Atalhos

**`vite.config.js`:**
```javascript
shortcuts: [
  {
    name: 'Nome do Atalho',
    short_name: 'Atalho',
    description: 'Descrição',
    url: '/dashboard/rota',
    icons: [{ src: '/icon-192x192.svg', sizes: '192x192' }]
  }
]
```

## 🐛 Troubleshooting

### Instalação não aparece

**Possíveis causas:**
1. **Não está em HTTPS** (obrigatório em produção, localhost funciona)
2. **Já instalou antes** (desinstale e limpe cache)
3. **Navegador não suporta** (use Chrome/Edge/Safari)
4. **Service Worker não registrou** (verifique console)

**Solução:**
```bash
# Limpar cache e service workers
Chrome DevTools → Application → Clear storage → Clear site data
```

### App não atualiza

**Causa:** Service Worker está cacheando versão antiga

**Solução:**
```bash
# Forçar atualização
Chrome DevTools → Application → Service Workers → Update
```

### iOS não mostra ícone correto

**Causa:** Cache do iOS

**Solução:**
1. Remova o app da tela inicial
2. Limpe cache do Safari (Ajustes → Safari → Limpar Histórico)
3. Reinstale

## 📈 Próximas Melhorias

- [ ] Push Notifications via Service Worker (notificações mesmo com app fechado)
- [ ] Background Sync (sincronizar dados quando voltar online)
- [ ] Share Target API (compartilhar para o app)
- [ ] Badging API (contador de notificações no ícone)
- [ ] Periodic Background Sync (atualizar dados em background)

## 🔒 Requisitos de Produção

### Obrigatórios
1. **HTTPS**: PWA só funciona em HTTPS (ou localhost)
2. **Manifesto válido**: Verificar com Lighthouse
3. **Service Worker**: Deve estar registrado
4. **Ícones**: Mínimo 192x192 e 512x512

### Recomendados
1. **Splash screens**: Ícone 512x512 com background_color
2. **Apple Touch Icon**: 180x180 para iOS
3. **Favicon**: 32x32 e 16x16
4. **Meta description**: Para SEO

## 📚 Referências

- [MDN - Progressive Web Apps](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps)
- [Web.dev - PWA](https://web.dev/progressive-web-apps/)
- [Vite Plugin PWA](https://vite-pwa-org.netlify.app/)
- [Workbox](https://developers.google.com/web/tools/workbox)
- [Web App Manifest](https://developer.mozilla.org/en-US/docs/Web/Manifest)

## 🎉 Resultado

Agora o Duoo pode ser instalado como um aplicativo nativo em:
- ✅ **Android** (Chrome, Edge, Samsung Internet)
- ✅ **iOS** (Safari 16.4+)
- ✅ **Desktop** (Windows, macOS, Linux)

Os usuários terão uma experiência completa de app nativo com:
- Ícone na tela inicial
- Execução em tela cheia
- Funcionamento offline
- Notificações push (já implementadas)
- Acesso rápido via atalhos
