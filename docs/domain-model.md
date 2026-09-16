# Modelo de Domínio

## Visão Geral

O modelo de domínio é composto por entidades organizadas em três camadas:

1. **Identidade e Autorização** — User, Tenant, UserTenant, UserTenantRole, Session, Role, Permission, RolePermission
2. **Domínio Veterinário — Identidades Globais** — Veterinarian, Specialty, VeterinarianSpecialty, TenantVeterinarian, TutorIdentity, Animal, Species, Breed
3. **Domínio Veterinário — Cadastros por Clínica** — Tutor, TutorPhone, TutorAddress, TutorEmergencyContact, TenantAnimal, AnimalTutor
4. **Domínio Veterinário — Dados Compartilhados** — AnimalWeightRecord, AnimalAllergy, AnimalMedication, AnimalVaccination
5. **Domínio Veterinário — Catálogos** — Allergy, Medication, Vaccine

---

## 1. Identidade e Autorização

### User

**Responsabilidade:** Identidade única de uma pessoa no sistema. Uma pessoa = um User, independentemente de quantos tenants possui vínculo.

| Campo | Obrigatório | Descrição |
|---|---|---|
| id | Sim | Identificador único global (UUID) |
| name | Sim | Nome exibido no sistema (ex: tela de perfil, navbar) |
| email | Sim | Endereço de email, único globalmente |
| passwordHash | Sim | Senha armazenada com Argon2id |
| phone | Não | Telefone de contato |
| isActive | Sim | Se false, usuário não pode fazer login |
| isPlatformAdmin | Sim | Se true, possui privilégios de administrador da plataforma |
| createdAt | Sim | Data de criação do registro |
| updatedAt | Sim | Data da última atualização |

**Constraints:**
- `email` UNIQUE

**Escopo:** Global

**Relacionamentos:**
- 1:N com UserTenant
- 1:1 com Veterinarian (nullable)
- 1:N com Session

---

### Tenant

**Responsabilidade:** Estabelecimento veterinário. É o escopo de dados e operações do sistema.

| Campo | Obrigatório | Descrição |
|---|---|---|
| id | Sim | Identificador único global (UUID) |
| name | Sim | Nome do estabelecimento |
| cpf | Não | CPF do responsável (11 dígitos) |
| cnpj | Não | CNPJ do estabelecimento (14 dígitos) |
| addressLine1 | Sim | Logradouro e número |
| addressLine2 | Não | Complemento, bairro |
| city | Sim | Cidade |
| state | Sim | Estado (UF) |
| zipCode | Sim | CEP |
| phone | Não | Telefone do estabelecimento |
| email | Não | Email institucional |
| logoUrl | Não | URL do logo do estabelecimento |
| isActive | Sim | Se false, tenant está desativado |
| createdAt | Sim | Data de criação do registro |
| updatedAt | Sim | Data da última atualização |

**Constraints:**
- `cpf IS NOT NULL OR cnpj IS NOT NULL`
- `cpf` e `cnpj` UNIQUE

**Escopo:** Global (é o escopo em si)

**Relacionamentos:**
- 1:N com UserTenant
- 1:N com TenantVeterinarian

---

### UserTenant

**Responsabilidade:** Vínculo entre User e Tenant.

| Campo | Obrigatório | Descrição |
|---|---|---|
| id | Sim | Identificador único do vínculo (UUID) |
| userId | Sim | FK para User |
| tenantId | Sim | FK para Tenant |
| status | Sim | Estado do vínculo |
| invitedAt | Não | Data em que o convite foi enviado |
| acceptedAt | Não | Data em que o usuário aceitou o convite |
| createdAt | Sim | Data de criação do registro |
| updatedAt | Sim | Data da última atualização |

**Constraints:**
- `UNIQUE (userId, tenantId)`
- `userId` FK para User
- `tenantId` FK para Tenant

**Valores de `status` (enum UserTenantStatus):**
- `PENDING` — convite enviado, aguardando aceitação
- `ACTIVE` — vínculo ativo
- `SUSPENDED` — vínculo suspenso temporariamente
- `REVOKED` — vínculo revocado permanentemente

**Escopo:** Global (tabela pivot)

---

### UserTenantRole

**Responsabilidade:** Registra qual(is) papel(is) o usuário exerce dentro daquele vínculo.

| Campo | Obrigatório | Descrição |
|---|---|---|
| id | Sim | Identificador do registro (UUID) |
| userTenantId | Sim | FK para UserTenant |
| roleId | Sim | FK para Role |
| assignedAt | Sim | Data em que o papel foi atribuído |

**Constraints:**
- `UNIQUE (userTenantId, roleId)`

**Escopo:** Global (tabela pivot)

---

### Session

**Responsabilidade:** Controlar sessão ativa do usuário.

| Campo | Obrigatório | Descrição |
|---|---|---|
| id | Sim | Identificador da sessão (UUID) |
| userId | Sim | FK para User |
| tenantId | Sim | FK para Tenant |
| refreshTokenHash | Sim | Hash SHA-256 do refresh token |
| userAgent | Não | String do navegador/dispositivo |
| ipAddress | Não | IP de origem da request |
| expiresAt | Sim | Data de expiração do refresh token |
| lastAccessAt | Sim | Última vez que a sessão foi utilizada |
| createdAt | Sim | Data de criação da sessão |
| revokedAt | Não | Null = sessão ativa. Preenchido = sessão revogada |

**Escopo:** Tenant-scoped

---

### Role

| Campo | Obrigatório | Descrição |
|---|---|---|
| id | Sim | Identificador da role (UUID) |
| name | Sim | Nome único da role |
| description | Não | Descrição do papel |
| createdAt | Sim | Data de criação do registro |

**Constraints:** `name` UNIQUE

**Registros iniciais:** ADMIN, VETERINARIAN, RECEPTIONIST

**Escopo:** Global

---

### Permission

| Campo | Obrigatório | Descrição |
|---|---|---|
| id | Sim | Identificador da permissão (UUID) |
| key | Sim | Chave única RESOURCE_ACTION |
| resource | Sim | Recurso do sistema |
| action | Sim | Ação permitida |
| description | Não | Descrição da permissão |

**Constraints:** `key` UNIQUE; `resource` + `action` UNIQUE

**Escopo:** Global

---

### RolePermission

| Campo | Obrigatório | Descrição |
|---|---|---|
| roleId | Sim | FK para Role |
| permissionId | Sim | FK para Permission |

**Constraints:** `UNIQUE (roleId, permissionId)`

**Escopo:** Global

---

## 2. Domínio Veterinário — Identidades Globais

### Veterinarian

**Responsabilidade:** Identidade profissional do veterinário. Pode existir sem estar vinculado a um User.

| Campo | Obrigatório | Descrição |
|---|---|---|
| id | Sim | Identificador único (UUID) |
| name | Sim | Nome profissional do veterinário |
| crmv | Sim | Registro no CRMV, único globalmente |
| bio | Não | Biografia ou descrição profissional |
| userId | Não | FK para User (único, nullable) |
| createdAt | Sim | Data de criação do registro |
| updatedAt | Sim | Data da última atualização |

**Constraints:**
- `crmv` UNIQUE
- `userId` UNIQUE (nullable)

**Escopo:** Global

**Relacionamentos:**
- 1:1 com User (nullable)
- N:M com Specialty (via VeterinarianSpecialty)
- N:M com Tenant (via TenantVeterinarian)

---

### Specialty

| Campo | Obrigatório | Descrição |
|---|---|---|
| id | Sim | Identificador único (UUID) |
| name | Sim | Nome da especialidade (único) |
| description | Não | Descrição da especialidade |
| createdAt | Sim | Data de criação do registro |

**Constraints:** `name` UNIQUE

**Escopo:** Global

---

### VeterinarianSpecialty

| Campo | Obrigatório | Descrição |
|---|---|---|
| veterinarianId | Sim | FK para Veterinarian |
| specialtyId | Sim | FK para Specialty |

**Constraints:** `UNIQUE (veterinarianId, specialtyId)`

**Escopo:** Global

---

### TenantVeterinarian

**Responsabilidade:** Vincular Veterinarian a Tenant. Informações específicas da atuação.

| Campo | Obrigatório | Descrição |
|---|---|---|
| id | Sim | Identificador do vínculo (UUID) |
| tenantId | Sim | FK para Tenant |
| veterinarianId | Sim | FK para Veterinarian |
| joinedAt | Sim | Data de início da atuação |
| isActive | Sim | Se false, veterinário inativo naquela clínica |
| schedule | Não | Horários de atendimento (JSON) |
| room | Não | Sala ou local de atendimento |
| function | Não | Função exercida (texto livre) |
| notes | Não | Observações específicas do vínculo |
| createdAt | Sim | |
| updatedAt | Sim | |

**Constraints:** `UNIQUE (tenantId, veterinarianId)`

**Escopo:** Tenant-scoped

---

### TutorIdentity

**Responsabilidade:** Identidade documental global do Tutor. Contém apenas nome e documento (CPF/CNPJ). Usada para busca global por CPF/CNPJ sem expor dados de outro tenant.

| Campo | Obrigatório | Descrição |
|---|---|---|
| id | Sim | Identificador único global (UUID) |
| name | Sim | Nome do tutor (pessoa física ou empresa) |
| documentType | Sim | Enum: CPF ou CNPJ |
| documentNumber | Sim | Número do documento normalizado |
| createdAt | Sim | Data de criação do registro |

**Constraints:**
- `documentNumber` UNIQUE (dois tutores não podem ter mesmo documento)
- `documentType` + `documentNumber` UNIQUE (composto)

**Escopo:** Global

**Nota:** Este registro contém APENAS nome e documento. Telefone, email, endereço e quaisquer outros dados NUNCA ficam nesta entidade. A finalidade é viabilizar busca global por CPF/CNPJ sem compartilhar dados clínicos ou de contato entre tenants.

**Relacionamentos:**
- 1:N com Tutor (um TutorIdentity pode ter múltiplos Tutor, um por clínica)

---

### Animal

**Responsabilidade:** Entidade global do animal. Dados compartilháveis entre clínicas. O mesmo animal pode ser atendido por múltiplas clínicas.

| Campo | Obrigatório | Descrição |
|---|---|---|
| id | Sim | Identificador único global (UUID) |
| internalCode | Sim | Código interno único global no sistema |
| name | Não | Nome do animal |
| speciesId | FK Species | Sim | Espécie |
| breedId | FK Breed | Sim | Raça |
| sex | Enum | Sim | MALE, FEMALE, UNKNOWN |
| isCastrated | Boolean | Sim | Se true, animal é castrado |
| castrationDate | Date | Não | Data de castração (quando aplicável) |
| dateOfBirth | Date | Não | Data de nascimento |
| approximateAge | String | Não | Idade aproximada (quando data exata desconhecida) |
| microchip | String | Não | Microchip (único globalmente quando preenchido) |
| photoUrl | String | Não | URL da foto |
| color | String | Não | Cor/pelagem |
| size | Enum | Não | SMALL, MEDIUM, LARGE |
| dateOfDeath | Date | Não | Data de óbito |
| status | Enum | Sim | ACTIVE, DECEASED, INACTIVE |
| notes | String | Não | Observações apropriadas ao escopo global |
| createdAt | Sim | Data de criação do registro |
| updatedAt | Sim | Data da última atualização |

**Constraints:**
- `internalCode` UNIQUE
- `microchip` UNIQUE (quando não nulo — Prisma ignora NULL em unique)
- `isCastrated` DEFAULT false
- `status` DEFAULT ACTIVE

**Escopo:** Global

**Notas importantes:**
- `status` e `dateOfDeath` são campos INDEPENDENTES. Preencher `dateOfDeath` NÃO altera automaticamente `status`.
- `internalCode` é único GLOBALMENTE, não por tenant.
- Dados aqui são compartilháveis entre clínicas. Dados privados ficam em `TenantAnimal`.
- Castração (`isCastrated`, `castrationDate`) pertence ao Animal global, não ao TenantAnimal.

**Relacionamentos:**
- N:M com Tenant (via TenantAnimal)
- N:M com Tutor (via AnimalTutor)
- N:1 com Species
- N:1 com Breed
- 1:N com AnimalWeightRecord
- 1:N com AnimalAllergy
- 1:N com AnimalMedication
- 1:N com AnimalVaccination

---

### Species

**Responsabilidade:** Cadastro de espécies veterinárias. Entidade global e dinâmica.

| Campo | Obrigatório | Descrição |
|---|---|---|
| id | Sim | Identificador único (UUID) |
| name | Sim | Nome da espécie (único) |
| scientificName | Não | Nome científico |
| createdAt | Sim | Data de criação do registro |

**Constraints:** `name` UNIQUE

**Escopo:** Global

**Nota:** Não há lista fixa inicial obrigatória. Espécies são cadastradas dinamicamente por usuários autorizados.

**Relacionamentos:**
- 1:N com Breed
- 1:N com Animal

---

### Breed

**Responsabilidade:** Cadastro de raças. Entidade global, padronizada e relacionada a Species.

| Campo | Obrigatório | Descrição |
|---|---|---|
| id | Sim | Identificador único (UUID) |
| name | Sim | Nome da raça |
| speciesId | FK Species | Sim | Espécie à qual pertence |
| createdAt | Sim | Data de criação do registro |

**Constraints:** `UNIQUE (speciesId, name)`

**Escopo:** Global

**Nota:** Deve existir explicitamente o registro "Sem raça definida" para cada Species. Não modelar raça como texto livre no Animal.

**Relacionamentos:**
- N:1 com Species
- 1:N com Animal

---

## 3. Domínio Veterinário — Cadastros por Clínica

### Tutor

**Responsabilidade:** Cadastro operacional do Tutor em uma clínica. Referencia uma TutorIdentity global.

| Campo | Obrigatório | Descrição |
|---|---|---|
| id | Sim | Identificador único (UUID) |
| tenantId | FK Tenant | Sim | Clínica à qual pertence |
| tutorIdentityId | FK TutorIdentity | Sim | Identidade global do tutor |
| email | String | Não | Email (único por tenant) |
| additionalInfo | String | Não | RG e outros documentos |
| isActive | Boolean | Sim | Se false, tutor inativo naquela clínica |
| notes | String | Não | Observações |
| createdAt | Sim | Data de criação do registro |
| updatedAt | Sim | Data da última atualização |

**Constraints:**
- `UNIQUE (tenantId, tutorIdentityId)` — mesmo tutor não pode ter dois cadastros no mesmo tenant
- `UNIQUE (tenantId, email)` — email único por tenant (quando preenchido)
- `tenantId` FK para Tenant
- `tutorIdentityId` FK para TutorIdentity

**Escopo:** Tenant-scoped

**Nota sobre nome:** O nome do Tutor pertence à `TutorIdentity`. Alterar o nome global do Tutor altera a identidade compartilhada e, consequentemente, o nome visualizado por todas as clínicas que referenciam essa identidade.

**Relacionamentos:**
- N:1 com TutorIdentity
- N:1 com Tenant
- 1:N com TutorPhone
- 1:N com TutorAddress
- 1:N com TutorEmergencyContact
- 1:N com AnimalTutor

---

### TutorPhone

**Responsabilidade:** Telefones do Tutor vinculados ao cadastro da clínica.

| Campo | Obrigatório | Descrição |
|---|---|---|
| id | Sim | Identificador único (UUID) |
| tutorId | FK Tutor | Sim | Tutor ao qual pertence |
| tenantId | FK Tenant | Sim | Para isolamento |
| number | String | Sim | Número do telefone |
| label | String | Não | Ex: "celular", "trabalho" |
| isPrimary | Boolean | Sim | Se true, telefone principal |
| createdAt | Sim | Data de criação do registro |

**Constraints:**
- `UNIQUE (tenantId, tutorId, number)` — mesmo telefone não duplicado para o mesmo tutor no mesmo tenant
- `tutorId` FK para Tutor
- `tenantId` FK para Tenant

**Escopo:** Tenant-scoped

---

### TutorAddress

**Responsabilidade:** Endereços do Tutor vinculados ao cadastro da clínica.

| Campo | Obrigatório | Descrição |
|---|---|---|
| id | Sim | Identificador único (UUID) |
| tutorId | FK Tutor | Sim | Tutor ao qual pertence |
| tenantId | FK Tenant | Sim | Para isolamento |
| label | String | Não | Ex: "residencial", "comercial" |
| addressLine1 | String | Sim | Logradouro e número |
| addressLine2 | String | Não | Complemento, bairro |
| city | String | Sim | Cidade |
| state | String | Sim | Estado (UF) |
| zipCode | String | Sim | CEP |
| isPrimary | Boolean | Sim | Se true, endereço principal |
| createdAt | Sim | Data de criação do registro |

**Constraints:**
- `tutorId` FK para Tutor
- `tenantId` FK para Tenant

**Escopo:** Tenant-scoped

---

### TutorEmergencyContact

**Responsabilidade:** Contatos de emergência do Tutor vinculados ao cadastro da clínica.

| Campo | Obrigatório | Descrição |
|---|---|---|
| id | Sim | Identificador único (UUID) |
| tutorId | FK Tutor | Sim | Tutor ao qual pertence |
| tenantId | FK Tenant | Sim | Para isolamento |
| name | String | Sim | Nome do contato |
| phone | String | Sim | Telefone |
| relationship | String | Não | Parentesco/vínculo |
| createdAt | Sim | Data de criação do registro |

**Constraints:**
- `tutorId` FK para Tutor
- `tenantId` FK para Tenant

**Escopo:** Tenant-scoped

---

### TenantAnimal

**Responsabilidade:** Vínculo de um Animal com uma clínica. Dados específicos da relação entre o animal e aquela clínica.

| Campo | Obrigatório | Descrição |
|---|---|---|
| id | Sim | Identificador único (UUID) |
| tenantId | FK Tenant | Sim | Clínica |
| animalId | FK Animal | Sim | Animal global |
| status | Enum | Sim | ACTIVE, INACTIVE |
| notes | String | Não | Observações clínicas privadas |
| createdAt | Sim | Data de criação do registro |
| updatedAt | Sim | Data da última atualização |

**Constraints:**
- `UNIQUE (tenantId, animalId)` — mesmo animal não pode ter dois registros no mesmo tenant
- `tenantId` FK para Tenant
- `animalId` FK para Animal

**Escopo:** Tenant-scoped

**Nota:** Não colocar no TenantAnimal dados que foram definidos como globais: microchip, castração, nome global, espécie, raça, sexo, data de nascimento, foto, peso, alergias, medicações, vacinação. Esses dados ficam no Animal global ou em tabelas associadas ao Animal.

**Relacionamentos:**
- N:1 com Tenant
- N:1 com Animal

---

### AnimalTutor

**Responsabilidade:** Vínculo entre Tutor e Animal dentro de uma clínica. Preserva histórico de tutores.

| Campo | Obrigatório | Descrição |
|---|---|---|
| id | Sim | Identificador único (UUID) |
| tenantId | FK Tenant | Sim | Clínica |
| animalId | FK Animal | Sim | Animal global |
| tutorId | FK Tutor | Sim | Tutor (tenant-scoped) |
| startedAt | Date | Sim | Data de início do vínculo |
| endedAt | Date | Não | Null = vínculo ativo. Preenchido = vínculo encerrado |
| isActive | Boolean | Sim | Se true, vínculo atual |
| notes | String | Não | Observações sobre o vínculo |
| createdAt | Sim | Data de criação do registro |

**Constraints:**
- Índice parcial único: `CREATE UNIQUE INDEX idx_animal_tutor_active ON "AnimalTutor" ("tenantId", "animalId", "tutorId") WHERE "isActive" = true` — impede que dois vínculos ativos existam para a mesma combinação
- `tenantId` FK para Tenant
- `animalId` FK para Animal
- `tutorId` FK para Tutor

**Escopo:** Tenant-scoped

**Notas:**
- Todo Animal deve possuir pelo menos um Tutor (validação de aplicação, não de banco).
- Não é obrigatório existir um "Tutor principal".
- Um Animal pode ter múltiplos tutores (N:M).
- Um Animal pode mudar de Tutor: vínculo anterior recebe `isActive = false` e `endedAt` preenchido; novo vínculo é criado com `isActive = true`.
- Tutores anteriores permanecem no histórico.
- A constraint de unicidade ativa é implementada via índice parcial unique, não via `UNIQUE (tenantId, animalId, tutorId, isActive)` — esta última impediria múltiplos vínculos inativos, o que não é desejado.

---

## 4. Domínio Veterinário — Dados Compartilhados

### AnimalWeightRecord

**Responsabilidade:** Histórico de peso do Animal. Compartilhado entre clínicas. Cada registro preserva a origem.

| Campo | Obrigatório | Descrição |
|---|---|---|
| id | Sim | Identificador único (UUID) |
| animalId | FK Animal | Sim | Animal global |
| tenantId | FK Tenant | Sim | Clínica que registrou |
| weight | Decimal | Sim | Peso em kg |
| recordedAt | Date | Sim | Data da medição |
| recordedBy | FK User | Não | Usuário que registrou |
| notes | String | Não | Observações |
| createdAt | Sim | Data de criação do registro |

**Constraints:**
- `animalId` FK para Animal
- `tenantId` FK para Tenant
- `recordedBy` FK para User

**Escopo:** Global (associado ao Animal, com tenantId para rastreabilidade)

**Nota:** Não há campo `currentWeight` no Animal. O peso atual é derivado do último WeightRecord (ordenado por `recordedAt`). Clínicas podem adicionar novas medições sem sobrescrever medições anteriores. Todas as clínicas autorizadas a acessar o Animal podem consultar o histórico global de peso.

---

### Allergy

**Responsabilidade:** Catálogo global de alergias.

| Campo | Obrigatório | Descrição |
|---|---|---|
| id | Sim | Identificador único (UUID) |
| name | Sim | Nome da alergia (único) |
| description | String | Não | Descrição |
| createdAt | Sim | Data de criação do registro |

**Constraints:** `name` UNIQUE

**Escopo:** Global

---

### AnimalAllergy

**Responsabilidade:** Vínculo entre Animal e Allergy. Dados compartilhados entre clínicas.

| Campo | Obrigatório | Descrição |
|---|---|---|
| id | Sim | Identificador único (UUID) |
| animalId | FK Animal | Sim | Animal global |
| allergyId | FK Allergy | Sim | Alergia do catálogo |
| severity | String | Não | Gravidade (leve, moderada, grave) |
| description | String | Não | Descrição livre da alergia |
| notes | String | Não | Observações |
| registeredAt | Date | Sim | Data do registro |
| registeredByTenantId | FK Tenant | Sim | Clínica que registrou |
| registeredByUserId | FK User | Não | Usuário que registrou |
| createdAt | Sim | Data de criação do registro |

**Constraints:**
- `UNIQUE (animalId, allergyId)` — mesma alergia não pode ser registrada duas vezes para o mesmo animal
- `animalId` FK para Animal
- `allergyId` FK para Allergy
- `registeredByTenantId` FK para Tenant
- `registeredByUserId` FK para User

**Escopo:** Global (compartilhado entre clínicas)

---

### Medication

**Responsabilidade:** Catálogo global de medicamentos.

| Campo | Obrigatório | Descrição |
|---|---|---|
| id | Sim | Identificador único (UUID) |
| name | Sim | Nome do medicamento (único) |
| description | String | Não | Descrição |
| createdAt | Sim | Data de criação do registro |

**Constraints:** `name` UNIQUE

**Escopo:** Global

---

### AnimalMedication

**Responsabilidade:** Registro de medicamentos em uso do Animal. Dados compartilhados entre clínicas. Suporta múltiplos registros ao longo do tempo.

| Campo | Obrigatório | Descrição |
|---|---|---|
| id | Sim | Identificador único (UUID) |
| animalId | FK Animal | Sim | Animal global |
| medicationId | FK Medication | Sim | Medicamento do catálogo |
| dosage | String | Sim | Dosagem |
| frequency | String | Sim | Frequência |
| route | String | Não | Via de administração |
| startDate | Date | Sim | Data de início |
| endDate | Date | Não | Null = em uso contínuo |
| notes | String | Não | Observações |
| registeredAt | Date | Sim | Data do registro |
| registeredByTenantId | FK Tenant | Sim | Clínica que registrou |
| registeredByUserId | FK User | Não | Usuário que registrou |
| createdAt | Sim | Data de criação do registro |
| updatedAt | Sim | Data da última atualização |

**Constraints:**
- `animalId` FK para Animal
- `medicationId` FK para Medication
- `registeredByTenantId` FK para Tenant
- `registeredByUserId` FK para User

**Escopo:** Global (compartilhado entre clínicas)

**Nota:** Permite múltiplos registros ao longo do tempo (medicamento iniciado, continuado, encerrado, novo ciclo). Não substitui registros anteriores. Preserva histórico.

---

### Vaccine

**Responsabilidade:** Catálogo global de vacinas.

| Campo | Obrigatório | Descrição |
|---|---|---|
| id | Sim | Identificador único (UUID) |
| name | Sim | Nome da vacina (único) |
| description | String | Não | Descrição |
| createdAt | Sim | Data de criação do registro |

**Constraints:** `name` UNIQUE

**Escopo:** Global

---

### AnimalVaccination

**Responsabilidade:** Registro de vacinação do Animal. Dados compartilhados entre clínicas. Suporta múltiplas aplicações da mesma vacina ao longo da vida.

| Campo | Obrigatório | Descrição |
|---|---|---|
| id | Sim | Identificador único (UUID) |
| animalId | FK Animal | Sim | Animal global |
| vaccineId | FK Vaccine | Sim | Vacina do catálogo |
| applicationDate | Date | Sim | Data da aplicação |
| lotNumber | String | Não | Número do lote |
| nextDoseDate | Date | Não | Data da próxima dose |
| notes | String | Não | Observações |
| registeredAt | Date | Sim | Data do registro |
| registeredByTenantId | FK Tenant | Sim | Clínica que registrou |
| registeredByUserId | FK User | Não | Usuário que registrou |
| createdAt | Sim | Data de criação do registro |

**Constraints:**
- `UNIQUE (animalId, vaccineId, applicationDate)` — mesma vacina não pode ser aplicada duas vezes no mesmo dia para o mesmo animal
- `animalId` FK para Animal
- `vaccineId` FK para Vaccine
- `registeredByTenantId` FK para Tenant
- `registeredByUserId` FK para User

**Escopo:** Global (compartilhado entre clínicas)

**Nota:** Não substituir uma aplicação anterior. Permitir múltiplas aplicações da mesma vacina ao longo da vida.

---

## 5. Resumo de Escopo

| Entidade | Escopo | Justificativa |
|---|---|---|
| User | Global | Identidade única da pessoa |
| Tenant | Global | É o escopo em si |
| UserTenant | Global (pivot) | Vincula User a Tenant |
| UserTenantRole | Global (pivot) | Complementa UserTenant |
| Session | Tenant-scoped | Sessão associada a um tenant |
| Role | Global | Definidas pelo sistema |
| Permission | Global | Definidas pelo sistema |
| RolePermission | Global | Composição das roles |
| Veterinarian | Global | Dados profissionais acompanham o veterinário |
| Specialty | Global | Cadastro compartilhado |
| VeterinarianSpecialty | Global (pivot) | Vincula Veterinarian a Specialty |
| TenantVeterinarian | Tenant-scoped | Atuação em uma clínica específica |
| TutorIdentity | Global | Identidade documental (CPF/CNPJ) para busca |
| Animal | Global | Dados compartilháveis entre clínicas |
| Species | Global | Cadastro dinâmico de espécies |
| Breed | Global | Cadastro padronizado de raças |
| Tutor | Tenant-scoped | Cadastro operacional por clínica |
| TutorPhone | Tenant-scoped | Telefones do tutor na clínica |
| TutorAddress | Tenant-scoped | Endereços do tutor na clínica |
| TutorEmergencyContact | Tenant-scoped | Contatos de emergência na clínica |
| TenantAnimal | Tenant-scoped | Vínculo Animal ↔ Clínica |
| AnimalTutor | Tenant-scoped | Vínculo Tutor ↔ Animal na clínica |
| AnimalWeightRecord | Global (com tenantId) | Histórico de peso com rastreabilidade |
| Allergy | Global | Catálogo compartilhado |
| AnimalAllergy | Global | Alergias do animal (compartilhado) |
| Medication | Global | Catálogo compartilhado |
| AnimalMedication | Global | Medicamentos em uso (compartilhado) |
| Vaccine | Global | Catálogo compartilhado |
| AnimalVaccination | Global | Vacinas aplicadas (compartilhado) |

---

## 6. Diagrama Conceitual

```
┌──────────────────────────────────────────────────────────────────┐
│                        IDENTIDADE                                │
│                                                                  │
│  ┌─────────┐         ┌────────────┐         ┌──────────┐        │
│  │  User   │◀───────▶│ UserTenant │◀───────▶│  Tenant  │        │
│  │         │   1:N   │            │   N:1   │          │        │
│  │ id (PK) │         │ id (PK)    │         │ id (PK)  │        │
│  │ name    │         │ userId(FK) │         │ name     │        │
│  │ email   │         │ tenantId   │         │ cpf/cnpj │        │
│  │ passHash│         │ status     │         │ address  │        │
│  │ isActive│         └─────┬──────┘         │ isActive │        │
│  │isPlatf..│               │                └──────────┘        │
│  └────┬────┘               │                                    │
│       │              ┌─────▼───────┐    ┌──────────────┐        │
│       │              │UserTenant   │    │    Role      │        │
│       │              │Role         │◀───│              │        │
│       │              │             │    │ id (PK)      │        │
│       │              │ id (PK)     │    │ name (UQ)    │        │
│       │              │ userTenantId│    └──────────────┘        │
│       │              │ roleId (FK) │                             │
│       │              └─────────────┘                             │
│       │                                                         │
│  ┌────▼─────────┐                                               │
│  │   Session    │                                               │
│  │ id (PK)      │                                               │
│  │ userId (FK)  │                                               │
│  │ tenantId(FK) │                                               │
│  │ refreshToken │                                               │
│  │   Hash(SHA)  │                                               │
│  │ expiresAt    │                                               │
│  │ revokedAt    │                                               │
│  └──────────────┘                                               │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│              DOMÍNIO VETERINÁRIO — GLOBAIS                        │
│                                                                  │
│  ┌───────────────┐     ┌──────────────────┐                      │
│  │  Veterinarian │◀───▶│     Specialty    │                      │
│  │ id (PK)       │ N:M │ id (PK)          │                      │
│  │ name          │     │ name (UQ)        │                      │
│  │ crmv (UQ)     │     └──────────────────┘                      │
│  │ userId (FK,UQ)│                                               │
│  └───────────────┘                                               │
│                                                                  │
│  ┌────────────────┐    ┌─────────────┐    ┌──────────────┐       │
│  │ TutorIdentity  │    │   Species   │    │    Breed     │       │
│  │ id (PK)        │    │ id (PK)     │    │ id (PK)      │       │
│  │ name           │    │ name (UQ)   │    │ name         │       │
│  │ documentType   │    │ scientificN │    │ speciesId(FK)│       │
│  │ documentNumber │    └─────────────┘    └──────────────┘       │
│  │   (UQ)         │                                              │
│  └────────────────┘                                              │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │                        Animal                                │ │
│  │ id (PK)  internalCode (UQ)  name                            │ │
│  │ speciesId (FK)  breedId (FK)  sex                            │ │
│  │ isCastrated  castrationDate  dateOfBirth                     │ │
│  │ approximateAge  microchip (UQ)  photoUrl                     │ │
│  │ color  size  dateOfDeath  status  notes                      │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  ┌──────────┐  ┌────────────┐  ┌────────────┐  ┌─────────────┐  │
│  │ Allergy  │  │ Medication │  │  Vaccine   │  │             │  │
│  │ id (PK)  │  │ id (PK)    │  │ id (PK)    │  │             │  │
│  │ name(UQ) │  │ name (UQ)  │  │ name (UQ)  │  │             │  │
│  └──────────┘  └────────────┘  └────────────┘  │             │  │
│                                                  │             │  │
│  ┌──────────────────────────────────────────────┐│             │  │
│  │ AnimalWeightRecord                           ││             │  │
│  │ id(PK) animalId(FK) tenantId(FK)            ││             │  │
│  │ weight  recordedAt  recordedBy(FK)           ││             │  │
│  └──────────────────────────────────────────────┘│             │  │
│                                                  │             │  │
│  ┌──────────────────────────────────────────────┐│             │  │
│  │ AnimalAllergy                                ││             │  │
│  │ id(PK) animalId(FK) allergyId(FK)           ││             │  │
│  │ severity  description  registeredAt          ││             │  │
│  │ registeredByTenantId(FK)                     ││             │  │
│  └──────────────────────────────────────────────┘│             │  │
│                                                  │             │  │
│  ┌──────────────────────────────────────────────┐│             │  │
│  │ AnimalMedication                             ││             │  │
│  │ id(PK) animalId(FK) medicationId(FK)        ││             │  │
│  │ dosage  frequency  route  startDate  endDate ││             │  │
│  │ registeredAt  registeredByTenantId(FK)       ││             │  │
│  └──────────────────────────────────────────────┘│             │  │
│                                                  │             │  │
│  ┌──────────────────────────────────────────────┐│             │  │
│  │ AnimalVaccination                            ││             │  │
│  │ id(PK) animalId(FK) vaccineId(FK)           ││             │  │
│  │ applicationDate  lotNumber  nextDoseDate     ││             │  │
│  │ registeredAt  registeredByTenantId(FK)       ││             │  │
│  └──────────────────────────────────────────────┘│             │  │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│           DOMÍNIO VETERINÁRIO — TENANT-SCOPED                    │
│                                                                  │
│  ┌───────────────────┐                                           │
│  │TenantVeterinarian │                                           │
│  │ id (PK)           │                                           │
│  │ tenantId (FK)     │                                           │
│  │ veterinarianId(FK)│                                           │
│  │ joinedAt  isActive│                                           │
│  │ schedule  room    │                                           │
│  │ function  notes   │                                           │
│  └───────────────────┘                                           │
│                                                                  │
│  ┌─────────┐  ┌───────────────┐  ┌──────────────────────┐       │
│  │ Tutor   │  │ TutorPhone    │  │ TutorAddress         │       │
│  │ id (PK) │  │ id (PK)       │  │ id (PK)              │       │
│  │ tenantId│  │ tutorId (FK)  │  │ tutorId (FK)         │       │
│  │ tutorId │  │ tenantId (FK) │  │ tenantId (FK)        │       │
│  │enityId(FK)│ number  label │  │ addressLine1  city   │       │
│  │ email   │  │ isPrimary     │  │ state  zipCode       │       │
│  │ isActive│  └───────────────┘  │ isPrimary             │       │
│  │ notes   │                     └──────────────────────┘       │
│  └─────────┘                                                    │
│       │                                                         │
│       │  ┌──────────────────────────┐                            │
│       │  │ TutorEmergencyContact    │                            │
│       │  │ id (PK)                  │                            │
│       │  │ tutorId (FK)             │                            │
│       │  │ tenantId (FK)            │                            │
│       │  │ name  phone  relationship│                            │
│       │  └──────────────────────────┘                            │
│       │                                                         │
│  ┌────▼──────────────┐    ┌────────────────────┐                 │
│  │    AnimalTutor    │    │   TenantAnimal     │                 │
│  │ id (PK)           │    │ id (PK)            │                 │
│  │ tenantId (FK)     │    │ tenantId (FK)      │                 │
│  │ animalId (FK)     │◀──▶│ animalId (FK)      │                 │
│  │ tutorId (FK)      │    │ status             │                 │
│  │ startedAt         │    │ notes              │                 │
│  │ endedAt           │    └────────────────────┘                 │
│  │ isActive          │                                          │
│  │ notes             │                                          │
│  └───────────────────┘                                           │
└──────────────────────────────────────────────────────────────────┘
```

---

## 7. Visibilidade entre Clínicas

### Compartilhado entre clínicas

Uma clínica que atende um Animal pode acessar:

- dados básicos do Animal (nome, espécie, raça, sexo, castração, data de nascimento, microchip, foto, cor/pelagem, porte)
- histórico de peso
- alergias registradas
- medicamentos em uso
- vacinações aplicadas

### Privado por clínica

NÃO compartilhado entre clínicas:

- prontuário clínico completo
- consultas de outras clínicas
- diagnósticos clínicos privados
- anotações clínicas privadas
- demais registros clínicos detalhados que ainda serão especificados

Uma clínica pode criar novas informações sobre um Animal sem apagar ou sobrescrever o histórico de outra clínica.

---

## 8. Merge de Animal (Especificação Conceitual)

Quando um Animal sem microchip recebe microchip posteriormente e já existe outro Animal global com aquele microchip:

1. Detectar conflito (microchip já existe em outro Animal).
2. NÃO executar merge automático.
3. Exigir confirmação explícita do usuário.
4. Registrar operação de consolidação/merge com auditoria.
5. Preservar todo o histórico de ambos os Animals.
6. Não apagar silenciamente registros clínicos.

Esta operação será implementada futuramente. Nesta etapa, apenas as regras acima devem ser documentadas.
