# Arquitetura — Identidade, Autenticação e Autorização

## 1. Tenancy e Isolamento

### Estratégia

* PostgreSQL compartilhado com isolamento por `tenant_id`.
* Backend é responsável por garantir isolamento.
* Cross-tenant access deve ser bloqueado em todas as camadas.
* RLS será avaliado posteriormente como camada adicional.

### Regra de Isolamento

* Toda query que acessa dados de domínio (tutors, animals, appointments, etc.) deve incluir `WHERE tenant_id = ?`.
* O `tenant_id` é extraído do access token JWT e propagado pelo TenantGuard.
* Services recebem `tenant_id` como parâmetro obrigatório.
* Plataforma Admin não possui acesso automático a dados clínicos — precisa de UserTenant ativo para cada tenant que deseja acessar.

### Consequências

* Uma query sem `WHERE tenant_id` em dados de domínio é um bug de segurança.
* Testes de isolamento devem verificar que dados de um tenant não são retornados para outro tenant.
* Platform Admin não pode usar o mesmo fluxo de queries que usuários comuns — precisa de acesso explicitamente concedido.

---

## 2. Autenticação

### Fluxo de Login

```
1. POST /auth/login
   Entrada: { email, senha }
   Processo:
     - Buscar User por email
     - Verificar se isActive = true
     - Verificar senha com Argon2id
     - Buscar todos os UserTenant com status = 'active' para aquele User
   Saída: { user: { id, name, email }, tenants: [{ id, name, logo }] }

2. POST /auth/select-tenant
   Entrada: { tenantId }
   Processo:
     - Verificar que o User possui UserTenant ativo com aquele Tenant
     - Criar Session no banco (refresh token hash, tenantId, userAgent, ipAddress)
     - Gerar access token JWT com { sub: userId, tenantId, iat, exp }
   Saída: { accessToken, refreshToken }

3. POST /auth/refresh
   Entrada: refresh token (via HttpOnly cookie)
   Processo:
     - Buscar Session por refreshTokenHash (SHA-256)
     - Verificar que Session não está revogada
     - Verificar que Session não expirou
     - Gerar novo access token com mesmo tenantId
   Saída: { accessToken }

4. POST /auth/logout
   Entrada: refresh token (via HttpOnly cookie)
   Processo:
     - Buscar Session por refreshTokenHash
     - Marcar Session.revokedAt = now()
   Saída: 204 No Content
```

**Nota:** A Session é criada apenas no passo 2 (select-tenant), não no passo 1 (login). O login retorna a lista de tenants disponíveis. O access token e o refresh token são emitidos somente após a seleção do tenant.

### Onboarding (Criação de Conta + Tenant)

```
POST /auth/register
Entrada: { name, email, senha, tenantName, ...dados do tenant }
Processo:
  - Criar User
  - Criar Tenant
  - Criar UserTenant com status = 'active'
  - Criar UserTenantRole com roleId = ADMIN
Saída: { user, tenant, userTenant }
```

### Convites

```
POST /tenants/:tenantId/invites
Entrada: { email, roles: [roleId1, roleId2] }
Processo:
  - Verificar que o remetente tem permissão USER_MANAGE no tenant
  - Verificar se User com aquele email já existe
    - Se existe: criar UserTenant com status = 'pending'
    - Se não existe: criar UserTenant com status = 'pending' (usuário será criado quando aceitar)
  - Enviar email com link de convite (token com expiração de 7 dias)
Saída: 201 Created

POST /auth/accept-invite
Entrada: { inviteToken }
Processo:
  - Validar token do convite (não expirado)
  - Se User ainda não existe: criar User
  - Atualizar UserTenant.status = 'active'
  - Definir UserTenant.acceptedAt = now()
Saída: { user, tenant }
```

---

## 3. Sessões

### Tabela Session

| Campo | Descrição |
|---|---|
| id | UUID, PK |
| userId | FK para User |
| tenantId | FK para Tenant |
| refreshTokenHash | Hash SHA-256 do refresh token |
| userAgent | String do navegador/dispositivo |
| ipAddress | IP de origem |
| expiresAt | Data de expiração do refresh token |
| lastAccessAt | Último acesso à sessão |
| createdAt | Criação da sessão |
| revokedAt | Null = ativa. Preenchido = revogada |

### Armazenamento do Refresh Token

* Refresh token é uma string aleatória de 256 bits (gerada via `crypto.randomBytes(32)`).
* Armazenada no banco como hash SHA-256. Argon2id não é necessário — tokens aleatórios de alta entropia não precisam de work factor.
* Armazenada no frontend como HttpOnly cookie, não acessível via JavaScript.

### Revogação de Sessões

| Evento | Ação |
|---|---|
| Logout | Marcar sessão atual como `revokedAt = now()` |
| Desativação de User | Marcar todas as sessões do User como `revokedAt = now()` |
| Suspensão de UserTenant | Marcar sessões daquele tenant como `revokedAt = now()` |
| Revogação de UserTenant | Marcar sessões daquele tenant como `revokedAt = now()` |

### Validação de Sessão

A cada request com refresh token:
1. Buscar Session por `refreshTokenHash` (SHA-256 do token recebido).
2. Verificar `revokedAt IS NULL`.
3. Verificar `expiresAt > now()`.
4. Se válido: gerar novo access token.
5. Se inválido: retornar 401.

---

## 4. Tokens JWT

### Access Token

```json
{
  "sub": "uuid-do-user",
  "tenantId": "uuid-do-tenant",
  "iat": 1234567890,
  "exp": 1234568790
}
```

* Contém apenas: identificador do usuário e identificador do tenant.
* Não contém: roleId, permissões, dados do user, dados do tenant.
* Duração: 15 minutos (fixo).
* Assinado com chave secreta armazenada em variável de ambiente.
* O access token é independente da tabela Session — validação é feita pela assinatura JWT. A tabela Session é usada apenas para refresh e revogação.

### Refresh Token

* Não é JWT — é uma string aleatória.
* Armazenada apenas como hash SHA-256 no banco.
* Duração: 7 dias.
* Enviada ao backend via HttpOnly cookie.

---

## 5. Autorização

### Fluxo de Verificação

```
1. Request chega com Authorization: Bearer <access_token>

2. AuthGuard valida JWT (assinatura, expiração)
   → Extrai userId + tenantId

3. TenantGuard valida acesso ao tenant
   → SELECT FROM "UserTenant"
     WHERE "userId" = ? AND "tenantId" = ? AND "status" = 'active'
   → Se não existir: 403 Forbidden

4. PermissionGuard valida permissão específica (se aplicável)
   → Buscar UserTenantRole para aquele UserTenant
   → Buscar RolePermission para aquelas Roles
   → Verificar se a permissão necessária está na lista
   → Se não estiver: 403 Forbidden
```

### Caching de Permissões

* Permissões são globais e definidas pelo sistema — mudam raramente.
* Podem ser cacheadas em memória (Map no NestJS) ou Redis.
* Cache invalidado quando Role ou RolePermission é alterado.
* TTL recomendado: 5 minutos.

### Platform Admin

* Representado pelo campo `User.isPlatformAdmin`.
* Não há tabela `PlatformAdmin` separada.
* Verificação no backend: `user.isPlatformAdmin` (após buscar User por ID).
* Não possui permissões automáticas de tenant.
* Para acessar dados de um tenant, precisa de UserTenant ativo com role apropriada.
* Endpoints de suporte/administração podem ser protegidos por guard específico que verifica `isPlatformAdmin`.
* Esses endpoints bypassam a validação de tenant normal (usados para suporte e administração).

---

## 6. Roles

### Papéis Iniciais (MVP)

| Role | Descrição |
|---|---|
| ADMIN | Gestor do tenant. Acesso total dentro do tenant. |
| VETERINARIAN | Profissional que realiza atendimentos. |
| RECEPTIONIST | Atendente que gerencia cadastros e agendamentos. |

### Regras de Roles

* Roles são globais e definidas pelo sistema.
* Um User pode ter múltiplos papéis no mesmo Tenant (via múltiplos UserTenantRole).
* ADMIN pode ser combinado com VETERINARIAN ou RECEPTIONIST.
* Roles são atribuídas pelo Admin do tenant via endpoint dedicado.
* Roles não podem ser criadas por Tenants — apenas pelo sistema.

### Herança de Permissões

* Um usuário com múltiplos papéis possui a união de todas as permissões dos seus papéis.
* Ex: usuário com ADMIN + VETERINARIAN possui todas as permissões de ADMIN e todas de VETERINARIAN.

---

## 7. Permissions

### Modelo

Cada permissão é composta por `resource` + `action`:

| Campo | Descrição | Exemplo |
|---|---|---|
| key | Chave única no formato RESOURCE_ACTION | ANIMAL_CREATE |
| resource | Recurso do sistema | ANIMAL |
| action | Ação permitida | CREATE |

### Actions Padrão

| Action | Descrição |
|---|---|
| CREATE | Criar novo registro |
| READ | Visualizar registro |
| UPDATE | Atualizar registro |
| DELETE | Remover registro |
| MANAGE | Gerenciar (operações especiais que não se encaixam em CRUD) |

### Regras de Permissions

* Permissions são definidas pelo sistema e não podem ser criadas por Tenants.
* Todas as Roles usam o mesmo conjunto de Permissions.
* Permissions são granulares por recurso + ação.
* Um Usuário recebe Permissions através das Roles associadas ao seu UserTenant.
* Permissions não ficam no JWT — são consultadas no backend (com cache).

---

## 8. Contexto de Tenant no NestJS

### TenantGuard

Guard global que:
1. Extrai `userId` e `tenantId` do JWT.
2. Valida que o User possui UserTenant ativo com aquele Tenant.
3. Injeta `tenantId` no request.

### Uso em Controllers

```typescript
@UseGuards(TenantGuard)
@Controller('animals')
class AnimalController {
  @Get()
  findAll(@TenantId() tenantId: string) {
    return this.animalService.findAll(tenantId);
  }
}
```

### Uso em Services

Services recebem `tenantId` como parâmetro obrigatório em todas as queries de domínio:

```typescript
async findAll(tenantId: string) {
  return this.prisma.animal.findMany({
    where: { tenantId }
  });
}
```

### Plataforma Admin

* Endpoints de Platform Admin não usam TenantGuard.
* Usam PlatformAdminGuard que verifica `User.isPlatformAdmin`.
* Podem acessar dados cross-tenant.

---

## 9. Padrões de Segurança

### Senhas

* Armazenadas com Argon2id.
* Nunca em texto puro.
* Nunca retornadas em responses.
* Nunca registradas em logs.

### Tokens

* Access token: JWT com expiração fixa de 15 min.
* Refresh token: string aleatória, hash SHA-256 no banco, cookie HttpOnly.
* Nunca armazenados em localStorage.

### Logs

* Nunca registrar: senhas, tokens, refresh tokens, senhas de banco.
* Registrar: IPs, user agents, timestamps de login/logout.

### Validação

* Toda entrada externa deve ser validada no backend.
* Nunca confiar na validação do frontend.
* Validar: tipos, formatos, campos obrigatórios, consistência.

---

## 10. Tutor — Arquitetura

### Modelo

O Tutor possui uma identidade global mínima (TutorIdentity), mas o cadastro operacional existe por clínica.

```
TutorIdentity (global)
  │
  │ 1:N
  ▼
Tutor (tenant-scoped)
  │
  ├──▶ TutorPhone (tenant-scoped)
  ├──▶ TutorAddress (tenant-scoped)
  └──▶ TutorEmergencyContact (tenant-scoped)
```

### TutorIdentity

* Contém APENAS: nome, tipo de documento (CPF/CNPJ), número do documento normalizado.
* Não contém: telefone, email, endereço, ou quaisquer dados de contato.
* Finalidade: viabilizar busca global por CPF/CNPJ sem compartilhar dados entre tenants.
* `documentNumber` é único globalmente.

### Busca Global por CPF

Fluxo:

1. Clínica informa CPF.
2. Backend busca `TutorIdentity` por `documentNumber` (normalizado).
3. Se não encontrar: cadastra `TutorIdentity` + `Tutor` no tenant.
4. Se encontrar:
   - Verifica se já existe `Tutor` com aquele `tutorIdentityId` no tenant atual.
   - Se existir: retorna "tutor já cadastrado nesta clínica".
   - Se não existir: retorna "este CPF já possui cadastro em outro estabelecimento" **sem expor nome, telefone, email ou quaisquer dados do Tutor de outro tenant**.
5. A clínica pode prosseguir criando o `Tutor` local com aquele `tutorIdentityId`.

### Consequência de Alteração do Nome

Alterar o nome global do Tutor altera a identidade compartilhada e, consequentemente, o nome visualizado por todas as clínicas que referenciam essa identidade. A aplicação deve documentar essa consequência na interface.

### Isolamento

* O `Tutor` é tenant-scoped. Service recebe `tenantId` como parâmetro obrigatório.
* `TutorPhone`, `TutorAddress`, `TutorEmergencyContact` são tenant-scoped.
* Queries devem incluir `WHERE tenantId = ?`.
* Uma clínica não pode visualizar ou editar dados do Tutor de outra clínica.

---

## 11. Animal — Arquitetura

### Modelo

```
Animal (global)
  │
  ├──▶ TenantAnimal (tenant-scoped)
  ├──▶ AnimalTutor (tenant-scoped)
  ├──▶ AnimalWeightRecord (global, com tenantId)
  ├──▶ AnimalAllergy (global)
  ├──▶ AnimalMedication (global)
  └──▶ AnimalVaccination (global)
```

### Dados Globais vs. Tenant-Scoped

**Globais (no Animal):**
nome, espécie, raça, sexo, castração, data de nascimento, microchip, foto, cor/pelagem, porte, status, data de óbito, internalCode.

**Tenant-scoped (no TenantAnimal):**
status do vínculo (ACTIVE/INACTIVE), observações clínicas privadas, notes.

**Tenant-scoped (no AnimalTutor):**
vínculo Tutor ↔ Animal com histórico.

**Globais com rastreabilidade:**
peso (AnimalWeightRecord com tenantId), alergias (AnimalAllergy com registeredByTenantId), medicamentos (AnimalMedication com registeredByTenantId), vacinas (AnimalVaccination com registeredByTenantId).

### internalCode

* `internalCode` é único GLOBALMENTE, não por tenant.
* Todo Animal possui um `internalCode` gerado pelo sistema.
* Não é editável pelo usuário (gerado automaticamente).

### Microchip

* `microchip` é único globalmente quando preenchido.
* Prisma ignora NULL em unique constraints — dois Animais podem ter microchip NULL.
* Quando um microchip é cadastrado e já existe em outro Animal:
  - Detectar conflito.
  - NÃO executar merge automático.
  - Exigir confirmação explícita.
  - Registrar operação de consolidação/merge com auditoria.

### Status

* `Animal.status` (GLOBAL): ACTIVE, DECEASED, INACTIVE.
* `TenantAnimal.status` (TENANT-SCOPED): ACTIVE, INACTIVE.
* `dateOfDeath` e `Animal.status` são independentes.
* Preencher `dateOfDeath` NÃO altera automaticamente `Animal.status`.

### Isolamento

* `Animal` é global — não possui `tenantId`.
* `TenantAnimal` é tenant-scoped — service recebe `tenantId`.
* `AnimalTutor` é tenant-scoped — service recebe `tenantId`.
* Dados compartilhados (peso, alergias, medicamentos, vacinas) são globais, mas com `tenantId` ou `registeredByTenantId` para rastreabilidade.
* A visibilidade de dados compartilhados entre clínicas é controlada pela aplicação (uma clínica com `TenantAnimal` para aquele Animal pode acessar os dados compartilhados).

---

## 12. Dados Compartilhados — Arquitetura

### Peso

```
AnimalWeightRecord (global)
  animalId → Animal
  tenantId → Tenant (clínica que registrou)
  recordedBy → User (usuário que registrou)
  weight, recordedAt, notes
```

* Peso atual é derivado do último `WeightRecord` (ordenado por `recordedAt`).
* Não há campo `currentWeight` no Animal.
* Todas as clínicas com `TenantAnimal` para aquele Animal podem consultar o histórico.

### Alergias

```
Allergy (global — catálogo)
  id, name (UQ), description

AnimalAllergy (global)
  animalId → Animal
  allergyId → Allergy
  registeredByTenantId → Tenant
  registeredByUserId → User
  severity, description, notes, registeredAt
```

* `UNIQUE (animalId, allergyId)` — mesma alergia não registrada duas vezes.
* Catálogo global compartilhado entre tenants.

### Medicamentos

```
Medication (global — catálogo)
  id, name (UQ), description

AnimalMedication (global)
  animalId → Animal
  medicationId → Medication
  registeredByTenantId → Tenant
  registeredByUserId → User
  dosage, frequency, route, startDate, endDate, notes, registeredAt
```

* Suporta múltiplos registros ao longo do tempo.
* `endDate` null = em uso contínuo.
* Preserva histórico completo.

### Vacinas

```
Vaccine (global — catálogo)
  id, name (UQ), description

AnimalVaccination (global)
  animalId → Animal
  vaccineId → Vaccine
  registeredByTenantId → Tenant
  registeredByUserId → User
  applicationDate, lotNumber, nextDoseDate, notes, registeredAt
```

* `UNIQUE (animalId, vaccineId, applicationDate)` — mesma vacina não aplicada duas vezes no mesmo dia.
* Múltiplas aplicações da mesma vacina ao longo da vida.
