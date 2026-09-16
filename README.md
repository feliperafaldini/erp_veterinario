# ERP Veterinário

Sistema de gestão veterinária desenvolvido como projeto acadêmico de Engenharia de Computação.

O projeto consiste em um ERP veterinário no modelo SaaS, permitindo que diferentes estabelecimentos veterinários utilizem a mesma aplicação com isolamento lógico de seus dados. A aplicação foi projetada com arquitetura modular, autenticação baseada em JWT, controle de acesso por funções (RBAC) e PostgreSQL como banco de dados relacional.

> **Status:** Em desenvolvimento

## Sobre o projeto

O sistema tem como objetivo centralizar a gestão das informações de estabelecimentos veterinários, veterinários, tutores e animais, fornecendo uma base para futuras funcionalidades relacionadas à operação clínica e administrativa.

A arquitetura foi projetada como um **modular monolith**, mantendo o backend como uma única aplicação NestJS, mas organizado internamente em módulos independentes por domínio.

O sistema utiliza **multi-tenancy**, permitindo que um mesmo usuário possa estar associado a diferentes estabelecimentos veterinários, com suas funções e permissões definidas individualmente em cada estabelecimento.

## Tecnologias

### Frontend

* React
* TypeScript
* Vite
* Tailwind CSS
* shadcn/ui

### Backend

* Node.js
* TypeScript
* NestJS
* REST API
* Prisma ORM

### Banco de dados

* PostgreSQL 16

### Autenticação e segurança

* Argon2id para armazenamento seguro de senhas
* JWT para access tokens
* Refresh tokens aleatórios
* SHA-256 para armazenamento do hash dos refresh tokens
* Cookies HttpOnly
* RBAC (Role-Based Access Control)
* Isolamento de dados por tenant

### Testes

* Vitest
* Supertest
* Playwright

### Infraestrutura

* Docker
* Docker Compose
* Git
* GitHub

## Arquitetura

O sistema segue uma arquitetura de três camadas principais:

```text
┌─────────────────────────────┐
│           Frontend          │
│      React + TypeScript     │
│   Vite + Tailwind + shadcn  │
└──────────────┬──────────────┘
               │
               │ REST API
               ▼
┌─────────────────────────────┐
│           Backend           │
│      NestJS + TypeScript    │
│       Modular Monolith      │
└──────────────┬──────────────┘
               │
               │ Prisma
               ▼
┌─────────────────────────────┐
│         PostgreSQL          │
│       Banco relacional      │
└─────────────────────────────┘
```

### Modular Monolith

O backend é implementado como um **monólito modular**.

Isso significa que existe uma única aplicação NestJS, mas suas responsabilidades são separadas em módulos. Essa abordagem permite manter o projeto organizado sem introduzir a complexidade operacional de uma arquitetura baseada em múltiplos microserviços.

Exemplo conceitual:

```text
Backend
├── Auth
├── Users
├── Tenants
├── Veterinarians
├── Tutors
├── Animals
└── ...
```

Os módulos compartilham a mesma aplicação e banco de dados, mas possuem responsabilidades bem definidas.

## Multi-tenancy

O sistema utiliza um modelo de **multi-tenancy com banco compartilhado**.

Cada estabelecimento veterinário é representado por um `Tenant`.

```text
                 PostgreSQL
                      │
          ┌───────────┼───────────┐
          │           │           │
       Tenant A    Tenant B    Tenant C
          │           │           │
       Usuários     Usuários    Usuários
          │           │           │
        Dados       Dados       Dados
```

Os dados são logicamente isolados por `tenantId`.

Um usuário pode pertencer a vários estabelecimentos:

```text
User
 │
 ├── Tenant A
 │     └── Role: ADMIN
 │
 └── Tenant B
       └── Role: RECEPTIONIST
```

O backend é responsável por garantir que uma requisição autenticada opere somente dentro do tenant associado à sessão atual.

## Autenticação

O fluxo de autenticação é dividido em etapas.

```text
Registro
   ↓
Login
   ↓
Lista de tenants disponíveis
   ↓
Seleção do tenant
   ↓
Criação da sessão
   ↓
Access Token + Refresh Token
```

### Access Token

O access token é um JWT com validade de **15 minutos**.

Os claims utilizados são:

```text
sub
tenantId
iat
exp
```

Roles e permissions não são armazenadas no JWT. Elas são resolvidas no servidor.

### Refresh Token

O refresh token:

* é gerado aleatoriamente;
* possui validade de 7 dias;
* é enviado exclusivamente através de cookie HttpOnly;
* não é retornado no corpo JSON;
* é armazenado no banco somente através de seu hash SHA-256.

As sessões podem ser revogadas durante o logout.

## RBAC

O sistema utiliza **Role-Based Access Control**.

As roles atualmente definidas são:

| Role           | Descrição                        |
| -------------- | -------------------------------- |
| `ADMIN`        | Administração do estabelecimento |
| `VETERINARIAN` | Usuário com função veterinária   |
| `RECEPTIONIST` | Usuário de recepção              |

As permissões são granulares e seguem o formato:

```text
RESOURCE_ACTION
```

Permissões atualmente cadastradas:

```text
ANIMAL_CREATE
ANIMAL_READ
ANIMAL_UPDATE
ANIMAL_DEACTIVATE

TUTOR_CREATE
TUTOR_READ
TUTOR_UPDATE
TUTOR_DEACTIVATE
```

O acesso é verificado no backend por meio de guards.

Fluxo simplificado:

```text
Request
   ↓
JWT Authentication
   ↓
Tenant Validation
   ↓
Permission Validation
   ↓
Controller
   ↓
Service
   ↓
Database
```

## Modelo de domínio

O banco de dados foi projetado para separar dados globais, dados específicos de um tenant e dados globais com proveniência.

Principais entidades:

```text
User
Tenant
UserTenant
UserTenantRole
Session

Role
Permission
RolePermission

Veterinarian
Specialty
VeterinarianSpecialty
TenantVeterinarian

TutorIdentity
Tutor
TutorPhone
TutorAddress
TutorEmergencyContact

Animal
Species
Breed
TenantAnimal
AnimalTutor
AnimalWeightRecord

Allergy
AnimalAllergy

Medication
AnimalMedication

Vaccine
AnimalVaccination
```

### Veterinários

Um veterinário é uma entidade independente de um usuário.

Isso permite que um veterinário exista no sistema mesmo sem possuir uma conta para acessar a aplicação.

A relação com estabelecimentos é representada por `TenantVeterinarian`.

### Tutores

Os tutores possuem uma identidade global baseada em CPF ou CNPJ, enquanto seus dados operacionais são associados ao tenant.

Um tutor pode possuir:

* telefones;
* endereços;
* contato de emergência;
* informações específicas por estabelecimento.

### Animais

Os animais possuem identidade global e podem estar associados a múltiplos tutores e estabelecimentos.

Informações compartilhadas incluem, entre outras:

* nome;
* espécie;
* raça;
* sexo;
* castração;
* data de nascimento;
* microchip;
* peso;
* alergias;
* medicamentos em uso;
* vacinação.

Registros clínicos específicos de um estabelecimento permanecem vinculados ao respectivo tenant.

## Estrutura do projeto

A estrutura atual do repositório é organizada aproximadamente da seguinte forma:

```text
erp_veterinario/
├── .opencode/
│   └── skills/
├── docs/
├── prisma/
│   ├── migrations/
│   ├── schema.prisma
│   └── seed.ts
├── src/
│   ├── app/
│   ├── auth/
│   ├── health/
│   ├── prisma/
│   └── test/
├── .env
├── .gitignore
├── AGENTS.md
├── nest-cli.json
├── package.json
├── tsconfig.json
└── README.md
```

A estrutura será expandida conforme os módulos de domínio forem implementados.

## Banco de dados

O projeto utiliza PostgreSQL 16 e Prisma ORM.

As migrations são utilizadas para versionar a estrutura do banco.

Comandos principais:

```bash
npx prisma validate
npx prisma generate
npx prisma migrate status
npx prisma migrate deploy
npx prisma db seed
```

O seed inicial cria as roles e permissions necessárias para o funcionamento do RBAC.

O seed é idempotente, portanto pode ser executado novamente sem criar registros duplicados.

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

Crie um arquivo `.env` na raiz do projeto.

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

As decisões de arquitetura e regras de negócio são mantidas separadamente do código.

Principais documentos:

```text
docs/
├── architecture.md
├── business-rules.md
└── domain-model.md
```

Além disso, o projeto possui:

```text
AGENTS.md
```

que contém orientações gerais para desenvolvimento e manutenção do projeto.

As skills utilizadas pelo OpenCode ficam em:

```text
.opencode/skills/
```

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
