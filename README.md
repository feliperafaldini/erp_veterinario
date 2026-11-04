# ERP Veterinário

Sistema de gestão veterinária desenvolvido como projeto acadêmico de Engenharia de Computação.

O projeto consiste em um ERP veterinário no modelo SaaS, permitindo que diferentes estabelecimentos veterinários utilizem a mesma aplicação com isolamento lógico de seus dados. A aplicação foi projetada com arquitetura modular, autenticação baseada em JWT, controle de acesso por funções (RBAC) e PostgreSQL como banco de dados relacional.

> **Status:** Em desenvolvimento

## Sobre o projeto

O sistema tem como objetivo centralizar a gestão das informações de estabelecimentos veterinários, veterinários, tutores e animais, fornecendo uma base para futuras funcionalidades relacionadas à operação clínica e administrativa.

A arquitetura foi projetada como um **modular monolith**, mantendo o backend como uma única aplicação NestJS, mas organizado internamente em módulos independentes por domínio.

O sistema utiliza **multi-tenancy**, permitindo que um mesmo usuário possa estar associado a diferentes estabelecimentos veterinários, com suas funções e permissões definidas individualmente em cada estabelecimento.

## Stack

| Camada | Tecnologias |
|---|---|
| Frontend | React, TypeScript, Vite, Tailwind CSS, shadcn/ui |
| Backend | Node.js, NestJS, REST, Prisma ORM |
| Banco | PostgreSQL 16 |
| Autenticação | Argon2id, JWT + refresh token, cookies HttpOnly, RBAC |
| Infra | Docker Compose |

## Executando o projeto

### Pré-requisitos

* Node.js
* npm
* Docker
* Docker Compose
* Git

### Clonar o repositório

```bash
git clone git@github.com:feliperafaldini/erp_veterinario.git
cd erp_veterinario
```

### Configurar variáveis de ambiente

Crie um arquivo `.env` na raiz do projeto a partir do modelo versionado:

```bash
cp .env.example .env
```

As credenciais e secrets utilizados localmente não devem ser commitados no Git.

### Iniciar o PostgreSQL

O banco de dados é executado através do Docker Compose.

```bash
docker compose up -d
```

### Instalar dependências

```bash
npm install
```

### Gerar o Prisma Client

```bash
npx prisma generate
```

### Executar migrations

```bash
npx prisma migrate deploy
```

### Executar o seed

```bash
npx prisma db seed
```

### Iniciar o backend

```bash
npm run start:dev
```

O backend utiliza o prefixo:

```text
/api
```

O health check está disponível em:

```text
GET /api/health
```

Uma resposta esperada é:

```json
{
  "status": "ok",
  "database": "connected"
}
```

## Scripts

Os principais scripts disponíveis no projeto incluem:

```bash
npm run start:dev
npm run build
npm run start
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
```

Os scripts de teste serão ampliados conforme a suíte automatizada do projeto for implementada.

## Documentação

As decisões de arquitetura e as regras de negócio ficam fora do README:

| Documento | Conteúdo |
|---|---|
| [`docs/visao-tecnica.md`](docs/visao-tecnica.md) | Arquitetura, multi-tenancy, autenticação, RBAC, modelo de domínio, estrutura e banco |
| [`docs/architecture.md`](docs/architecture.md) | Identidade, sessões, tokens JWT e autorização |
| [`docs/business-rules.md`](docs/business-rules.md) | Regras de negócio por entidade e papel |
| [`docs/domain-model.md`](docs/domain-model.md) | Modelo de domínio completo |
| [`docs/rls-evaluation.md`](docs/rls-evaluation.md) | Avaliação de Row-Level Security |
| [`AGENTS.md`](AGENTS.md) | Convenções de desenvolvimento |

As skills do OpenCode ficam em `.opencode/skills/`.

## Status do desenvolvimento

### Concluído

* [x] Estrutura inicial do projeto
* [x] Configuração do Prisma
* [x] PostgreSQL
* [x] Modelo inicial do banco
* [x] Migrations
* [x] Seed inicial de roles e permissions
* [x] Estrutura NestJS
* [x] Integração NestJS + Prisma
* [x] Health check
* [x] Registro de usuários
* [x] Login
* [x] Suporte a CPF/CNPJ no cadastro do tenant
* [x] Seleção de tenant
* [x] Sessions
* [x] Access JWT
* [x] Refresh token
* [x] Logout
* [x] JWT authentication guard
* [x] Tenant guard
* [x] Permission guard

### Em desenvolvimento

* [ ] Testes automatizados completos
* [ ] Módulo de veterinários
* [ ] Módulo de tutores
* [ ] Módulo de animais
* [ ] Frontend React
* [ ] Integração frontend/backend
* [ ] Dockerização completa da aplicação
* [ ] Preparação para deploy local

### Planejado

* [ ] Gestão clínica
* [ ] Consultas
* [ ] Prontuários
* [ ] Diagnósticos
* [ ] Prescrições
* [ ] Relatórios
* [ ] Funcionalidades administrativas adicionais

> A lista de funcionalidades planejadas pode ser alterada conforme o escopo definido para o projeto acadêmico.

## Segurança

Algumas medidas de segurança adotadas no projeto:

* Senhas armazenadas com Argon2id.
* Access tokens de curta duração.
* Refresh tokens aleatórios.
* Refresh tokens armazenados somente como hash.
* Cookies HttpOnly.
* Mensagem genérica para credenciais inválidas.
* Controle de acesso baseado em roles e permissions.
* Isolamento lógico entre tenants.
* Validação de entrada através de DTOs.
* Variáveis sensíveis mantidas fora do controle de versão.

## Objetivo acadêmico

O projeto foi desenvolvido como parte das atividades acadêmicas do curso de Engenharia de Computação.

Além da implementação do sistema, o projeto busca aplicar conceitos de:

* Engenharia de Software;
* Desenvolvimento Web;
* APIs REST;
* Bancos de dados relacionais;
* Modelagem de dados;
* Arquitetura de software;
* Segurança de aplicações;
* Controle de acesso;
* Containers;
* Testes automatizados;
* Desenvolvimento colaborativo com Git.

## Licença

Este projeto foi desenvolvido para fins acadêmicos.

A definição da licença de distribuição do código ainda será estabelecida conforme as necessidades do projeto e da instituição.
