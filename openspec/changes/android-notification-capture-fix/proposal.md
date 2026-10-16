# Proposta: Correção da Captura de Notificações Bancárias no Android

## 1. Problema e Contexto
Quando uma notificação bancária chega ao dispositivo Android, o aplicativo `android-capture` não gera o lançamento correspondente no servidor Duoo.

## 2. Causas Raízes Identificadas
1. **Bloqueio de bind pelo sistema operacional (`android:exported="false"`)**: No arquivo `AndroidManifest.xml`, o `NotificationCaptureService` (que estende `NotificationListenerService`) está configurado com `android:exported="false"`. No Android (especialmente com `targetSdk = 35`), o `NotificationManagerService` do sistema operacional exige `android:exported="true"` junto à permissão `BIND_NOTIFICATION_LISTENER_SERVICE` para se conectar ao serviço.
2. **Expiração silenciosa do JWT após 24h**: O backend emite tokens JWT com expiração de `1d` (`authController.js`). O app Android captura o cookie no login da `WebView` uma única vez e armazena em `EncryptedSharedPreferences`, sem mecanismo de renovação ou token de longa duração para captura em background. Após 24 horas, todas as chamadas `POST /api/captured-transactions` falham com `401/400`.
3. **Descarte silencioso de compras no crédito sem cartão padrão**: Em `NotificationCaptureService.kt`, se a notificação for classificada como cartão de crédito (`isCreditCard == true`) e o usuário não tiver selecionado um `creditCardId` padrão (`creditCardId <= 0`), a notificação é simplesmente descartada (early return), mesmo que `walletId` esteja configurado.
4. **Pacotes de bancos e vocabulário de despesas incompletos no parser**: Em `NotificationParser.kt`, o pacote do Banco do Brasil está como `"com.bb"` em vez de `"br.com.bb.android"`, e palavras-chave muito comuns em Pix/transferências como `"pagou"`, `"pagamento"`, `"enviou"`, `"transferiu"`, `"débito"` não constam na detecção de saída (`expense`).

## 3. Escopo da Mudança
- Exportar corretamente o `NotificationCaptureService` no `AndroidManifest.xml`.
- Permitir autenticação duradoura para o serviço de captura Android ou renovação automática do token ao abrir/sincronizar, evitando perda silenciosa após 24h.
- Fazer fallback para `walletId` (ou permitir lançamento sem cartão estrito quando não configurado) em vez de descartar silenciosamente compras no crédito quando `creditCardId <= 0`.
- Atualizar a lista de pacotes bancários (`br.com.bb.android`, etc.) e termos de despesas no `NotificationParser.kt`.
