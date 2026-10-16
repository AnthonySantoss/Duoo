# Tarefas: Correção de Web Push Notifications

- [ ] **Tarefa 1**: Criar `duoo-app/client/public/push-sw.js` com os listeners de `push` e `notificationclick` e configurar `workbox.importScripts: ['/push-sw.js']` em `duoo-app/client/vite.config.js`.
- [ ] **Tarefa 2**: Adicionar o endpoint `GET /api/notifications/vapid-public-key` em `duoo-app/server/controllers/notificationController.js` e `duoo-app/server/routes/notificationRoutes.js`, e atualizar `duoo-app/client/src/services/browserNotificationService.js` para validar a meta tag (ignorando `%VITE_VAPID_PUBLIC_KEY%`) e buscar a chave na API como fallback.
- [ ] **Tarefa 3**: Atualizar `duoo-app/client/src/components/ui/NotificationPermissionBanner.jsx` e `duoo-app/client/src/context/AuthContext.jsx` para só solicitar permissão quando autenticado e sincronizar automaticamente a subscription push após o login/autenticação.
- [ ] **Tarefa 4**: Atualizar `duoo-app/server/controllers/notificationController.js` (`createNotification`) para disparar `notificationService.sendPushNotification` e adicionar `dotenv` no topo de `duoo-app/server/send_test_notification.js`.
