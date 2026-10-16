# Proposta: Correção do Pipeline de Web Push Notifications

## 1. Problema e Contexto
As notificações Push na Web (PWA/Browser) não chegam ao navegador/dispositivo do usuário, nem em desenvolvimento nem em produção.

## 2. Causas Raízes Identificadas
1. **Service Worker sem listener de `push` no modo `generateSW` (dev)**: O `vite.config.js` usa a estratégia padrão `generateSW` do `vite-plugin-pwa`, que gera um `sw.js` apenas com precache do Workbox e **ignora** o arquivo customizado `client/src/service-worker.js` (onde está o `self.addEventListener('push', ...)`).
2. **Chave Pública VAPID dependente apenas de variável de build ausente**: O `browserNotificationService.js` lê `<meta name="vapid-public-key" content="%VITE_VAPID_PUBLIC_KEY%">`. Quando `VITE_VAPID_PUBLIC_KEY` não é injetada no build do Vite, o conteúdo literal `"%VITE_VAPID_PUBLIC_KEY%"` causa `DOMException` em `window.atob()` ao tentar converter a chave, abortando `pushManager.subscribe()`. Além disso, o client pode buscar a chave pública diretamente do backend (`GET /api/notifications/vapid-public-key`) como fallback seguro.
3. **Sincronização de Subscription antes da Autenticação (`401 Unauthorized`)**: O `NotificationPermissionBanner` roda na montagem do `App`, inclusive na tela de `/login` (quando ainda não há JWT). Se o usuário aceita, `POST /api/notifications/subscribe` falha com `401`, mas a permissão do navegador já mudou para `granted`, e o `AuthContext` nunca reenvia a subscription após o login.
4. **Falta de disparo de Web Push em `createNotification` e falta de `dotenv` no script de teste**: Em `notificationController.js`, o endpoint `createNotification` salva a notificação no banco mas não chama `notificationService.sendPushNotification()`. No script `send_test_notification.js`, falta `require('dotenv').config()` antes de importar o `notificationService`.

## 3. Escopo da Mudança
- Configurar o Service Worker (via `injectManifest` ou `importScripts` de um handler de push dedicado em `public/`) para garantir que o listener `push` e `notificationclick` estejam presentes tanto em dev quanto em build de produção.
- Adicionar endpoint `GET /api/notifications/vapid-public-key` no backend e usá-lo no `browserNotificationService.js` quando a meta tag não estiver preenchida ou contiver placeholder `%VITE_...%`.
- Garantir que o registro/sincronização da subscription Push ocorra apenas quando o usuário estiver autenticado (e re-sincronizar automaticamente no `AuthContext` após login/sessão ativa se `Notification.permission === 'granted'`).
- Disparar `notificationService.sendPushNotification()` também em `createNotification` e carregar `dotenv` em `send_test_notification.js`.
