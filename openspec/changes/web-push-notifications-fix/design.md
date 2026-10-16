# Design Técnico: Correção de Web Push Notifications

## 1. Service Worker com Listener de Push (`vite.config.js` + `public/push-sw.js`)
- Para manter toda a geração automática de cache do Workbox sem quebrar o `generateSW`, criar `client/public/push-sw.js` contendo os listeners `push` e `notificationclick` (atualmente em `client/src/service-worker.js`) e adicionar `workbox: { importScripts: ['/push-sw.js'], ... }` no `VitePWA` em `client/vite.config.js`. Assim, tanto `dev-dist/sw.js` quanto `dist/sw.js` importarão sempre os handlers de Push.

## 2. Endpoint de Chave VAPID e Fallback no Cliente (`notificationRoutes.js` / `browserNotificationService.js`)
- Adicionar `GET /api/notifications/vapid-public-key` em `notificationController.js` / `notificationRoutes.js` retornando `{ publicKey: process.env.VAPID_PUBLIC_KEY || null }`.
- Em `browserNotificationService.js`:
  - Validar se o conteúdo da meta tag `vapid-public-key` existe e **não** começa com `%VITE_`.
  - Caso contrário, buscar `GET /api/notifications/vapid-public-key` via `api.get('/notifications/vapid-public-key')`.

## 3. Sincronização Autenticada (`NotificationPermissionBanner.jsx` e `AuthContext.jsx`)
- Em `NotificationPermissionBanner.jsx`: exibir o banner somente quando `user` estiver autenticado no `AuthContext`.
- Em `AuthContext.jsx`: quando `user` for autenticado (no `checkAuth` e no `login`), se `Notification.permission === 'granted'`, chamar `browserNotificationService.subscribeToPush()` em background para garantir que a subscription atual do navegador esteja salva no backend para aquele usuário.

## 4. Disparo no Backend e Script de Teste (`notificationController.js` e `send_test_notification.js`)
- Em `notificationController.js` (`createNotification`): após `Notification.create(...)`, chamar `await notificationService.sendPushNotification(req.user.id, { title, body: message, data: { url: link || '/dashboard' } })`.
- Em `server/send_test_notification.js`: adicionar `require('dotenv').config({ path: require('path').resolve(__dirname, '.env') })` na primeira linha antes de importar os models e serviços.
