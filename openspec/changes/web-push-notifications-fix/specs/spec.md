# Especificação: Web Push Notifications

## Requisitos Funcionais e Critérios de Aceite

### RF1: Presença dos Listeners `push` e `notificationclick` no Service Worker Ativo
- **Dado** que a aplicação web está rodando (em desenvolvimento ou produção),
- **Quando** o Service Worker é registrado pelo navegador,
- **Então** o script ativo do Service Worker deve conter os handlers de `push` (exibindo `self.registration.showNotification`) e `notificationclick` (abrindo/focando a janela do app).

### RF2: Obtenção Confiável da Chave Pública VAPID
- **Dado** que o cliente web vai assinar o `pushManager`,
- **Quando** a meta tag `vapid-public-key` estiver vazia ou contiver o literal não substituído `%VITE_VAPID_PUBLIC_KEY%`,
- **Então** o `browserNotificationService` deve buscar a chave pública via `GET /api/notifications/vapid-public-key` no servidor antes de chamar `urlBase64ToUint8Array`.

### RF3: Registro e Re-sincronização de Subscription Autenticada
- **Dado** que o usuário concede permissão de notificações ou já possui `Notification.permission === 'granted'`,
- **Quando** o usuário fizer login ou carregar a sessão autenticada no `AuthContext`,
- **Então** o cliente deve garantir que a `PushSubscription` ativa do navegador seja enviada para `POST /api/notifications/subscribe` com o token JWT válido, e o `NotificationPermissionBanner` só deve ser exibido para usuários autenticados.

### RF4: Envio Efetivo de Push pelo Servidor
- **Dado** que o usuário possui ao menos uma `PushSubscription` registrada no banco e o servidor possui chaves VAPID configuradas (ou geradas/carregadas via `.env`),
- **Quando** uma notificação for criada (via alertas automáticos, criação manual em `POST /api/notifications` ou script de teste),
- **Então** `notificationService.sendPushNotification` deve enviar o payload via `web-push` e remover automaticamente subscriptions expiradas (`404`/`410`).
