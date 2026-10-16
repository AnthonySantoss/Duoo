# Design Técnico: Correção da Captura de Notificações no Android

## 1. Alteração no `AndroidManifest.xml`
- Alterar `android:exported="false"` para `android:exported="true"` na tag `<service android:name=".NotificationCaptureService" ...>`. A proteção contra acesso externo indevido já é garantida pelo atributo `android:permission="android.permission.BIND_NOTIFICATION_LISTENER_SERVICE"`.

## 2. Autenticação Duradoura para Captura (`authController.js` / `MainActivity.kt`)
- No backend (`authController.js` ou endpoint dedicado de token de captura), permitir emissão de token com validade estendida (ex.: `30d` ou `90d`) quando solicitado pelo fluxo de configuração mobile, ou sincronizar o cookie atualizado toda vez que a `WebView` carregar na `MainActivity.kt` (não apenas quando `token` está vazio).
- Na `MainActivity.kt`, no `onPageFinished`, atualizar sempre o `jwt_token` em `EncryptedSharedPreferences` caso o cookie `token` da WebView tenha mudado, mantendo o token sempre fresco.

## 3. Fallback de Cartão de Crédito (`NotificationCaptureService.kt` e `capturedTransactionController.js`)
- Em `NotificationCaptureService.kt`: se `parsed.isCreditCard` for `true` mas `creditCardId <= 0`, verificar se `walletId > 0`. Se houver `walletId`, registrar como despesa na carteira (`wallet_id = walletId`, sem descartar) ou selecionar automaticamente o primeiro cartão disponível na `MainActivity` ao ativar o serviço.

## 4. Parser de Notificações (`NotificationParser.kt`)
- Incluir `"br.com.bb.android"`, `"com.santander.app"`, `"br.com.gabba.Caixa"` no `SUPPORTED_PACKAGES`.
- Expandir a detecção de `expense` para incluir `"pagou"`, `"pagamento"`, `"enviou"`, `"transferiu"`, `"débito"`, `"compra no"`.
