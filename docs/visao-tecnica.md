# Visão técnica

Capítulos técnicos do projeto: arquitetura, multi-tenancy, autenticação, autorização, modelo de domínio, estrutura de pastas e banco de dados.

Para o detalhamento de identidade, sessões, tokens e RLS, ver `architecture.md` e `rls-evaluation.md`. Para as regras de negócio, `business-rules.md`.

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
Lista de tenants disponíveis + selectionToken
   ↓
Seleção do tenant (Authorization: Bearer <selectionToken>)
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

VETERINARIAN_CREATE
VETERINARIAN_READ
VETERINARIAN_UPDATE
VETERINARIAN_DEACTIVATE

APPOINTMENT_CREATE
APPOINTMENT_READ
APPOINTMENT_UPDATE

CONSULTATION_CREATE
CONSULTATION_READ
CONSULTATION_UPDATE

DIAGNOSIS_CREATE
DIAGNOSIS_READ
DIAGNOSIS_UPDATE
DIAGNOSIS_DEACTIVATE

ANIMAL_WEIGHT_RECORD_CREATE
ANIMAL_WEIGHT_RECORD_READ

ANIMAL_ALLERGY_CREATE
ANIMAL_ALLERGY_READ

ANIMAL_MEDICATION_CREATE
ANIMAL_MEDICATION_READ

ANIMAL_VACCINATION_CREATE
ANIMAL_VACCINATION_READ
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

