# ERP Veterinário

Sistema de gestão veterinária desenvolvido como projeto acadêmico de Engenharia de Computação.

O projeto consiste em um ERP veterinário no modelo SaaS, permitindo que diferentes estabelecimentos veterinários utilizem a mesma aplicação com isolamento lógico de seus dados. A aplicação foi projetada com arquitetura modular, autenticação baseada em JWT, controle de acesso por funções (RBAC) e PostgreSQL como banco de dados relacional.

> **Status:** Em desenvolvimento

## Sobre o projeto

O sistema tem como objetivo centralizar a gestão das informações de estabelecimentos veterinários, veterinários, tutores e animais, fornecendo uma base para futuras funcionalidades relacionadas à operação clínica e administrativa.

A arquitetura foi projetada como um **modular monolith**, mantendo o backend como uma única aplicação NestJS, mas organizado internamente em módulos independentes por domínio.

O sistema utiliza **multi-tenancy**, permitindo que um mesmo usuário possa estar associado a diferentes estabelecimentos veterinários, com suas funções e permissões definidas individualmente em cada estabelecimento.

## Tecnologias

### Frontend (planejado)

* React
* TypeScript
* Vite
* Tailwind CSS
* shadcn/ui

> Ainda não há frontend neste repositório: não existe diretório de frontend nem
> dependências React em `package.json`. Ver *Status do desenvolvimento*.

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
* Playwright (planejado — ainda não instalado; não há config nem testes e2e)

### Infraestrutura

* Docker
* Docker Compose
* Git
* GitHub

## Arquitetura

O sistema segue uma arquitetura de três camadas principais:

```text
┌─────────────────────────────┐
│    Frontend (planejado)     │
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

> O diagrama acima é a arquitetura-alvo. Hoje o que existe implementado é o
> backend (`/api`) e o banco; o frontend ainda não foi iniciado.

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

Permissões atualmente cadastradas são **31**, criadas pelo seed
(`prisma/seed.ts`) e agrupadas por recurso:

| Recurso | Permissões |
| ------ | ---------- |
| `ANIMAL` | `ANIMAL_CREATE`, `ANIMAL_READ`, `ANIMAL_UPDATE`, `ANIMAL_DEACTIVATE`, `ANIMAL_MARK_DECEASED` |
| `TUTOR` | `TUTOR_CREATE`, `TUTOR_READ`, `TUTOR_UPDATE`, `TUTOR_DEACTIVATE` |
| `VETERINARIAN` | `VETERINARIAN_CREATE`, `VETERINARIAN_READ`, `VETERINARIAN_UPDATE`, `VETERINARIAN_DEACTIVATE` |
| `APPOINTMENT` | `APPOINTMENT_CREATE`, `APPOINTMENT_READ`, `APPOINTMENT_UPDATE` |
| `CONSULTATION` | `CONSULTATION_CREATE`, `CONSULTATION_READ`, `CONSULTATION_UPDATE` |
| `DIAGNOSIS` | `DIAGNOSIS_CREATE`, `DIAGNOSIS_READ`, `DIAGNOSIS_UPDATE` |
| `WEIGHT` | `WEIGHT_CREATE`, `WEIGHT_READ` |
| `ALLERGY` | `ALLERGY_CREATE`, `ALLERGY_READ` |
| `MEDICATION` | `MEDICATION_CREATE`, `MEDICATION_READ`, `MEDICATION_UPDATE` |
| `VACCINATION` | `VACCINATION_CREATE`, `VACCINATION_READ` |

Distribuição por role (`prisma/seed.ts`, matriz role → permissão):

| Recurso           | `ADMIN`                        | `VETERINARIAN`                                | `RECEPTIONIST`          |
| ----------------- | ------------------------------ | --------------------------------------------- | ----------------------- |
| `ANIMAL`          | as 5                           | as 5                                          | sem `MARK_DECEASED`     |
| `TUTOR`           | as 4                           | sem `DEACTIVATE`                              | sem `DEACTIVATE`        |
| `VETERINARIAN`    | as 4                           | —                                             | —                       |
| `APPOINTMENT`     | as 3                           | as 3                                          | as 3                    |
| `CONSULTATION`    | as 3                           | as 3                                          | apenas `READ`           |
| `DIAGNOSIS`       | as 3                           | as 3                                          | —                       |
| `WEIGHT`          | as 2                           | as 2                                          | as 2                    |
| `ALLERGY`         | as 2                           | `CREATE` e `READ`                             | apenas `READ`           |
| `MEDICATION`      | as 3                           | as 3                                          | apenas `READ`           |
| `VACCINATION`     | as 2                           | `CREATE` e `READ`                             | apenas `READ`           |
| **Total**         | **31**                         | **26**                                        | **16**                  |

Duas permissões — `ANIMAL_MARK_DECEASED` e `MEDICATION_UPDATE` — ainda não têm
endpoint correspondente, e os atores autorizados delas estão pendentes de
definição (o mapeamento da tabela acima é provisório para as duas). Ver
`docs/business-rules.md`, seção *Permissões previstas sem endpoint*.

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

Appointment
Consultation
Diagnosis
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
├── .github/
│   └── workflows/          # CI (validação, build, migrations, seed, testes)
├── .opencode/
│   ├── agents/             # subagentes docs-auditor, rbac-reviewer, test-writer
│   └── skills/
├── docs/
├── prisma/
│   ├── migrations/
│   ├── schema.prisma
│   └── seed.ts
├── src/
│   ├── app/                # AppModule
│   ├── common/             # filtros e utilitários transversais
│   ├── health/             # GET /api/health
│   ├── prisma/
│   ├── test/               # controlador de testes (montado apenas nos testes)
│   ├── auth/               # login, registro, seleção de tenant, refresh, logout
│   ├── animals/            # + animal-tutor, animal-allergy, animal-medication,
│   │                       #   animal-vaccination, animal-weight-record
│   ├── tutors/
│   ├── veterinarians/
│   ├── appointments/
│   ├── consultations/
│   ├── diagnosis/
│   ├── allergies/
│   ├── medications/
│   ├── vaccines/
│   ├── breeds/
│   ├── species/
│   └── specialties/
├── test/                   # suíte Vitest + Supertest
├── .env                    # local, não versionado
├── .env.example
├── .gitignore
├── .dockerignore
├── AGENTS.md
├── Dockerfile
├── docker-compose.yml
├── nest-cli.json
├── package.json
├── tsconfig.json
├── vitest.config.ts
└── README.md
```

Os módulos de domínio acima já estão implementados com controller, service,
permissões e testes. `test/` segue o padrão Vitest + Supertest.

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

Copie o exemplo e ajuste os valores:

```bash
cp .env.example .env
```

As credenciais e secrets utilizados localmente não devem ser commitados no Git.

### Iniciar o PostgreSQL e a aplicação

O ambiente local é executado pelo Docker Compose (`docker-compose.yml`), com o
PostgreSQL e a aplicação:

```bash
docker compose up -d
```

| Serviço | Origem | Porta | Observação |
|---|---|---|---|
| `db` | `postgres:16` | `5432` | Volume nomeado `pgdata`; locale padrão `en_US.utf8` |
| `app` | `Dockerfile` deste repositório | `3000` | Executa `prisma migrate deploy`, depois o seed e sobe a API |

O locale do banco não deve ser alterado para `C`: as listagens ordenadas por
nome esperam ordenação alfabética, não ordem de bytes (ver *Testes*, abaixo).

Para subir somente o banco e rodar a aplicação na máquina, com hot reload:

```bash
docker compose up -d db
npm run start:dev
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

### Testes

A suíte (Vitest + Supertest) fala com o PostgreSQL apontado por `DATABASE_URL`.
Pré-condições:

```bash
npx prisma migrate deploy
npx prisma db seed
npm test
```

Observações:

* **Seed antes de rodar a suíte.** Alguns testes dependem dos dados de catálogo
  criados pelo seed (`prisma/seed.ts`); sem ele, casos de `test/medication.test.ts`
  falham porque um teste anterior cria a mesma linha sem a descrição esperada.
* **A suíte apaga os dados.** `test/helpers.ts` limpa as tabelas de domínio antes
  de cada caso: use um banco de desenvolvimento/descartável, nunca um ambiente
  com dados reais.
* **Ordenação.** Os testes de listagem ordenada comparam a resposta com
  `Intl.Collator`, reproduzindo a ordenação alfabética do locale `en_US.utf8`
  usado pelo `postgres:16`. Com a collation `C` do PostgreSQL a ordem seria por
  bytes e os casos falhariam.
* Comandos úteis: `npm run test:watch`, `npm run test:coverage`,
  `npm run typecheck`.

O pipeline de CI (`.github/workflows/ci.yml`) executa nesta ordem: validação do
schema, geração do Prisma Client, `typecheck`, build, migrations, seed e suíte
completa.

## Scripts

Os principais scripts disponíveis no projeto incluem:

```bash
npm run start:dev
npm run build
npm run start
npm run typecheck
npm test
npm run prisma:validate
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
```

> Ambiente com `node_modules` instalado em sistema de arquivos Windows/NTFS:
> os atalhos de `node_modules/.bin` não executam no Linux. Use
> `node node_modules/vitest/vitest.mjs run`,
> `node node_modules/typescript/bin/tsc --noEmit` e
> `node node_modules/prisma/build/index.js <comando>` no lugar de `npx`/`npm run`
> nesse caso (ou reinstale as dependências em um diretório nativo do Linux).

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
* [x] RBAC granular: 31 permissões e matriz de 3 roles
* [x] Módulo de veterinários
* [x] Módulo de tutores
* [x] Módulo de animais (inclui tutor, peso, alergias, medicações e vacinas)
* [x] Agendamentos
* [x] Consultas
* [x] Diagnósticos
* [x] Catálogos globais (espécies, raças, especialidades, alergias, medicamentos e vacinas)
* [x] Suíte de testes de API (Vitest + Supertest)
* [x] Pipeline de CI (validação, typecheck, build, migrations, seed e testes)
* [x] Ambiente local com Docker (Postgres + aplicação)

### Em desenvolvimento

* [ ] Frontend React — ainda não existe no repositório
* [ ] Integração frontend/backend

### Pendências com escopo indefinido

* [ ] Testes automatizados completos — a suíte de API existe e roda no CI; o
      critério de "completos" (por exemplo, testes end-to-end com Playwright,
      ferramenta planejada e ainda não instalada) não está definido
* [ ] Dockerização completa da aplicação — banco e aplicação já sobem com
      `docker compose`; o restante do que significa "completa" não está definido
* [ ] Preparação para deploy local

### Planejado

* [ ] Gestão clínica
* [ ] Prontuários
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
