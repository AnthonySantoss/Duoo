# Duoo Capture (Android)

Aplicativo complementar do Duoo para capturar notificações financeiras no Android.

## Fluxo do aplicativo

1. O usuário entra no Duoo e escolhe uma carteira ou cartão padrão.
2. O usuário aceita o consentimento e habilita o acesso especial às notificações do Android.
3. O serviço filtra pacotes bancários suportados.
4. O parser extrai valor, tipo e título localmente.
5. Somente os dados normalizados são colocados em uma fila local criptografada.
6. O WorkManager reenvia a fila quando a conexão retorna para `POST /api/captured-transactions`.
7. O aplicativo consulta `GET /api/app/android/latest` e mostra uma atualização quando o backend publica uma versão superior.

O texto bruto da notificação não é enviado ao servidor. O suporte aos nomes de pacotes e formatos deve ser validado com notificações reais de cada banco antes de produção.

## Limitações conhecidas

- Android somente; o PWA não consegue ler notificações de outros aplicativos.
- O parser inicial cobre formatos genéricos e precisa de testes por banco.
- Cada banco pode usar uma carteira ou cartão diferente, com um destino padrão como alternativa.
- O login, o cookie, a fila e as configurações são cifrados com uma chave mantida pelo Android Keystore.
- O usuário pode revogar o consentimento desmarcando a captura.
- A política de privacidade e a declaração de dados da Play Store precisam acompanhar a publicação.

Para abrir no Android Studio, selecione esta pasta como projeto Gradle.

## Compilar e publicar

Compile a versão de distribuição com `./gradlew assembleRelease -PduooVersionCode=2 -PduooVersionName=0.2.0` e assine o APK com a chave de produção. Use os mesmos números ao publicar, pois o aplicativo compara o `versionCode` instalado com o manifesto do servidor. Há duas formas de publicação:

- Defina `ANDROID_APK_URL` com uma URL HTTPS de um armazenamento externo. A rota de download redirecionará para ela.
- Copie o APK para o próprio serviço com `npm run publish:android -- /caminho/duoo-capture.apk 2 0.2.0 "Descrição da versão"`. O comando atualiza o manifesto e a rota `GET /api/app/android/download` passa a servir o arquivo.

O APK não é versionado no Git. Em hospedagens com disco efêmero, use `ANDROID_APK_URL` ou execute a publicação durante o deploy com um artefato persistente.
