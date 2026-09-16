---

name: database
description: Orienta modelagem PostgreSQL, Prisma, migrations, relacionamentos e integridade dos dados do ERP.
--------------------------------------------------------------------------------------------------------------

# Database

## Stack

* PostgreSQL
* Prisma ORM

## Princípios

O banco deve preservar:

* integridade;
* consistência;
* relacionamentos;
* histórico quando necessário;
* facilidade de manutenção.

## Multi-tenancy

A estratégia de multi-tenancy é PostgreSQL compartilhado com isolamento por `tenant_id`.

Antes de adicionar `tenantId` a uma tabela, verificar se a entidade é realmente tenant-scoped ou se pertence ao escopo global.

Consultar `docs/domain-model.md` para o escopo de cada entidade.

## Escopo das Entidades

**Global (sem tenantId):**
* User
* Tenant
* UserTenant
* UserTenantRole
* Role
* Permission
* RolePermission
* Veterinarian
* VeterinarianSpecialty
* Specialty
* TutorIdentity
* Animal
* Species
* Breed
* Allergy
* Medication
* Vaccine

**Tenant-scoped (com tenantId):**
* Tenant
* Tutor
* TutorPhone
* TutorAddress
* TutorEmergencyContact
* TenantVeterinarian
* TenantAnimal
* AnimalTutor
* Session

**Global com rastreabilidade de proveniência:**
Essas entidades são globais e compartilhadas entre tenants, mas possuem `tenantId` ou `registeredByTenantId` para indicar qual clínica registrou a informação.

* AnimalWeightRecord — `tenantId` indica a clínica que registrou o peso
* AnimalAllergy — `registeredByTenantId` indica a clínica que registrou a alergia
* AnimalMedication — `registeredByTenantId` indica a clínica que registrou o medicamento
* AnimalVaccination — `registeredByTenantId` indica a clínica que registrou a vacinação

## Antes de alterar o banco

1. inspecionar o schema atual;
2. verificar migrations existentes;
3. localizar dependências;
4. verificar impacto nos dados;
5. verificar impacto na API;
6. verificar impacto no frontend.

## Prisma

Utilizar Prisma como ORM padrão do projeto.

Não criar SQL bruto quando Prisma resolver claramente a operação.

SQL parametrizado pode ser utilizado quando necessário para uma operação que não seja adequadamente expressa através do ORM.

## Migrations

Alterações estruturais devem ser realizadas através de migrations.

Não editar manualmente o banco de produção para corrigir problemas de schema.

Não apagar migrations existentes sem compreender o impacto.

## Seed

O seed é executado explicitamente com `prisma db seed`.

Não assumir que o seed roda automaticamente durante `prisma migrations dev` ou `prisma migrate dev`.

O seed deve usar `upsert` para garantir idempotência.

Consultar `prisma/seed.ts` para a lista de dados iniciais (roles, permissions, specialties).

## Modelagem

Utilizar adequadamente:

* primary keys;
* foreign keys;
* unique constraints;
* índices;
* relações;
* nullability;
* defaults.

Não criar relações artificiais apenas para simplificar uma consulta.

## Integridade

A aplicação não deve ser a única responsável por integridade fundamental dos dados quando essa integridade puder ser garantida pelo PostgreSQL.

## Dados históricos

Não sobrescrever ou excluir dados históricos importantes sem requisito explícito.

## Conhecimento de SQL

Prisma não elimina a necessidade de compreender SQL.

Consultas complexas devem ser avaliadas tanto do ponto de vista do ORM quanto do banco.
