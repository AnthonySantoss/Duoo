# Especificação: Captura de Notificações Bancárias no Android

## Requisitos Funcionais e Critérios de Aceite

### RF1: Vinculação do Serviço de Notificação no Android (Target SDK 35)
- **Dado** que o usuário concedeu permissão de acesso a notificações ao app Duoo no Android,
- **Quando** o sistema operacional publicar uma notificação na barra de status,
- **Então** o `NotificationCaptureService` deve estar vinculado (`android:exported="true"` com permissão `android.permission.BIND_NOTIFICATION_LISTENER_SERVICE`) e receber o evento em `onNotificationPosted`.

### RF2: Resiliência de Autenticação em Background
- **Dado** que o usuário configurou a captura automática no app Android,
- **Quando** uma notificação bancária chegar após mais de 24 horas do login inicial,
- **Então** a requisição para `POST /api/captured-transactions` deve continuar autenticada (via token de longa duração/dispositivo ou renovação transparente de sessão) sem falhar com `401/400`.

### RF3: Prevenção de Descarte Silencioso em Compras no Crédito
- **Dado** que uma notificação bancária é identificada com termos de crédito (`crédito`, `cartão`, `fatura`),
- **Quando** o `creditCardId` padrão não estiver configurado (`<= 0`), mas houver um `walletId` válido configurado,
- **Então** o app não deve descartar a notificação; deve enviá-la vinculada à carteira (`wallet_id`) ou exigir/alertar claramente na UI de configuração caso o usuário tente ativar sem cartão.

### RF4: Cobertura de Pacotes Bancários e Vocabulário de Despesas
- **Dado** que uma notificação chega de bancos suportados (incluindo Banco do Brasil `br.com.bb.android`, Nubank, Inter, Itaú, Bradesco, C6, PicPay, Mercado Pago, Santander, Caixa),
- **Quando** o texto contiver termos como `"compra"`, `"aprovada"`, `"pix enviado"`, `"transferência enviada"`, `"pagou"`, `"pagamento"`, `"débito"`,
- **Então** o `NotificationParser` deve extrair o valor em reais (`R$`), classificar como `"expense"` e enviar ao backend.
