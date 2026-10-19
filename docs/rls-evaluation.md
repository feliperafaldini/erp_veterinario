# Avaliação de Row-Level Security (RLS)

> Requisito: `AGENTS.md` §4.5 — "PostgreSQL Row-Level Security (RLS) deve ser avaliado como camada adicional de defesa antes da primeira versão de produção."
> Esta avaliação foi executada em 2026-10-19. Ela registra análise técnica; a decisão de implementar (e quando) é do responsável pelo projeto.

## 1. O que existe hoje (fatos verificados)

* Isolamento de tenant é aplicado na camada de aplicação: guards (`JwtAuthGuard`, `TenantGuard`, `PermissionsGuard`) e consultas de service sempre escopadas por `tenantId`, com testes automatizados de cross-tenant em cada funcionalidade.
* `PrismaService` é um `PrismaClient` puro, sem `$extends`/middleware. Apenas 3 arquivos usam `$transaction` (`auth.service.ts`, `animal.service.ts`, `users/user.service.ts`); a grande maioria das consultas roda solta no pool de conexões.
* O banco é PostgreSQL 16 em container único, acessado pela aplicação com uma única credencial (definida em `DATABASE_URL`).

## 2. Escopo real das tabelas (não é "toda tabela com tenant_id")

Levantamento do `prisma/schema.prisma`:

| Classe | Quantidade | Exemplos | Implicação para RLS |
|---|---|---|---|
| Privadas por tenant (`tenantId` direto) | 13 | `Session`, `Tutor`, `Consultation`, `Diagnosis`, `Appointment`, `TenantAnimal` | Candidatas naturais a política `tenantId = current_setting(...)` |
| Registros clínicos compartilhados (`registeredByTenantId`) | 3 | `AnimalAllergy`, `AnimalMedication`, `AnimalVaccination` | **Não são privadas por regra de negócio** — visíveis entre clínicas com histórico de proveniência. Política "por tenant" aqui estaria errada |
| Globais por domínio | ~16 | `Animal`, `TutorIdentity`, `Veterinarian`, `User`, catálogos (`Species`, `Breed`, `Specialty`, `Allergy`, `Medication`, `Vaccine`) | Sem tenant; acesso legítimo cruza clínicas (ex.: mesmo animal atendido por várias) |
| Tabelas de junção/RBAC | ~5 | `UserTenantRole`, `VeterinarianSpecialty`, `Role`, `Permission`, `RolePermission` | Política teria de derivar o tenant via tabela pai (join indireto) |

Conclusão do escopo: **uma fração das tabelas é realmente privada por tenant**. Aplicar o mesmo padrão de política a todas as tabelas com `tenant_id` violaria regras de negócio já definidas (visibilidade entre clínicas).

## 3. Opções avaliadas

### Opção A — `SET LOCAL` por transação interativa (padrão Prisma+RLS)

Cada consulta que toca dado privado roda dentro de `$transaction` com `SET LOCAL app.current_tenant_id = '<uuid>'` no início; política RLS lê `current_setting('app.current_tenant_id')`.

* **Pró:** protege contra o cenário real de falha — bug em query de service esquecendo o filtro de tenant (o único caminho que hoje poderia vazar dado). `SET LOCAL` é transacional, sem vazamento entre conexões do pool.
* **Contra:** exige envolver em transação **toda** consulta de dado privado — hoje só 3 arquivos transacionam; o resto dos services precisaria mudar. Custo de `BEGIN`/`COMMIT` por query (pool limitado a ~num_cpus+2 conexões por default do Prisma). `raw`/`$queryRaw` e operações fora da transação precisam de disciplina.
* Esforço: alto — toca todos os services que leem/escrevem as 13 tabelas privadas.

### Opção B — `SET` de sessão (sem `LOCAL`) + pool por tenant

Descartada: com pool de conexões compartilhado, o valor de sessão vaza entre requests de tenants diferentes quando o Prisma reutiliza a conexão. Não é aplicável ao driver atual.

### Opção C — RLS com a role da app como dona (bypass) + policies para acesso direto

`ALTER TABLE ... ENABLE ROW LEVEL SECURITY` com policies que valem para roles que **não** são donas; a aplicação conecta como dona (RLS não se aplica a dona sem `FORCE`). Protege apenas acesso direto ao banco (psql de análise, scripts, credencial vazada) — **não** protege contra bug de query na aplicação.

* **Prático e barato:** zero mudança de código.
* **Contra:** não cobre o risco principal (bug na aplicação); proteção parcial.

### Opção D — adiar com critérios objetivos de reavaliação

Não implementar agora; registrar os gatilhos e fazer um spike tempo-limitado antes da produção.

## 4. Riscos

* **Implementar Opção A agora:** churn amplo em services já estabilizados e verificados; risco de regressão de comportamento (ex.: operações em lote, transações aninhadas existentes); atrasa as frentes funcionais pendentes. Mitigação possível: spike em um único domínio antes de decidir o rollover.
* **Não implementar nada:** o isolamento depende inteiramente da disciplina de código + testes. Hoje isso é coberto por testes cross-tenant em cada funcionalidade, mas é uma proteção de revisão, não estrutural — uma query nova sem filtro de tenant passaria pelos guards e só o teste pegaria.

## 5. Recomendação

**Não implementar RLS agora.** A avaliação está registrada; a implementação deve ser decidida com o dono antes da primeira produção, considerando:

1. **Spike tempo-limitado da Opção A** num único domínio (sugestão: `Appointment`) para medir custo real de `SET LOCAL` por consulta no nosso volume, antes de qualquer rollover.
2. **Opção C como piso barato** — pode ser ligada a qualquer momento sem tocar código, se quiser proteção imediata contra acesso direto ao banco.
3. **Não confundir escopo:** políticas RLS só nas 13 tabelas privadas; registros compartilhados (`registeredByTenantId`) e globais ficam de fora, por regra de negócio definida.

## 6. Gatilhos para reavaliar (critérios objetivos)

* Início de qualquer acesso ao banco fora desta aplicação (reporting, scripts de migração, BI).
* Extração do monólito (serviço separado lendo o mesmo banco).
* Primeira implantação de produção (requisito do AGENTS.md).
* Qualquer incidente ou quase-incidente de vazamento cross-tenant.
