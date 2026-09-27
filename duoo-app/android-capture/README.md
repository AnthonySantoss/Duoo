# Duoo Capture (Android)

Aplicativo complementar do Duoo para capturar notificações financeiras no Android.

## Fluxo atual do MVP

1. O usuário informa a API, faz login e escolhe a carteira de destino.
2. O usuário aceita o consentimento e habilita o acesso especial às notificações do Android.
3. O serviço filtra pacotes bancários suportados.
4. O parser extrai valor, tipo e título localmente.
5. Somente os dados normalizados são colocados em uma fila local criptografada.
6. A fila é reenviada quando a conexão retorna para `POST /api/captured-transactions`.

O texto bruto da notificação não é enviado ao servidor. O suporte aos nomes de pacotes e formatos deve ser validado com notificações reais de cada banco antes de produção.

## Limitações conhecidas

- Android somente; o PWA não consegue ler notificações de outros aplicativos.
- O parser inicial cobre formatos genéricos e precisa de testes por banco.
- O MVP usa uma carteira configurada no aplicativo.
- O login, o cookie, a fila e as configurações são cifrados com uma chave mantida pelo Android Keystore.
- O usuário pode revogar o consentimento desmarcando a captura.
- A política de privacidade e a declaração de dados da Play Store precisam acompanhar a publicação.

Para abrir no Android Studio, selecione esta pasta como projeto Gradle.
