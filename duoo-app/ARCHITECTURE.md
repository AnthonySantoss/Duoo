# Arquitetura do Duoo

## Objetivo

Manter o produto separado por responsabilidades, com segurança aplicada no limite da API e sem scripts operacionais espalhados na raiz do backend.

## Estrutura atual e responsabilidade

```text
server/
  config/       configuração e ambiente
  controllers/  tradução HTTP -> caso de uso
  middleware/   autenticação, validação e tratamento de erros
  models/       entidades e associações Sequelize
  routes/       composição das rotas HTTP
  services/     integrações e regras reutilizáveis
  utils/        utilidades sem regra de negócio
  validation/   schemas de entrada
  test/         testes automatizados
  scripts/      operações de manutenção explicitamente documentadas
```

## Regras para novas funcionalidades

1. Toda rota protegida usa `authMiddleware`.
2. Toda entrada externa deve passar por schema de validação.
3. Toda consulta por ID deve validar propriedade ou acesso do parceiro antes de ler ou alterar dados.
4. Regras que conversam com mais de um model ficam em `services/`, não em `routes/`.
5. Operações que alteram saldo e transação usam uma transação Sequelize.
6. Mensagens de erro de produção não expõem `error.message`, SQL ou stack trace.
7. Segredos entram por ambiente; nenhum fallback de produção é permitido.
8. Migrações executadas pelo `run_migrations.js` são mantidas. Scripts de diagnóstico e reparo só podem ser removidos após confirmar que já foram aplicados no banco de produção.

## Integrações

O fluxo ativo de captura bancária usa o aplicativo Android `android-capture/`, que lê notificações apenas após consentimento explícito do usuário e envia somente dados normalizados para `/api/captured-transactions`. O PWA não lê notificações de outros aplicativos.

As colunas e scripts históricos de Pluggy foram mantidos apenas para compatibilidade com bancos existentes durante a migração; a integração paga não faz mais parte da aplicação ativa.

## Próxima evolução

O próximo passo estrutural é extrair os casos de uso de transações, carteiras e captura Android dos controllers para services/repositories e adicionar testes de autorização por recurso.
