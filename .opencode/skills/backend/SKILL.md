---

name: backend
description: Orienta o desenvolvimento do backend NestJS, da API REST e da lógica de negócio do ERP.
----------------------------------------------------------------------------------------------------

# Backend

## Stack

* Node.js
* TypeScript
* NestJS
* REST
* Prisma

## Arquitetura

Utilizar monólito modular.

Organizar funcionalidades por domínio.

Evitar controllers excessivamente complexos.

Controllers devem lidar principalmente com HTTP.

Regras de negócio devem permanecer em services, use cases ou abstrações equivalentes.

Acesso ao banco deve permanecer isolado da camada HTTP.

## Multi-tenancy

Toda operação que acessa dados de domínio deve receber `tenantId` como parâmetro.

O `tenantId` é extraído do access token JWT pelo TenantGuard.

Services devem exigir `tenantId` em todas as queries de domínio.

Consultar `docs/architecture.md` para detalhes do TenantGuard e fluxo de autorização.

## Autenticação e Sessões

* Login: `POST /auth/login` com email + senha. Retorna lista de tenants.
* Seleção de tenant: `POST /auth/select-tenant` com tenantId. Cria Session e emite tokens.
* Access token: JWT com `sub`, `tenantId`, `iat`, `exp` (15 min). Não contém roles nem permissions.
* Refresh token: string aleatória, hash SHA-256 no banco, cookie HttpOnly.
* Refresh: `POST /auth/refresh`. Valida Session, emite novo access token.
* Logout: `POST /auth/logout`. Marca Session como revogada.

A Session é criada apenas durante a seleção do Tenant, não durante o login.

Consultar `docs/architecture.md` para fluxos completos.

## Autorização

Autenticação e autorização são conceitos separados.

O fato de o usuário estar autenticado não significa que ele possui autorização para executar qualquer operação.

Regras de autorização devem ser verificadas no backend.

Platform Admin é verificado via `User.isPlatformAdmin`. Não há tabela `PlatformAdmin`.

## API

Utilizar recursos REST de maneira consistente.

Definir:

* métodos HTTP adequados;
* códigos de status apropriados;
* validação de entrada;
* respostas consistentes;
* tratamento de erros.

Não expor diretamente entidades internas do banco quando isso criar acoplamento desnecessário.

## Validação

Toda entrada externa deve ser validada no backend.

Não confiar na validação do frontend.

Validar:

* tipos;
* formatos;
* campos obrigatórios;
* regras de autorização;
* consistência dos dados.

## Segurança

Nunca retornar senhas ou credenciais.

Nunca registrar tokens ou senhas em logs.

Não colocar segredos no código.

Senhas: Argon2id. Refresh tokens: SHA-256.

## Implementação

Antes de criar um endpoint:

1. verificar se já existe recurso equivalente;
2. verificar DTOs;
3. verificar service/use case;
4. verificar entidade/model;
5. verificar autorização;
6. verificar testes existentes.

Não duplicar lógica entre endpoints.
