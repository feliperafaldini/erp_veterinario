# Regras de Negócio

Este documento registra exclusivamente regras de negócio já definidas pelo responsável pelo projeto. Não foram adicionadas regras presumidas.

---

## SaaS e Tenancy

* O produto é um SaaS multi-tenant.
* Cada estabelecimento veterinário é um Tenant.
* O banco utiliza PostgreSQL compartilhado.
* O isolamento inicial utiliza tenant_id.
* A aplicação deve impedir acesso cross-tenant.
* RLS será avaliado posteriormente como camada adicional de defesa.

---

## User

* User é uma identidade global do sistema.
* email é único globalmente.
* phone é opcional.
* isActive existe.
* User pode pertencer a múltiplos Tenants.

---

## Tenant

* Tenant representa um estabelecimento veterinário.
* Pode possuir CPF, CNPJ ou ambos.
* CPF e CNPJ são campos independentes.
* Deve ser possível adicionar o segundo documento posteriormente.
* Possui um endereço principal com campos separados.
* Logo é opcional.
* Tenant possui isActive.

---

## UserTenant

* User ↔ Tenant é N:M.
* Existe no máximo um vínculo por combinação User + Tenant.
* UserTenant possui status.
* O vínculo registra convite e aceitação quando aplicável.

---

## Roles

* Papéis iniciais do MVP: ADMIN, VETERINARIAN, RECEPTIONIST.
* Um User pode possuir múltiplos papéis dentro do mesmo Tenant.
* ADMIN pode ser combinado com outros papéis.
* Roles são globais e definidas pelo sistema.

---

## Permissions

* Permissions são globais.
* Todos os Tenants utilizam o mesmo conjunto de Permissions.
* Permissions são definidas pelo sistema.
* Permissions são granulares por recurso + ação (ex: ANIMAL_CREATE, ANIMAL_READ).
* Convenção de nomes: `{RESOURCE}_{ACTION}` em UPPERCASE.
* Roles possuem múltiplas Permissions.
* Um User recebe Permissions através das Roles associadas ao seu UserTenant.

### Matriz implementada no seed (estado atual da implementação)

> Esta subseção registra **o que já está no banco**, gerado por
> `prisma/seed.ts` e espelhado em `test/helpers.ts`. A regra de negócio que
> sustenta o mapeamento — em especial das 22 permissões além de `ANIMAL_*` e
> `TUTOR_*` — **ainda não foi registrada neste documento**. Não trate a tabela
> abaixo como regra definida enquanto essa pendência existir.

**Permissões cadastradas (31):**

| Recurso | Permissões |
|---|---|
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

**Matriz role → permissão:**

| Recurso | `ADMIN` | `VETERINARIAN` | `RECEPTIONIST` |
|---|---|---|---|
| `ANIMAL` | as 5 | as 5 | sem `MARK_DECEASED` |
| `TUTOR` | as 4 | sem `DEACTIVATE` | sem `DEACTIVATE` |
| `VETERINARIAN` | as 4 | — | — |
| `APPOINTMENT` | as 3 | as 3 | as 3 |
| `CONSULTATION` | as 3 | as 3 | apenas `READ` |
| `DIAGNOSIS` | as 3 | as 3 | — |
| `WEIGHT` | as 2 | as 2 | as 2 |
| `ALLERGY` | as 2 | `CREATE`, `READ` | apenas `READ` |
| `MEDICATION` | as 3 | as 3 | apenas `READ` |
| `VACCINATION` | as 2 | `CREATE`, `READ` | apenas `READ` |
| **Total** | **31** | **26** | **16** |

Os mapeamentos de `TUTOR` e `ANIMAL` já estão documentados nas seções
correspondentes deste documento. Para os demais recursos, o que existe hoje é
apenas este estado da implementação.

### Permissões previstas sem endpoint

* `ANIMAL_MARK_DECEASED` — permissão prevista, ainda sem endpoint implementado.
* `MEDICATION_UPDATE` — permissão prevista, ainda sem endpoint implementado.
* Os atores autorizados (Roles) para essas duas permissões ainda precisam ser definidos e documentados; o mapeamento existente no seed é provisório.

---

## Platform Admin

* Existe Platform Admin.
* É gerenciado fora da interface normal do SaaS.
* Não possui acesso automático aos dados clínicos dos Tenants.
* Representado pelo campo `User.isPlatformAdmin`. Não há tabela `PlatformAdmin`.
* Para acessar dados de um tenant, precisa de UserTenant ativo com role apropriada.

---

## Autenticação

* Login com email + senha.
* Senhas utilizam Argon2id.
* JWT é utilizado para autenticação.
* Após autenticar, o usuário escolhe explicitamente o Tenant.
* A sessão fica associada ao Tenant escolhido.
* A Session é criada durante a seleção do Tenant, não durante o login.
* Access token contém apenas userId, tenantId, iat e exp.
* Access token não contém role nem permissions.
* Access token expira em 15 minutos (900 segundos). A variável `JWT_EXPIRATION`
  permite ajustar a duração por ambiente; o valor padrão corresponde aos 15
  minutos definidos.
* Access token é validado pela assinatura JWT, não consultando a tabela Session.
* Refresh token é stateful.
* Refresh token é uma string aleatória e armazenado apenas como hash SHA-256.
* Sessão possui tenantId.
* Refresh token é armazenado no frontend em cookie HttpOnly.
* Logout revoga a sessão.
* Desativação de User revoga suas sessões.
* Remoção ou suspensão de vínculo UserTenant revoga sessões daquele Tenant.
* Convites são enviados por email.
* Convites expiram em 7 dias.

---

## Onboarding

* Usuário pode criar sua própria conta.
* Usuário pode criar seu próprio Tenant.
* O usuário que cria o Tenant recebe ADMIN automaticamente.

---

## Veterinarian

* Veterinarian é uma entidade separada de User.
* User ↔ Veterinarian é 1:1.
* Veterinarian pode existir sem User.
* Um Veterinarian pode posteriormente ser associado a um User.
* CRMV é obrigatório.
* Veterinarian possui múltiplas especialidades.
* Veterinarian pode atuar em múltiplos Tenants.
* Informações profissionais gerais pertencem a Veterinarian.
* Informações específicas da atuação pertencem ao vínculo Veterinarian ↔ Tenant.
* O vínculo pode conter ativo/inativo, horários, função e especialidade exercida naquela clínica.
  > **Discrepância registrada:** `TenantVeterinarian` não possui campo de
  > especialidade (`joinedAt`, `isActive`, `schedule`, `room`, `function`,
  > `notes` — `prisma/schema.prisma`). Especialidades são globais e ligadas a
  > `Veterinarian` por `VeterinarianSpecialty`, e `docs/domain-model.md` também
  > não lista especialidade no vínculo. Confirmar se a regra acima se refere ao
  > campo `function` ou a um vínculo de especialidade por clínica que ainda não
  > existe.
* Veterinarian.name é o nome profissional, distinto de User.name.

---

## Especialidades

* Specialty é entidade global.
* Veterinarian ↔ Specialty é N:M.
* As especialidades são compartilhadas entre Tenants.

---

## Tutor — Modelo

* O Tutor possui uma identidade global mínima (TutorIdentity), mas o cadastro operacional existe por clínica.
* Tutor pode representar pessoa física ou empresa.
* TutorIdentity contém: nome, documento (CPF ou CNPJ), tipo do documento.
* CPF/CNPJ devem ser armazenados normalizados.
* A unicidade do documento é global (dois tutores não podem ter mesmo CPF/CNPJ).
* Busca global por CPF é permitida para descobrir que existe um registro do Tutor em outra clínica.
* A clínica NÃO pode visualizar ou editar o cadastro da outra clínica apenas por essa busca.
* A busca global retorna apenas a informação de que o CPF/CNPJ já existe em outro Tenant, sem expor dados.
* O nome do Tutor pertence à identidade global. Alterar o nome global altera a identidade compartilhada e o nome visualizado por todas as clínicas.
* O cadastro de uma clínica referencia a TutorIdentity, em vez de possuir uma cópia independente do nome.
* Demais dados do Tutor (email, telefones, endereços, contato de emergência) são ligados ao cadastro da clínica.

---

## Tutor — Dados por Clínica

* Email: exatamente um por cadastro de clínica.
  > **Discrepância registrada:** `Tutor.email` é opcional no schema
  > (`prisma/schema.prisma`) e `docs/domain-model.md` o marca como não
  > obrigatório. O código segue o domain-model. Prevalece "exatamente um" ou
  > "opcional"? Definição pendente — nada foi alterado no código.
* Múltiplos telefones permitidos.
* Um dos telefones pode ser principal.
* Múltiplos endereços permitidos.
* Contato de emergência: nome, telefone, parentesco.
* RG e outros documentos: informações adicionais do Tutor (não criar entidade separada neste momento).
* Tutor pode ser inativado sem exclusão.
* Alterações importantes devem preservar histórico.

---

## Tutor — Relacionamento

* Um mesmo Tutor pode estar cadastrado em diversas clínicas.
* Cada clínica possui seu próprio registro operacional desse Tutor.
* Deve existir unicidade para impedir duplicação do mesmo Tutor dentro do mesmo tenant.

---

## Tutor — Permissões

* CREATE: ADMIN, VETERINARIAN, RECEPTIONIST
* UPDATE: ADMIN, VETERINARIAN, RECEPTIONIST
* DEACTIVATE: ADMIN

---

## Animal — Modelo

* Animal é uma entidade GLOBAL no sistema.
* O mesmo Animal pode ser atendido por várias clínicas.
* Cada Animal possui UUID global e `internalCode` único GLOBAL no sistema inteiro.
* `internalCode` NÃO deve ser tenant-scoped. Sua unicidade é em todo o sistema.
* Nome do Animal é opcional.
* Espécie é obrigatória.
* Raça é obrigatória.
* Sexo é obrigatório (MALE, FEMALE, UNKNOWN).
* Castração é registrada globalmente: `isCastrated` e `castrationDate` quando aplicável.
* Data de nascimento é opcional.
* Idade aproximada/data aproximada é permitida quando a data exata for desconhecida.
* Peso não é obrigatório.
* Deve existir peso atual e histórico de peso.
* Microchip é opcional. Quando presente, deve ser globalmente único.
* Foto é opcional.
* Cor/pelagem é opcional.
* Porte/tamanho é opcional (SMALL, MEDIUM, LARGE).
* Data de óbito deve ser registrada quando aplicável.
* Animal permanece no sistema após óbito.
* Animal possui status global.
* Animal possui observações apropriadas ao escopo global.

---

## Animal — Status

* Status GLOBAL do Animal: ACTIVE, DECEASED, INACTIVE.
* Status do vínculo do Animal com uma clínica (TenantAnimal): ACTIVE, INACTIVE.
* `Animal.status` e `dateOfDeath` são campos INDEPENDENTES.
* Preenchimento de `dateOfDeath` NÃO altera automaticamente `Animal.status`.
* Não criar regra implícita que converta automaticamente ACTIVE em DECEASED.

---

## Animal — Dados Compartilhados

São compartilhados globalmente entre clínicas:

* nome;
* espécie;
* raça;
* sexo;
* castração;
* data de nascimento;
* microchip;
* foto;
* cor/pelagem;
* porte/tamanho;
* alergias;
* medicamentos em uso;
* vacinações;
* histórico de peso.

Uma alteração nesses dados globais pode ser visualizada pelas outras clínicas que acessam o mesmo Animal.

NÃO colocar castração apenas em TenantAnimal. Castração pertence ao Animal global.

---

## Animal — Dados Privados por Clínica

NÃO compartilhado entre clínicas:

* prontuário clínico completo;
* consultas de outras clínicas;
* diagnósticos clínicos privados;
* anotações clínicas privadas;
* demais registros clínicos detalhados que ainda serão especificados.

---

## Animal — Permissões

* CREATE Animal: ADMIN, VETERINARIAN, RECEPTIONIST
* UPDATE Animal: ADMIN, VETERINARIAN, RECEPTIONIST
* DEACTIVATE Animal: ADMIN, VETERINARIAN, RECEPTIONIST

Acesso continua condicionado ao tenant e às regras de visibilidade global.

---

## Animal — Microchip

* Microchip é um identificador GLOBAL.
* Opcional.
* Quando presente, deve ser globalmente único.
* Duas entidades Animal diferentes não podem possuir o mesmo microchip ativo.
* Sem microchip, Animal continua sendo global por seu UUID/internalCode.
* Outra clínica não deve automaticamente concluir que dois registros representam o mesmo Animal apenas por nome, espécie, raça etc.

---

## Animal — Processo de Merge

Quando um microchip é posteriormente cadastrado e já pertence a outro Animal:

* NÃO executar merge automático.
* Detectar conflito.
* Exigir confirmação explícita.
* Registrar operação de consolidação/merge com auditoria.
* Preservar histórico.
* Não apagar silenciosamente registros clínicos.

---

## Animal — Permissões de Tutor

* CREATE Tutor: ADMIN, VETERINARIAN, RECEPTIONIST
* UPDATE Tutor: ADMIN, VETERINARIAN, RECEPTIONIST
* DEACTIVATE Tutor: ADMIN

---

## Espécie

* Species é entidade global e dinâmica.
* Não usar enum ou lista fixa de espécies.
* Quando uma espécie válida é cadastrada por um usuário autorizado, ela passa a ficar disponível para uso posteriormente.
  > **Discrepância registrada:** `SpeciesController` só tem endpoints de leitura
  > (GET); não existe `SPECIES_CREATE` nem endpoint de criação de espécie.
  > Espécies e raças hoje entram apenas pelo seed. A regra acima continua valendo
  > e a criação está pendente de implementação.
* Nomes/valores devem ser padronizados.
* Animal referencia Species.

---

## Raça

* Breed é entidade global e padronizada.
* Breed pertence a uma Species.
* Deve existir explicitamente "Sem raça definida" para cada Species.
* Não modelar raça como texto livre no Animal.

---

## Peso

* Peso é compartilhado entre clínicas e possui HISTÓRICO.
* Não armazenar apenas `currentWeight`.
* Cada registro preserva: Animal, peso, data, tenant que registrou, usuário que registrou, timestamps.
* `tenantId` existe para indicar a origem/proveniência de cada medição.
* Clínicas podem adicionar novas medições sem sobrescrever medições anteriores.
* Todas as clínicas autorizadas a acessar o Animal podem consultar o histórico global de peso.

---

## Alergias

* Alergias são informações compartilhadas entre clínicas.
* Devem possuir histórico adequado quando houver alteração/remover/adicionar.
* Não transformar alergia em texto único dentro de Animal.
* Manter estrutura própria que permita múltiplas alergias.
* Registrar a origem/proveniência da informação (tenant e usuário).
* Catálogo global de alergias (Allergy) + registros por Animal (AnimalAllergy).

---

## Medicamentos

* Medicamentos em uso são informações compartilhadas entre clínicas.
* Usar AnimalMedication.
* AnimalMedication deve permitir MÚLTIPLOS registros ao longo do tempo.
* Não utilizar apenas `currentMedication` ou uma lista única sobrescrita.
* A estrutura deve permitir: medicamento iniciado, continuado, encerrado, novo ciclo.
* Preservar histórico.
* Cada registro contém: medicamento, dose, frequência, via, início, término, observações, tenant de origem, usuário de origem, timestamps.
* Catálogo global de medicamentos (Medication) + registros por Animal (AnimalMedication).
* Prescrição formal clínica será outro módulo futuro.

---

## Vacinação

* Vacinações são compartilhadas entre clínicas e devem possuir histórico.
* Usar AnimalVaccination.
* Permitir múltiplas aplicações da mesma vacina ao longo da vida.
* Não substituir uma aplicação anterior.
* Separar conceitualmente: catálogo global de vacinas (Vaccine) + registros de aplicação no Animal (AnimalVaccination).
* Cada aplicação preserva sua própria ocorrência e origem.

---

## Catálogos

* Medication e Vaccine são catálogos globais.
* Não criar um catálogo diferente por clínica no MVP.
* Os registros de uso/aplicação são históricos do Animal.
* Separar claramente: entidade de catálogo vs. ocorrência histórica associada ao Animal.

---

## Visibilidade entre Clínicas

* Uma clínica que atende um Animal deve conseguir acessar as informações globais/compartilhadas previamente definidas.
* Uma clínica não recebe automaticamente o prontuário privado completo da outra.
* Clínica A pode registrar informações de dermatologia.
* Clínica B pode registrar informações de cardiologia.
* A existência do mesmo Animal pode ser reconhecida globalmente.

---

## Princípio de Histórico

* Informações relevantes não devem ser sobrescritas quando a regra exige histórico.
* Aplicar especialmente a: relação Tutor ↔ Animal, peso, alergias, medicamentos, vacinação, mudanças relevantes, merge/consolidação de Animals.
* Ao alterar dados globais simples, preservar mecanismos de auditoria necessários para descobrir quem alterou e quando.
* Não implementar ainda um sistema de auditoria genérico completo sem necessidade; apenas documentar os requisitos de rastreabilidade.
