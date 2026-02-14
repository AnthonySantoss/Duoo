# 🔔 Sistema de Notificações do Navegador - Duoo App

## 📋 Visão Geral

O sistema de notificações do navegador foi implementado para permitir que os usuários recebam alertas importantes sobre suas finanças **mesmo quando não estiverem usando ativamente a aplicação web**.

## ✨ Funcionalidades Implementadas

### 1. **Notificações do Navegador (Web Notifications API)**
- ✅ Notificações aparecem no sistema operacional (Windows, macOS, Linux, Android, iOS)
- ✅ Funcionam mesmo quando a aba não está ativa
- ✅ Suportam clique para navegar direto para a seção relevante
- ✅ Ícones e badges personalizados por tipo de notificação

### 2. **Gerenciamento de Permissões**
- ✅ Banner não intrusivo que aparece 3 segundos após o primeiro acesso
- ✅ Componente de configurações para habilitar/desabilitar
- ✅ Persistência de preferências no localStorage
- ✅ Instruções claras para desbloquear se o usuário negar

### 3. **Tipos de Notificações Suportadas**
- 🏆 **Conquistas** - Quando desbloqueia uma achievement
- 🎯 **Metas** - Progresso (50%, 75%, 90%) e conclusão
- 💳 **Faturas** - Próximas do vencimento (7 e 3 dias) e vencidas
- 💰 **Orçamento** - Alertas de gastos excessivos
- 💸 **Transações** - Movimentações do parceiro e sincronizações bancárias
- ℹ️ **Informações** - Notificações gerais do sistema

## 🏗️ Arquitetura

### **Frontend**

#### `browserNotificationService.js`
Serviço principal que gerencia as notificações do navegador:
- `requestPermission()` - Solicita permissão ao usuário
- `sendNotification(title, options)` - Envia notificação genérica
- `sendFromBackendNotification(notification)` - Converte notificação do backend
- `isEnabled()` - Verifica se está habilitado
- `setEnabled(enabled)` - Habilita/desabilita

#### `NotificationContext.jsx`
Contexto React que integra notificações:
- Verifica novas notificações a cada 10 segundos
- Envia notificação do navegador automaticamente
- Exibe modal in-app simultaneamente
- Marca notificações como "notified" no backend

#### `NotificationPermissionBanner.jsx`
Banner que solicita permissão na primeira visita:
- Aparece após 3 segundos
- Não aparece novamente se o usuário dispensar
- Envia notificação de teste ao conceder permissão

#### `NotificationSettings.jsx`
Componente de configurações (pode ser adicionado em Settings):
- Toggle para habilitar/desabilitar
- Status visual claro (ativado, desativado, bloqueado)
- Instruções para desbloquear se negado

### **Backend**

#### `notificationService.js`
Serviço existente que cria notificações:
- `createNotification()` - Cria notificação no banco
- `notifyAchievementUnlocked()` - Conquista desbloqueada
- `notifyGoalProgress()` - Progresso de meta
- `notifyInvoiceNearDue()` - Fatura próxima
- `notifyBudgetAlert()` - Alerta de orçamento
- E outros métodos específicos...

#### Modelo `Notification`
```javascript
{
  id: INTEGER,
  user_id: UUID,
  title: STRING,
  message: TEXT,
  type: ENUM('achievement', 'budget_alert', 'goal_progress', ...),
  link: STRING (URL para navegar ao clicar),
  read: BOOLEAN,
  notified: BOOLEAN (se já foi exibida como notificação do navegador),
  created_at: DATE
}
```

## 🚀 Como Usar

### Para Usuários

1. **Primeira Visita**
   - Um banner aparecerá após 3 segundos pedindo permissão
   - Clique em "Permitir" para ativar notificações
   - Uma notificação de teste será enviada

2. **Gerenciar Notificações**
   - Acesse Configurações > Notificações (quando implementado)
   - Use o toggle para ativar/desativar
   - Se bloqueou, siga as instruções para desbloquear

3. **Receber Notificações**
   - Notificações aparecem automaticamente quando eventos importantes ocorrem
   - Clique na notificação para ir direto à seção relevante
   - Funcionam mesmo com a aba minimizada ou em segundo plano

### Para Desenvolvedores

#### Enviar Notificação do Backend

```javascript
const notificationService = require('./services/notificationService');

// Criar notificação (será automaticamente enviada ao navegador)
await notificationService.createNotification(
  userId,
  'Título da Notificação',
  'Mensagem detalhada',
  'info', // tipo
  '/dashboard/goals' // link opcional
);

// Ou usar métodos específicos
await notificationService.notifyGoalReached(userId, goal);
await notificationService.notifyInvoiceNearDue(userId, invoice, card, 3);
```

#### Enviar Notificação do Frontend

```javascript
import browserNotificationService from './services/browserNotificationService';

// Notificação simples
await browserNotificationService.sendNotification('Título', {
  body: 'Mensagem',
  link: '/dashboard/goals',
  requireInteraction: true // não fecha automaticamente
});

// Ou via contexto
const { requestBrowserNotificationPermission } = useNotifications();
const granted = await requestBrowserNotificationPermission();
```

#### Adicionar Componente de Configurações

```jsx
import NotificationSettings from './components/ui/NotificationSettings';

// Na página de Settings
<NotificationSettings />
```

## 🔧 Configurações Técnicas

### Permissões do Navegador
- **Granted**: Notificações habilitadas
- **Denied**: Usuário bloqueou (precisa desbloquear manualmente)
- **Default**: Ainda não perguntou

### LocalStorage
- `notificationsEnabled`: 'true' | 'false'
- `notificationPermissionAsked`: 'true' (se já mostrou o banner)

### Intervalos
- Verificação de novas notificações: **10 segundos**
- Delay do banner inicial: **3 segundos**

## 🎨 Personalização

### Ícones por Tipo
```javascript
const iconMap = {
  'achievement': '🏆',
  'budget_alert': '💰',
  'goal_progress': '🎯',
  'transaction': '💸',
  'invoice': '💳',
  'info': 'ℹ️',
  'note': '📝'
};
```

### Cores por Status
- **Ativado**: Verde (emerald)
- **Desativado**: Âmbar (amber)
- **Bloqueado**: Vermelho (red)
- **Não configurado**: Azul (blue)

## 📱 Compatibilidade

### Navegadores Suportados
- ✅ Chrome/Edge (Desktop e Android)
- ✅ Firefox (Desktop e Android)
- ✅ Safari (macOS e iOS 16.4+)
- ✅ Opera
- ❌ Internet Explorer

### Plataformas
- ✅ Windows 10/11
- ✅ macOS
- ✅ Linux
- ✅ Android
- ✅ iOS (Safari 16.4+)

## 🔒 Privacidade e Segurança

- Notificações são enviadas apenas para o usuário autenticado
- Permissões são solicitadas de forma transparente
- Usuário tem controle total (pode desabilitar a qualquer momento)
- Nenhum dado sensível é exposto nas notificações
- Funcionam apenas em HTTPS (ou localhost para desenvolvimento)

## 🐛 Troubleshooting

### Notificações não aparecem
1. Verificar se a permissão está concedida
2. Verificar se não está em modo "Não perturbe" no sistema
3. Verificar se o site não está em HTTPS (exceto localhost)
4. Limpar localStorage e tentar novamente

### Banner não aparece
1. Verificar se já foi dispensado antes
2. Limpar `notificationPermissionAsked` do localStorage
3. Recarregar a página

### Notificações aparecem duplicadas
1. Verificar se há múltiplas abas abertas
2. O sistema já previne isso com o campo `notified`

## 📈 Próximas Melhorias

- [ ] Service Worker para notificações em background (mesmo com navegador fechado)
- [ ] Push Notifications via servidor (WebPush)
- [ ] Agrupamento de notificações similares
- [ ] Som personalizado por tipo
- [ ] Ações rápidas nas notificações (ex: "Marcar como lida")
- [ ] Histórico de notificações enviadas
- [ ] Configurações granulares (escolher quais tipos receber)

## 📚 Referências

- [MDN - Notifications API](https://developer.mozilla.org/en-US/docs/Web/API/Notifications_API)
- [Web.dev - Notifications](https://web.dev/notifications/)
- [Can I Use - Notifications](https://caniuse.com/notifications)
