[1mdiff --git a/.gitignore b/.gitignore[m
[1mindex fa6db34..af15fde 100644[m
[1m--- a/.gitignore[m
[1m+++ b/.gitignore[m
[36m@@ -1,15 +1,32 @@[m
[32m+[m[32m# Environment[m
 .env[m
 .env.*[m
 !.env.example[m
 [m
[32m+[m[32m# Node[m
 node_modules/[m
[32m+[m[32mnpm-debug.log*[m
[32m+[m[32myarn-debug.log*[m
[32m+[m[32myarn-error.log*[m
[32m+[m
[32m+[m[32m# Build[m
 dist/[m
 build/[m
 coverage/[m
 [m
[32m+[m[32m# Logs[m
 *.log[m
 [m
[32m+[m[32m# IDE[m
 .vscode/[m
 .idea/[m
 [m
[32m+[m[32m# OS[m
 .DS_Store[m
[32m+[m
[32m+[m[32m# Test / tooling[m
[32m+[m[32mplaywright-report/[m
[32m+[m[32mtest-results/[m
[32m+[m
[32m+[m[32m# Prisma[m
[32m+[m[32m*.db[m
[1mdiff --git a/.opencode/skills/backend/SKILL.md b/.opencode/skills/backend/SKILL.md[m
[1mindex bdb80ac..6d5c185 100644[m
[1m--- a/.opencode/skills/backend/SKILL.md[m
[1m+++ b/.opencode/skills/backend/SKILL.md[m
[36m@@ -1,14 +1,113 @@[m
 ---[m
[32m+[m
 name: backend[m
[31m-description: Diretrizes para APIs, serviços e lógica de negócio do ERP veterinário.[m
[31m----[m
[32m+[m[32mdescription: Orienta o desenvolvimento do backend NestJS, da API REST e da lógica de negócio do ERP.[m
[32m+[m[32m----------------------------------------------------------------------------------------------------[m
 [m
 # Backend[m
 [m
[31m-- Inspecione endpoints e serviços existentes antes de criar novos.[m
[31m-- Centralize regras de negócio no backend.[m
[31m-- Valide entradas.[m
[31m-- Não confie em dados enviados pelo frontend.[m
[31m-- Preserve padrões existentes de tratamento de erros.[m
[31m-- Verifique autorização antes de expor ou modificar dados.[m
[31m-- Teste alterações relevantes.[m
[32m+[m[32m## Stack[m
[32m+[m
[32m+[m[32m* Node.js[m
[32m+[m[32m* TypeScript[m
[32m+[m[32m* NestJS[m
[32m+[m[32m* REST[m
[32m+[m[32m* Prisma[m
[32m+[m
[32m+[m[32m## Arquitetura[m
[32m+[m
[32m+[m[32mUtilizar monólito modular.[m
[32m+[m
[32m+[m[32mOrganizar funcionalidades por domínio.[m
[32m+[m
[32m+[m[32mEvitar controllers excessivamente complexos.[m
[32m+[m
[32m+[m[32mControllers devem lidar principalmente com HTTP.[m
[32m+[m
[32m+[m[32mRegras de negócio devem permanecer em services, use cases ou abstrações equivalentes.[m
[32m+[m
[32m+[m[32mAcesso ao banco deve permanecer isolado da camada HTTP.[m
[32m+[m
[32m+[m[32m## Multi-tenancy[m
[32m+[m
[32m+[m[32mToda operação que acessa dados de domínio deve receber `tenantId` como parâmetro.[m
[32m+[m
[32m+[m[32mO `tenantId` é extraído do access token JWT pelo TenantGuard.[m
[32m+[m
[32m+[m[32mServices devem exigir `tenantId` em todas as queries de domínio.[m
[32m+[m
[32m+[m[32mConsultar `docs/architecture.md` para detalhes do TenantGuard e fluxo de autorização.[m
[32m+[m
[32m+[m[32m## Autenticação e Sessões[m
[32m+[m
[32m+[m[32m* Login: `POST /auth/login` com email + senha. Retorna lista de tenants.[m
[32m+[m[32m* Seleção de tenant: `POST /auth/select-tenant` com tenantId. Cria Session e emite tokens.[m
[32m+[m[32m* Access token: JWT com `sub`, `tenantId`, `iat`, `exp` (15 min). Não contém roles nem permissions.[m
[32m+[m[32m* Refresh token: string aleatória, hash SHA-256 no banco, cookie HttpOnly.[m
[32m+[m[32m* Refresh: `POST /auth/refresh`. Valida Session, emite novo access token.[m
[32m+[m[32m* Logout: `POST /auth/logout`. Marca Session como revogada.[m
[32m+[m
[32m+[m[32mA Session é criada apenas durante a seleção do Tenant, não durante o login.[m
[32m+[m
[32m+[m[32mConsultar `docs/architecture.md` para fluxos completos.[m
[32m+[m
[32m+[m[32m## Autorização[m
[32m+[m
[32m+[m[32mAutenticação e autorização são conceitos separados.[m
[32m+[m
[32m+[m[32mO fato de o usuário estar autenticado não significa que ele possui autorização para executar qualquer operação.[m
[32m+[m
[32m+[m[32mRegras de autorização devem ser verificadas no backend.[m
[32m+[m
[32m+[m[32mPlatform Admin é verificado via `User.isPlatformAdmin`. Não há tabela `PlatformAdmin`.[m
[32m+[m
[32m+[m[32m## API[m
[32m+[m
[32m+[m[32mUtilizar recursos REST de maneira consistente.[m
[32m+[m
[32m+[m[32mDefinir:[m
[32m+[m
[32m+[m[32m* métodos HTTP adequados;[m
[32m+[m[32m* códigos de status apropriados;[m
[32m+[m[32m* validação de entrada;[m
[32m+[m[32m* respostas consistentes;[m
[32m+[m[32m* tratamento de erros.[m
[32m+[m
[32m+[m[32mNão expor diretamente entidades internas do banco quando isso criar acoplamento desnecessário.[m
[32m+[m
[32m+[m[32m## Validação[m
[32m+[m
[32m+[m[32mToda entrada externa deve ser validada no backend.[m
[32m+[m
[32m+[m[32mNão confiar na validação do frontend.[m
[32m+[m
[32m+[m[32mValidar:[m
[32m+[m
[32m+[m[32m* tipos;[m
[32m+[m[32m* formatos;[m
[32m+[m[32m* campos obrigatórios;[m
[32m+[m[32m* regras de autorização;[m
[32m+[m[32m* consistência dos dados.[m
[32m+[m
[32m+[m[32m## Segurança[m
[32m+[m
[32m+[m[32mNunca retornar senhas ou credenciais.[m
[32m+[m
[32m+[m[32mNunca registrar tokens ou senhas em logs.[m
[32m+[m
[32m+[m[32mNão colocar segredos no código.[m
[32m+[m
[32m+[m[32mSenhas: Argon2id. Refresh tokens: SHA-256.[m
[32m+[m
[32m+[m[32m## Implementação[m
[32m+[m
[32m+[m[32mAntes de criar um endpoint:[m
[32m+[m
[32m+[m[32m1. verificar se já existe recurso equivalente;[m
[32m+[m[32m2. verificar DTOs;[m
[32m+[m[32m3. verificar service/use case;[m
[32m+[m[32m4. verificar entidade/model;[m
[32m+[m[32m5. verificar autorização;[m
[32m+[m[32m6. verificar testes existentes.[m
[32m+[m
[32m+[m[32mNão duplicar lógica entre endpoints.[m
[1mdiff --git a/.opencode/skills/database/SKILL.md b/.opencode/skills/database/SKILL.md[m
[1mindex c6fa2d0..b65e3f9 100644[m
[1m--- a/.opencode/skills/database/SKILL.md[m
[1m+++ b/.opencode/skills/database/SKILL.md[m
[36m@@ -1,14 +1,133 @@[m
 ---[m
[32m+[m
 name: database[m
[31m-description: Diretrizes para modelagem, migrations e consultas do banco do ERP veterinário.[m
[31m----[m
[32m+[m[32mdescription: Orienta modelagem PostgreSQL, Prisma, migrations, relacionamentos e integridade dos dados do ERP.[m
[32m+[m[32m--------------------------------------------------------------------------------------------------------------[m
 [m
 # Database[m
 [m
[31m-- Inspecione o schema existente antes de alterar o banco.[m
[31m-- Preserve integridade referencial.[m
[31m-- Utilize migrations quando suportadas pela stack.[m
[31m-- Evite alterações destrutivas.[m
[31m-- Verifique índices, constraints e relacionamentos.[m
[31m-- Não duplicar dados sem motivo arquitetural.[m
[31m-- Teste consultas e alterações estruturais.[m
[32m+[m[32m## Stack[m
[32m+[m
[32m+[m[32m* PostgreSQL[m
[32m+[m[32m* Prisma ORM[m
[32m+[m
[32m+[m[32m## Princípios[m
[32m+[m
[32m+[m[32mO banco deve preservar:[m
[32m+[m
[32m+[m[32m* integridade;[m
[32m+[m[32m* consistência;[m
[32m+[m[32m* relacionamentos;[m
[32m+[m[32m* histórico quando necessário;[m
[32m+[m[32m* facilidade de manutenção.[m
[32m+[m
[32m+[m[32m## Multi-tenancy[m
[32m+[m
[32m+[m[32mA estratégia de multi-tenancy é PostgreSQL compartilhado com isolamento por `tenant_id`.[m
[32m+[m
[32m+[m[32mAntes de adicionar `tenantId` a uma tabela, verificar se a entidade é realmente tenant-scoped ou se pertence ao escopo global.[m
[32m+[m
[32m+[m[32mConsultar `docs/domain-model.md` para o escopo de cada entidade.[m
[32m+[m
[32m+[m[32m## Escopo das Entidades[m
[32m+[m
[32m+[m[32m**Global (sem tenantId):**[m
[32m+[m[32m* User[m
[32m+[m[32m* Tenant[m
[32m+[m[32m* UserTenant[m
[32m+[m[32m* UserTenantRole[m
[32m+[m[32m* Role[m
[32m+[m[32m* Permission[m
[32m+[m[32m* RolePermission[m
[32m+[m[32m* Veterinarian[m
[32m+[m[32m* VeterinarianSpecialty[m
[32m+[m[32m* Specialty[m
[32m+[m[32m* TutorIdentity[m
[32m+[m[32m* Animal[m
[32m+[m[32m* Species[m
[32m+[m[32m* Breed[m
[32m+[m[32m* Allergy[m
[32m+[m[32m* Medication[m
[32m+[m[32m* Vaccine[m
[32m+[m
[32m+[m[32m**Tenant-scoped (com tenantId):**[m
[32m+[m[32m* Tenant[m
[32m+[m[32m* Tutor[m
[32m+[m[32m* TutorPhone[m
[32m+[m[32m* TutorAddress[m
[32m+[m[32m* TutorEmergencyContact[m
[32m+[m[32m* TenantVeterinarian[m
[32m+[m[32m* TenantAnimal[m
[32m+[m[32m* AnimalTutor[m
[32m+[m[32m* Session[m
[32m+[m
[32m+[m[32m**Global com rastreabilidade de proveniência:**[m
[32m+[m[32mEssas entidades são globais e compartilhadas entre tenants, mas possuem `tenantId` ou `registeredByTenantId` para indicar qual clínica registrou a informação.[m
[32m+[m
[32m+[m[32m* AnimalWeightRecord — `tenantId` indica a clínica que registrou o peso[m
[32m+[m[32m* AnimalAllergy — `registeredByTenantId` indica a clínica que registrou a alergia[m
[32m+[m[32m* AnimalMedication — `registeredByTenantId` indica a clínica que registrou o medicamento[m
[32m+[m[32m* AnimalVaccination — `registeredByTenantId` indica a clínica que registrou a vacinação[m
[32m+[m
[32m+[m[32m## Antes de alterar o banco[m
[32m+[m
[32m+[m[32m1. inspecionar o schema atual;[m
[32m+[m[32m2. verificar migrations existentes;[m
[32m+[m[32m3. localizar dependências;[m
[32m+[m[32m4. verificar impacto nos dados;[m
[32m+[m[32m5. verificar impacto na API;[m
[32m+[m[32m6. verificar impacto no frontend.[m
[32m+[m
[32m+[m[32m## Prisma[m
[32m+[m
[32m+[m[32mUtilizar Prisma como ORM padrão do projeto.[m
[32m+[m
[32m+[m[32mNão criar SQL bruto quando Prisma resolver claramente a operação.[m
[32m+[m
[32m+[m[32mSQL parametrizado pode ser utilizado quando necessário para uma operação que não seja adequadamente expressa através do ORM.[m
[32m+[m
[32m+[m[32m## Migrations[m
[32m+[m
[32m+[m[32mAlterações estruturais devem ser realizadas através de migrations.[m
[32m+[m
[32m+[m[32mNão editar manualmente o banco de produção para corrigir problemas de schema.[m
[32m+[m
[32m+[m[32mNão apagar migrations existentes sem compreender o impacto.[m
[32m+[m
[32m+[m[32m## Seed[m
[32m+[m
[32m+[m[32mO seed é executado explicitamente com `prisma db seed`.[m
[32m+[m
[32m+[m[32mNão assumir que o seed roda automaticamente durante `prisma migrations dev` ou `prisma migrate dev`.[m
[32m+[m
[32m+[m[32mO seed deve usar `upsert` para garantir idempotência.[m
[32m+[m
[32m+[m[32mConsultar `prisma/seed.ts` para a lista de dados iniciais (roles, permissions, specialties).[m
[32m+[m
[32m+[m[32m## Modelagem[m
[32m+[m
[32m+[m[32mUtilizar adequadamente:[m
[32m+[m
[32m+[m[32m* primary keys;[m
[32m+[m[32m* foreign keys;[m
[32m+[m[32m* unique constraints;[m
[32m+[m[32m* índices;[m
[32m+[m[32m* relações;[m
[32m+[m[32m* nullability;[m
[32m+[m[32m* defaults.[m
[32m+[m
[32m+[m[32mNão criar relações artificiais apenas para simplificar uma consulta.[m
[32m+[m
[32m+[m[32m## Integridade[m
[32m+[m
[32m+[m[32mA aplicação não deve ser a única responsável por integridade fundamental dos dados quando essa integridade puder ser garantida pelo PostgreSQL.[m
[32m+[m
[32m+[m[32m## Dados históricos[m
[32m+[m
[32m+[m[32mNão sobrescrever ou excluir dados históricos importantes sem requisito explícito.[m
[32m+[m
[32m+[m[32m## Conhecimento de SQL[m
[32m+[m
[32m+[m[32mPrisma não elimina a necessidade de compreender SQL.[m
[32m+[m
[32m+[m[32mConsultas complexas devem ser avaliadas tanto do ponto de vista do ORM quanto do banco.[m
[1mdiff --git a/.opencode/skills/frontend/SKILL.md b/.opencode/skills/frontend/SKILL.md[m
[1mindex 54a008f..b10f6c4 100644[m
[1m--- a/.opencode/skills/frontend/SKILL.md[m
[1m+++ b/.opencode/skills/frontend/SKILL.md[m
[36m@@ -1,15 +1,68 @@[m
 ---[m
[32m+[m
 name: frontend[m
[31m-description: Diretrizes para desenvolvimento da interface do ERP veterinário.[m
[31m----[m
[32m+[m[32mdescription: Orienta o desenvolvimento do frontend React + TypeScript do ERP veterinário.[m
[32m+[m[32m-----------------------------------------------------------------------------------------[m
 [m
 # Frontend[m
 [m
[31m-Antes de criar uma nova interface:[m
[32m+[m[32m## Stack[m
[32m+[m
[32m+[m[32m* React[m
[32m+[m[32m* TypeScript[m
[32m+[m[32m* Vite[m
[32m+[m[32m* Tailwind CSS[m
[32m+[m[32m* shadcn/ui[m
[32m+[m
[32m+[m[32m## Desenvolvimento[m
[32m+[m
[32m+[m[32mAntes de criar uma tela ou componente:[m
[32m+[m
[32m+[m[32m1. verificar componentes existentes;[m
[32m+[m[32m2. verificar padrões de layout;[m
[32m+[m[32m3. verificar sistema de rotas;[m
[32m+[m[32m4. verificar padrões de formulários;[m
[32m+[m[32m5. verificar como a API é consumida atualmente.[m
[32m+[m
[32m+[m[32mReutilizar componentes existentes quando apropriado.[m
[32m+[m
[32m+[m[32mNão criar componentes equivalentes com nomes diferentes.[m
[32m+[m
[32m+[m[32m## Responsabilidades[m
[32m+[m
[32m+[m[32mO frontend deve ser responsável principalmente por:[m
[32m+[m
[32m+[m[32m* apresentação;[m
[32m+[m[32m* interação;[m
[32m+[m[32m* estado visual;[m
[32m+[m[32m* formulários;[m
[32m+[m[32m* validação de interface;[m
[32m+[m[32m* comunicação com a API.[m
[32m+[m
[32m+[m[32mO frontend não deve ser a autoridade final para regras de negócio ou autorização.[m
[32m+[m
[32m+[m[32m## Formulários[m
[32m+[m
[32m+[m[32mFormulários devem possuir:[m
[32m+[m
[32m+[m[32m* validação;[m
[32m+[m[32m* feedback visual;[m
[32m+[m[32m* estado de carregamento;[m
[32m+[m[32m* tratamento de erro;[m
[32m+[m[32m* feedback de sucesso quando apropriado.[m
[32m+[m
[32m+[m[32m## API[m
[32m+[m
[32m+[m[32mNão acessar diretamente o banco.[m
[32m+[m
[32m+[m[32mToda comunicação com dados persistidos deve ocorrer através do backend.[m
[32m+[m
[32m+[m[32m## Interface[m
[32m+[m
[32m+[m[32mPriorizar consistência visual.[m
[32m+[m
[32m+[m[32mUtilizar componentes do projeto antes de criar novos.[m
[32m+[m
[32m+[m[32mInterfaces administrativas devem priorizar clareza e produtividade sobre efeitos visuais desnecessários.[m
 [m
[31m-- Inspecione os componentes existentes.[m
[31m-- Reutilize padrões visuais e componentes já utilizados.[m
[31m-- Não introduza uma nova biblioteca de UI sem necessidade.[m
[31m-- Mantenha validação e regras críticas no backend.[m
[31m-- Garanta estados de carregamento, erro e vazio quando aplicável.[m
[31m-- Verifique responsividade e acessibilidade conforme a stack utilizada.[m
[32m+[m[32mManter acessibilidade e responsividade conforme o contexto da aplicação.[m
[1mdiff --git a/.opencode/skills/project-context/SKILL.md b/.opencode/skills/project-context/SKILL.md[m
[1mindex dc1c17a..6787600 100644[m
[1m--- a/.opencode/skills/project-context/SKILL.md[m
[1m+++ b/.opencode/skills/project-context/SKILL.md[m
[36m@@ -1,21 +1,34 @@[m
 ---[m
 [m
 name: project-context[m
[31m-description: Orientações para analisar e trabalhar no ERP veterinário sem assumir arquitetura, tecnologia ou regras de negócio não confirmadas.[m
[31m------------------------------------------------------------------------------------------------------------------------------------------------[m
[32m+[m[32mdescription: Analisa o contexto, arquitetura, stack e organização do ERP veterinário antes de implementar alterações.[m
[32m+[m[32m---------------------------------------------------------------------------------------------------------------------[m
 [m
 # Project Context[m
 [m
[31m-Antes de implementar uma tarefa:[m
[32m+[m[32mUse esta Skill antes de alterações que possam afetar arquitetura ou múltiplas partes do projeto.[m
 [m
[31m-1. Inspecione a estrutura relevante do projeto.[m
[31m-2. Identifique a stack realmente utilizada a partir dos arquivos existentes.[m
[31m-3. Localize os módulos relacionados à tarefa.[m
[31m-4. Verifique padrões já utilizados no projeto.[m
[31m-5. Reutilize componentes, serviços e abstrações existentes quando apropriado.[m
[32m+[m[32m## Procedimento[m
 [m
[31m-Não assuma tecnologias que ainda não estejam definidas no projeto.[m
[32m+[m[32m1. Inspecione a estrutura do projeto.[m
[32m+[m[32m2. Identifique a stack real através dos arquivos de configuração.[m
[32m+[m[32m3. Leia os arquivos relacionados à tarefa.[m
[32m+[m[32m4. Identifique padrões já existentes.[m
[32m+[m[32m5. Verifique dependências entre os módulos envolvidos.[m
[32m+[m[32m6. Determine o menor conjunto de alterações necessário.[m
 [m
[31m-Não introduza uma arquitetura nova apenas para resolver uma tarefa pequena.[m
[32m+[m[32m## Regras[m
 [m
[31m-Quando faltar uma decisão importante, não invente a resposta. Explique qual informação está faltando e utilize a alternativa mais conservadora possível apenas quando isso não alterar uma regra de negócio.[m
[32m+[m[32mNão presumir que a estrutura do projeto ainda corresponde aos exemplos documentados.[m
[32m+[m
[32m+[m[32mO código existente é a fonte de verdade para detalhes de implementação já estabelecidos.[m
[32m+[m
[32m+[m[32mNão substituir uma arquitetura existente apenas porque outra abordagem parece mais conveniente.[m
[32m+[m
[32m+[m[32mNão modificar arquivos não relacionados à tarefa.[m
[32m+[m
[32m+[m[32mQuando houver conflito entre documentação antiga e implementação atual, sinalizar o conflito antes de fazer uma mudança estrutural.[m
[32m+[m
[32m+[m[32m## Objetivo[m
[32m+[m
[32m+[m[32mPreservar consistência arquitetural e impedir que novas funcionalidades sejam implementadas de maneira isolada do restante do sistema.[m
[1mdiff --git a/.opencode/skills/testing/SKILL.md b/.opencode/skills/testing/SKILL.md[m
[1mindex 945d5db..adce66e 100644[m
[1m--- a/.opencode/skills/testing/SKILL.md[m
[1m+++ b/.opencode/skills/testing/SKILL.md[m
[36m@@ -1,14 +1,62 @@[m
 ---[m
[32m+[m
 name: testing[m
[31m-description: Diretrizes para testes e validação das alterações do ERP veterinário.[m
[31m----[m
[32m+[m[32mdescription: Orienta testes unitários, testes de API e testes end-to-end do ERP veterinário.[m
[32m+[m[32m--------------------------------------------------------------------------------------------[m
 [m
 # Testing[m
 [m
[31m-Depois de alterar o projeto:[m
[32m+[m[32m## Ferramentas[m
[32m+[m
[32m+[m[32m* Vitest[m
[32m+[m[32m* Supertest[m
[32m+[m[32m* Playwright[m
[32m+[m
[32m+[m[32m## Testes unitários[m
[32m+[m
[32m+[m[32mUtilizar Vitest para testar:[m
[32m+[m
[32m+[m[32m* regras de negócio;[m
[32m+[m[32m* funções;[m
[32m+[m[32m* services;[m
[32m+[m[32m* utilitários;[m
[32m+[m[32m* casos de erro.[m
[32m+[m
[32m+[m[32mPriorizar comportamento observável.[m
[32m+[m
[32m+[m[32m## Testes de API[m
[32m+[m
[32m+[m[32mUtilizar Supertest quando necessário para verificar:[m
[32m+[m
[32m+[m[32m* endpoints;[m
[32m+[m[32m* autenticação;[m
[32m+[m[32m* autorização;[m
[32m+[m[32m* validação;[m
[32m+[m[32m* respostas;[m
[32m+[m[32m* integração entre módulos.[m
[32m+[m
[32m+[m[32m## Testes end-to-end[m
[32m+[m
[32m+[m[32mUtilizar Playwright para fluxos completos relevantes.[m
[32m+[m
[32m+[m[32mExemplo:[m
[32m+[m
[32m+[m[32mlogin[m
[32m+[m[32m→ acessar módulo[m
[32m+[m[32m→ preencher formulário[m
[32m+[m[32m→ enviar[m
[32m+[m[32m→ verificar resultado[m
[32m+[m
[32m+[m[32m## Regras[m
[32m+[m
[32m+[m[32mToda regra de negócio nova ou modificada deve receber testes apropriados.[m
[32m+[m
[32m+[m[32mTestar casos de sucesso e casos de falha.[m
[32m+[m
[32m+[m[32mNão testar somente implementação interna.[m
[32m+[m
[32m+[m[32mEvitar testes excessivamente acoplados à estrutura interna do código.[m
[32m+[m
[32m+[m[32m## Conclusão[m
 [m
[31m-- Execute os testes diretamente relacionados à alteração.[m
[31m-- Execute typecheck e lint quando disponíveis.[m
[31m-- Execute build quando relevante.[m
[31m-- Adicione testes para regras de negócio novas ou modificadas.[m
[31m-- Não considere uma tarefa concluída apenas porque o código compila.[m
[32m+[m[32mUma funcionalidade só deve ser considerada validada depois que os testes e verificações apropriados forem executados.[m
[1mdiff --git a/.opencode/skills/veterinary-domain/SKILL.md b/.opencode/skills/veterinary-domain/SKILL.md[m
[1mindex 9182498..49ae83a 100644[m
[1m--- a/.opencode/skills/veterinary-domain/SKILL.md[m
[1m+++ b/.opencode/skills/veterinary-domain/SKILL.md[m
[36m@@ -1,48 +1,127 @@[m
 ---[m
 [m
 name: veterinary-domain[m
[31m-description: Diretrizes para modelagem e implementação das entidades e fluxos do domínio de gestão veterinária.[m
[31m----------------------------------------------------------------------------------------------------------------[m
[32m+[m[32mdescription: Orienta a análise e implementação das entidades, relacionamentos e regras do domínio veterinário em um SaaS multi-tenant.[m
[32m+[m[32m--------------------------------------------------------------------------------------------------------------------------------------[m
 [m
 # Veterinary Domain[m
 [m
[31m-Trabalhe com o domínio veterinário de forma explícita e conservadora.[m
[32m+[m[32mUse esta Skill quando uma tarefa envolver regras ou entidades específicas do domínio veterinário.[m
 [m
 ## Princípios[m
 [m
[31m-* Não invente regras clínicas, fiscais ou administrativas sem uma especificação.[m
[31m-* Diferencie claramente dados do tutor, paciente animal, atendimento e estabelecimento.[m
[31m-* Não trate animal e tutor como a mesma entidade.[m
[31m-* Preserve histórico de informações que precisam ser auditáveis.[m
[31m-* Evite sobrescrever informações históricas quando for necessário manter rastreabilidade.[m
[31m-* Diferencie cadastro, atendimento, procedimento, prescrição, exame, vacinação, estoque e financeiro quando esses conceitos fizerem parte do sistema.[m
[32m+[m[32mNão inventar regras clínicas ou administrativas.[m
[32m+[m
[32m+[m[32mNão transformar uma suposição em regra de negócio.[m
[32m+[m
[32m+[m[32mDiferenciar entidades e responsabilidades claramente.[m
[32m+[m
[32m+[m[32mAnimal e tutor são entidades distintas.[m
[32m+[m
[32m+[m[32mUm tutor pode possuir múltiplos animais.[m
[32m+[m
[32m+[m[32m## Multi-tenancy[m
[32m+[m
[32m+[m[32mO sistema é um SaaS multi-tenant com PostgreSQL compartilhado e isolamento por tenant_id.[m
[32m+[m
[32m+[m[32mCada estabelecimento veterinário constitui um tenant.[m
[32m+[m
[32m+[m[32mAntes de definir uma entidade do domínio, determine se seus dados são:[m
[32m+[m
[32m+[m[32m* globais ao sistema;[m
[32m+[m[32m* pertencentes a um tenant;[m
[32m+[m[32m* pertencentes a um usuário dentro de um tenant;[m
[32m+[m[32m* relacionados a outro recurso que determina seu tenant.[m
[32m+[m
[32m+[m[32mDados específicos de um estabelecimento devem permanecer isolados dos demais estabelecimentos.[m
[32m+[m
[32m+[m[32mO isolamento de tenant deve ser aplicado no backend e refletido na modelagem do banco.[m
[32m+[m
[32m+[m[32mConsultar `docs/domain-model.md` para o modelo completo.[m
[32m+[m
[32m+[m[32m## Conceitos[m
[32m+[m
[32m+[m[32mOs conceitos abaixo estão definidos e especificados:[m
[32m+[m
[32m+[m[32m* Tutor (cadastro por clínica com TutorIdentity global)[m
[32m+[m[32m* Animal (entidade global com TenantAnimal)[m
[32m+[m[32m* Agendamento[m
[32m+[m[32m* Atendimento[m
[32m+[m[32m* Prontuário[m
[32m+[m[32m* Procedimento[m
[32m+[m[32m* Exame[m
[32m+[m[32m* Vacinação[m
[32m+[m[32m* Prescrição[m
[32m+[m[32m* Produto[m
[32m+[m[32m* Estoque[m
[32m+[m[32m* Venda[m
[32m+[m[32m* Financeiro[m
[32m+[m
[32m+[m[32mConsultar `docs/domain-model.md` e `docs/business-rules.md` para detalhes de Tutor e Animal.[m
 [m
 ## Modelagem[m
 [m
[31m-Antes de criar uma entidade:[m
[32m+[m[32mAntes de criar ou modificar uma entidade:[m
 [m
[31m-1. Verifique se já existe uma entidade equivalente.[m
[31m-2. Identifique suas relações com as demais entidades.[m
[31m-3. Determine quais dados são obrigatórios somente quando houver especificação suficiente.[m
[31m-4. Verifique impacto no banco, backend e interface.[m
[32m+[m[32m1. verificar se já existe uma entidade equivalente;[m
[32m+[m[32m2. identificar relacionamentos;[m
[32m+[m[32m3. verificar escopo do tenant;[m
[32m+[m[32m4. verificar histórico;[m
[32m+[m[32m5. verificar impacto no banco;[m
[32m+[m[32m6. verificar impacto na API;[m
[32m+[m[32m7. verificar impacto na interface.[m
[32m+[m
[32m+[m[32m## Histórico[m
 [m
[31m-## Regras de negócio[m
[32m+[m[32mQuando uma informação possuir relevância histórica, evitar simplesmente substituir ou excluir o valor anterior.[m
 [m
[31m-Regras ainda não especificadas devem permanecer explicitamente indefinidas.[m
[32m+[m[32mUtilizar mecanismos de histórico quando isso estiver previsto nos requisitos.[m
 [m
[31m-Não criar automaticamente regras como:[m
[32m+[m[32m## Regras indefinidas[m
 [m
[31m-* periodicidade de vacinação;[m
[31m-* doses ou medicamentos;[m
[32m+[m[32mConsiderar explicitamente como indefinidas, até especificação:[m
[32m+[m
[32m+[m[32m* protocolos médicos;[m
[32m+[m[32m* doses;[m
[32m+[m[32m* frequência de vacinação;[m
 * preços;[m
[31m-* impostos;[m
 * descontos;[m
[31m-* permissões de usuários;[m
[31m-* estados clínicos;[m
[31m-* protocolos médicos.[m
[32m+[m[32m* impostos;[m
[32m+[m[32m* regras de estoque;[m
[32m+[m[32m* regras de cancelamento;[m
[32m+[m[32m* regras financeiras.[m
 [m
[31m-Essas regras devem vir de requisitos do projeto.[m
[32m+[m[32mNão implementar essas regras por inferência.[m
 [m
[31m-## Histórico[m
[32m+[m[32m## Relações definidas[m
[32m+[m
[32m+[m[32mAs seguintes relações já foram definidas pela especificação funcional:[m
[32m+[m
[32m+[m[32m* User ↔ Tenant: N:M via UserTenant (um único vínculo por combinação)[m
[32m+[m[32m* User ↔ Veterinarian: 1:1 (Veterinarian pode existir sem User)[m
[32m+[m[32m* Veterinarian ↔ Tenant: N:M via TenantVeterinarian[m
[32m+[m[32m* Veterinarian ↔ Specialty: N:M via VeterinarianSpecialty[m
[32m+[m[32m* TutorIdentity ↔ Tutor: 1:N (TutorIdentity global, Tutor tenant-scoped)[m
[32m+[m[32m* Animal ↔ Tenant: N:M via TenantAnimal[m
[32m+[m[32m* Animal ↔ Tutor: N:M via AnimalTutor (tenant-scoped)[m
[32m+[m[32m* Animal ↔ Species: N:1[m
[32m+[m[32m* Animal ↔ Breed: N:1[m
[32m+[m[32m* Species ↔ Breed: 1:N[m
[32m+[m[32m* Animal ↔ Allergy: N:M via AnimalAllergy[m
[32m+[m[32m* Animal ↔ Medication: N:M via AnimalMedication[m
[32m+[m[32m* Animal ↔ Vaccine: N:M via AnimalVaccination[m
[32m+[m[32m* Animal ↔ WeightRecord: 1:N[m
[32m+[m
[32m+[m[32m## Relações ainda não definidas[m
[32m+[m
[32m+[m[32m* Animal ↔ Veterinário[m
[32m+[m[32m* Atendimento ↔ Animal[m
[32m+[m[32m* Atendimento ↔ Veterinário[m
[32m+[m[32m* Agendamento ↔ Atendimento[m
[32m+[m[32m* Prontuário ↔ Atendimento[m
[32m+[m
[32m+[m[32mEssas relações devem ser definidas antes da modelagem definitiva do banco de dados do domínio.[m
[32m+[m
[32m+[m[32m## Objetivo[m
 [m
[31m-Informações clínicas, financeiras ou administrativas relevantes devem preservar histórico quando a alteração do dado original puder comprometer rastreabilidade.[m
[32m+[m[32mManter o domínio veterinário explícito, coerente, auditável e compatível com o modelo SaaS multi-tenant, sem transformar suposições em regras de negócio.[m
[1mdiff --git a/AGENTS.md b/AGENTS.md[m
[1mindex 51dcc3c..afa7a9d 100644[m
[1m--- a/AGENTS.md[m
[1m+++ b/AGENTS.md[m
[36m@@ -1,71 +1,469 @@[m
[31m-# ERP Veterinário — Instruções do Projeto[m
[32m+[m[32m# ERP Veterinário — Regras do Projeto[m
 [m
[31m-## Objetivo[m
[32m+[m[32m## 1. Objetivo[m
 [m
[31m-Este repositório contém o desenvolvimento de um sistema ERP veterinário.[m
[32m+[m[32mEste projeto é um ERP veterinário desenvolvido como um SaaS multi-tenant.[m
 [m
[31m-O sistema deve ser desenvolvido de forma incremental, mantendo arquitetura, regras de negócio, banco de dados e interface consistentes.[m
[32m+[m[32mO sistema será oferecido como uma plataforma para múltiplos estabelecimentos veterinários independentes.[m
 [m
[31m-## Regras gerais[m
[32m+[m[32mCada estabelecimento representa um tenant lógico do sistema.[m
 [m
[31m-* Antes de modificar código existente, inspecione a implementação atual e suas dependências.[m
[31m-* Não invente regras de negócio, campos, entidades ou fluxos quando não houver informação suficiente.[m
[31m-* Quando uma decisão de negócio não estiver definida, sinalize a lacuna em vez de assumir uma regra.[m
[31m-* Preserve funcionalidades existentes ao implementar novas funcionalidades.[m
[31m-* Evite alterações grandes e não relacionadas à tarefa solicitada.[m
[31m-* Prefira soluções simples, legíveis e fáceis de manter.[m
[31m-* Não duplique lógica quando uma abstração existente puder ser reutilizada.[m
[31m-* Não altere arquivos gerados automaticamente sem verificar sua origem.[m
[31m-* Não adicione dependências sem justificar a necessidade.[m
[32m+[m[32mOs dados pertencentes a um estabelecimento devem permanecer isolados dos dados dos demais estabelecimentos.[m
 [m
[31m-## Arquitetura[m
[32m+[m[32mO usuário autenticado somente poderá acessar dados dos estabelecimentos aos quais possui vínculo e autorização.[m
 [m
[31m-* A arquitetura real do projeto deve ser identificada a partir do código e das configurações existentes.[m
[31m-* Não assumir framework, biblioteca, banco de dados ou padrão arquitetural sem verificar os arquivos do projeto.[m
[31m-* Manter separação clara entre apresentação, lógica de negócio, acesso a dados e infraestrutura quando a arquitetura adotada permitir.[m
[32m+[m[32mO sistema deve ser projetado desde o início considerando múltiplos tenants.[m
 [m
[31m-## Banco de dados[m
[32m+[m[32mNão implementar uma arquitetura single-clinic e tentar adicionar multi-tenancy posteriormente como uma alteração superficial.[m
 [m
[31m-* Não modificar o schema diretamente sem verificar migrations e dependências.[m
[31m-* Alterações estruturais do banco devem ser versionadas por migrations quando o stack utilizado oferecer esse mecanismo.[m
[31m-* Evitar perda de dados.[m
[31m-* Não remover ou renomear campos/tabelas existentes sem verificar todas as referências.[m
[31m-* Dados clínicos e administrativos devem possuir modelagem explícita e consistente.[m
[32m+[m[32mO isolamento entre tenants é um requisito fundamental de segurança e arquitetura.[m
 [m
[31m-## Segurança[m
[32m+[m[32mO sistema será desenvolvido de forma incremental, priorizando:[m
 [m
[31m-* Nunca colocar senhas, tokens, chaves de API ou credenciais diretamente no código.[m
[31m-* Segredos devem permanecer em variáveis de ambiente ou mecanismo equivalente.[m
[31m-* Validar dados provenientes do usuário antes de utilizá-los.[m
[31m-* Aplicar autorização no backend, não apenas na interface.[m
[31m-* Não armazenar dados desnecessários.[m
[32m+[m[32m* clareza arquitetural;[m
[32m+[m[32m* manutenção;[m
[32m+[m[32m* segurança;[m
[32m+[m[32m* isolamento de dados;[m
[32m+[m[32m* integridade dos dados;[m
[32m+[m[32m* testabilidade;[m
[32m+[m[32m* facilidade de evolução;[m
[32m+[m[32m* compreensão do código pelos desenvolvedores.[m
 [m
[31m-## Desenvolvimento[m
[32m+[m[32mO agente deve implementar o sistema de acordo com os requisitos definidos neste projeto e não criar regras de negócio por conta própria.[m
 [m
[31m-Antes de considerar uma tarefa concluída:[m
[32m+[m[32m---[m
 [m
[31m-1. Verifique os arquivos afetados.[m
[31m-2. Execute os testes relevantes.[m
[31m-3. Execute o lint/typecheck/build disponível no projeto.[m
[31m-4. Verifique se a alteração introduziu erros ou regressões.[m
[31m-5. Resuma objetivamente o que foi alterado e quais verificações foram executadas.[m
[32m+[m[32m## 2. Stack oficial[m
 [m
[31m-## Git[m
[32m+[m[32m### Frontend[m
 [m
[31m-* Não fazer commit automaticamente sem solicitação explícita.[m
[31m-* Não apagar alterações existentes do usuário.[m
[31m-* Evitar comandos destrutivos.[m
[31m-* Commits devem representar uma alteração lógica coerente.[m
[32m+[m[32m* React[m
[32m+[m[32m* TypeScript[m
[32m+[m[32m* Vite[m
[32m+[m[32m* Tailwind CSS[m
[32m+[m[32m* shadcn/ui[m
 [m
[31m-## Uso das Skills[m
[32m+[m[32m### Backend[m
 [m
[31m-Use as Skills específicas quando a tarefa envolver seus respectivos domínios.[m
[32m+[m[32m* Node.js[m
[32m+[m[32m* TypeScript[m
[32m+[m[32m* NestJS[m
[32m+[m[32m* API REST[m
 [m
[31m-* project-context: contexto e organização do projeto.[m
[31m-* veterinary-domain: entidades e regras relacionadas ao domínio veterinário.[m
[31m-* frontend: interface e experiência do usuário.[m
[31m-* backend: APIs, serviços e lógica de negócio.[m
[31m-* database: modelagem, migrations e consultas.[m
[31m-* testing: testes, validação e regressão.[m
[32m+[m[32m### Persistência[m
[32m+[m
[32m+[m[32m* PostgreSQL[m
[32m+[m[32m* Prisma ORM[m
[32m+[m
[32m+[m[32m### Autenticação[m
[32m+[m
[32m+[m[32m* autenticação baseada em credenciais;[m
[32m+[m[32m* Argon2id para armazenamento seguro de senhas;[m
[32m+[m[32m* JWT para autenticação;[m
[32m+[m[32m* access token de curta duração;[m
[32m+[m[32m* refresh token de longa duração;[m
[32m+[m[32m* controle de acesso baseado em papéis e permissões.[m
[32m+[m
[32m+[m[32m### Testes[m
[32m+[m
[32m+[m[32m* Vitest para testes unitários;[m
[32m+[m[32m* Supertest para testes de API;[m
[32m+[m[32m* Playwright para testes end-to-end.[m
[32m+[m
[32m+[m[32m### Infraestrutura[m
[32m+[m
[32m+[m[32m* Docker;[m
[32m+[m[32m* Docker Compose.[m
[32m+[m
[32m+[m[32m### Controle de versão[m
[32m+[m
[32m+[m[32m* Git;[m
[32m+[m[32m* GitHub.[m
[32m+[m
[32m+[m[32mNão introduzir outra tecnologia para substituir uma dessas sem decisão explícita do projeto.[m
[32m+[m
[32m+[m[32m---[m
[32m+[m
[32m+[m[32m## 3. Arquitetura[m
[32m+[m
[32m+[m[32mO backend deve permanecer como um monólito modular.[m
[32m+[m
[32m+[m[32mNão utilizar microservices.[m
[32m+[m
[32m+[m[32mOs módulos de domínio devem permanecer separados dentro da aplicação NestJS.[m
[32m+[m
[32m+[m[32mExemplo conceitual:[m
[32m+[m
[32m+[m[32msrc/[m
[32m+[m[32m├── auth/[m
[32m+[m[32m├── users/[m
[32m+[m[32m├── tenants/[m
[32m+[m[32m├── tutors/[m
[32m+[m[32m├── animals/[m
[32m+[m[32m├── appointments/[m
[32m+[m[32m├── consultations/[m
[32m+[m[32m├── medical-records/[m
[32m+[m[32m├── vaccines/[m
[32m+[m[32m├── prescriptions/[m
[32m+[m[32m├── inventory/[m
[32m+[m[32m└── billing/[m
[32m+[m
[32m+[m[32mA estrutura real poderá evoluir conforme os requisitos sejam definidos.[m
[32m+[m
[32m+[m[32mNão criar módulos apenas com base neste exemplo.[m
[32m+[m
[32m+[m[32m---[m
[32m+[m
[32m+[m[32m## 4. Multi-tenancy[m
[32m+[m
[32m+[m[32mO sistema utiliza arquitetura SaaS multi-tenant.[m
[32m+[m
[32m+[m[32mCada estabelecimento veterinário constitui um tenant.[m
[32m+[m
[32m+[m[32mA estratégia adotada para a primeira versão do sistema é:[m
[32m+[m
[32m+[m[32m* PostgreSQL compartilhado;[m
[32m+[m[32m* isolamento lógico por `tenant_id`.[m
[32m+[m
[32m+[m[32mDados pertencentes a um tenant não podem ser acessados por outro tenant.[m
[32m+[m
[32m+[m[32mA aplicação deve implementar isolamento de tenant em múltiplas camadas:[m
[32m+[m
[32m+[m[32m1. o backend determina o contexto do tenant a partir da autenticação e autorização;[m
[32m+[m[32m2. a camada de acesso a dados deve respeitar o tenant atual;[m
[32m+[m[32m3. operações de leitura, criação, atualização e exclusão devem respeitar o tenant;[m
[32m+[m[32m4. testes automatizados devem verificar tentativas de acesso cross-tenant;[m
[32m+[m[32m5. PostgreSQL Row-Level Security (RLS) deve ser avaliado como camada adicional de defesa antes da primeira versão de produção.[m
[32m+[m
[32m+[m[32mO frontend nunca deve ser considerado responsável por garantir isolamento entre tenants.[m
[32m+[m
[32m+[m[32mNão confiar exclusivamente em filtros adicionados manualmente em controllers.[m
[32m+[m
[32m+[m[32mNão permitir que o cliente informe livremente um `tenant_id` para obter acesso a outro tenant.[m
[32m+[m
[32m+[m[32mA modelagem deve distinguir:[m
[32m+[m
[32m+[m[32m* dados globais da plataforma;[m
[32m+[m[32m* dados pertencentes a um tenant;[m
[32m+[m[32m* dados pertencentes a um usuário dentro de um tenant.[m
[32m+[m
[32m+[m[32mA estratégia de tabelas e relacionamentos com `tenant_id` deve ser definida durante a modelagem do domínio.[m
[32m+[m
[32m+[m[32mNão assumir que toda tabela deve possuir `tenant_id` diretamente. Quando uma entidade estiver inequivocamente vinculada a um tenant através de outra entidade, essa relação deve ser analisada antes de duplicar a informação.[m
[32m+[m
[32m+[m[32mA estratégia de banco compartilhado com `tenant_id` é uma decisão arquitetural da primeira versão. Uma eventual migração futura para schemas separados ou bancos separados exigirá um projeto de migração específico e não deve ser considerada uma mudança trivial.[m
[32m+[m
[32m+[m[32m---[m
[32m+[m
[32m+[m[32m## 5. Princípios de desenvolvimento[m
[32m+[m
[32m+[m[32mAntes de implementar qualquer funcionalidade:[m
[32m+[m
[32m+[m[32m1. Inspecionar o código existente.[m
[32m+[m[32m2. Identificar os módulos e abstrações relacionados.[m
[32m+[m[32m3. Verificar as convenções já utilizadas.[m
[32m+[m[32m4. Verificar dependências e impactos.[m
[32m+[m[32m5. Implementar somente o necessário para a tarefa.[m
[32m+[m
[32m+[m[32mNão reescrever partes do sistema sem necessidade.[m
[32m+[m
[32m+[m[32mNão introduzir abstrações excessivas.[m
[32m+[m
[32m+[m[32mNão duplicar código quando uma abstração existente puder ser reutilizada de maneira clara.[m
[32m+[m
[32m+[m[32mNão alterar arquivos não relacionados à tarefa.[m
[32m+[m
[32m+[m[32m---[m
[32m+[m
[32m+[m[32m## 6. Requisitos e regras de negócio[m
[32m+[m
[32m+[m[32mRequisitos funcionais têm prioridade sobre suposições do agente.[m
[32m+[m
[32m+[m[32mNunca inventar:[m
[32m+[m
[32m+[m[32m* regras clínicas;[m
[32m+[m[32m* protocolos veterinários;[m
[32m+[m[32m* regras fiscais;[m
[32m+[m[32m* regras financeiras;[m
[32m+[m[32m* preços;[m
[32m+[m[32m* impostos;[m
[32m+[m[32m* permissões;[m
[32m+[m[32m* protocolos de vacinação;[m
[32m+[m[32m* dosagens;[m
[32m+[m[32m* comportamentos administrativos.[m
[32m+[m
[32m+[m[32mQuando uma regra de negócio estiver indefinida, registrar a lacuna em vez de assumir uma resposta arbitrária.[m
[32m+[m
[32m+[m[32mDiferenciar claramente:[m
[32m+[m
[32m+[m[32m* requisito conhecido;[m
[32m+[m[32m* regra de negócio definida;[m
[32m+[m[32m* decisão técnica;[m
[32m+[m[32m* hipótese ainda não confirmada.[m
[32m+[m
[32m+[m[32m---[m
[32m+[m
[32m+[m[32m## 7. Domínio[m
[32m+[m
[32m+[m[32m### Entidades[m
[32m+[m
[32m+[m[32mAnimal e Tutor são entidades distintas.[m
[32m+[m
[32m+[m[32mUm Tutor pode possuir múltiplos Animais.[m
[32m+[m
[32m+[m[32mUm Animal pode possuir múltiplos Tutores.[m
[32m+[m
[32m+[m[32mInformações clínicas relevantes devem preservar histórico quando a alteração ou exclusão puder comprometer a rastreabilidade.[m
[32m+[m
[32m+[m[32mNão sobrescrever dados históricos quando o requisito exigir histórico.[m
[32m+[m
[32m+[m[32mEntidades e relações devem ser definidas a partir dos requisitos reais do projeto.[m
[32m+[m
[32m+[m[32m### Tutor[m
[32m+[m
[32m+[m[32mO Tutor possui uma identidade global mínima (TutorIdentity), mas o cadastro operacional existe por clínica.[m
[32m+[m
[32m+[m[32mTutorIdentity contém: nome, documento (CPF/CNPJ), tipo do documento. Não contém telefone, email ou endereço.[m
[32m+[m
[32m+[m[32mCPF/CNPJ são normalizados e únicos globalmente.[m
[32m+[m
[32m+[m[32mBusca global por CPF é permitida para descobrir que existe um registro em outra clínica, sem expor dados da outra clínica.[m
[32m+[m
[32m+[m[32mO nome do Tutor pertence à identidade global. Alterar o nome altera a identidade compartilhada e o nome visualizado por todas as clínicas.[m
[32m+[m
[32m+[m[32mO cadastro de uma clínica referencia a TutorIdentity. Tutor, TutorPhone, TutorAddress e TutorEmergencyContact são tenant-scoped.[m
[32m+[m
[32m+[m[32mConsultar `docs/domain-model.md` e `docs/business-rules.md` para detalhes completos.[m
[32m+[m
[32m+[m[32m### Animal[m
[32m+[m
[32m+[m[32mAnimal é uma entidade GLOBAL no sistema. O mesmo Animal pode ser atendido por várias clínicas.[m
[32m+[m
[32m+[m[32mAnimal possui `internalCode` único GLOBALMENTE (não por tenant).[m
[32m+[m
[32m+[m[32mMicrochip é opcional e único globalmente quando preenchido.[m
[32m+[m
[32m+[m[32mCastração, espécie, raça, sexo, data de nascimento, nome, foto, cor/pelagem e porte são dados GLOBAIS compartilhados entre clínicas.[m
[32m+[m
[32m+[m[32mProntuário, consultas e dados clínicos privados permanecem por tenant (TenantAnimal).[m
[32m+[m
[32m+[m[32mSpecies e Breed são entidades globais e dinâmicas.[m
[32m+[m
[32m+[m[32mPeso, alergias, medicamentos e vacinação são dados compartilhados com histórico e rastreabilidade de proveniência.[m
[32m+[m
[32m+[m[32mConsultar `docs/domain-model.md`, `docs/business-rules.md` e `docs/architecture.md` para detalhes completos.[m
[32m+[m
[32m+[m[32m---[m
[32m+[m
[32m+[m[32m## 8. Frontend[m
[32m+[m
[32m+[m[32mO frontend deve utilizar:[m
[32m+[m
[32m+[m[32m* React;[m
[32m+[m[32m* TypeScript;[m
[32m+[m[32m* Vite;[m
[32m+[m[32m* Tailwind CSS;[m
[32m+[m[32m* shadcn/ui.[m
[32m+[m
[32m+[m[32mReutilizar componentes existentes.[m
[32m+[m
[32m+[m[32mNão criar componentes equivalentes com nomes diferentes.[m
[32m+[m
[32m+[m[32mManter separação entre:[m
[32m+[m
[32m+[m[32m* apresentação;[m
[32m+[m[32m* estado da interface;[m
[32m+[m[32m* comunicação com API;[m
[32m+[m[32m* validação;[m
[32m+[m[32m* regras que pertencem ao backend.[m
[32m+[m
[32m+[m[32mRegras críticas de negócio não devem existir exclusivamente no frontend.[m
[32m+[m
[32m+[m[32mInterfaces devem possuir estados adequados para:[m
[32m+[m
[32m+[m[32m* carregamento;[m
[32m+[m[32m* sucesso;[m
[32m+[m[32m* erro;[m
[32m+[m[32m* ausência de dados;[m
[32m+[m[32m* validação.[m
[32m+[m
[32m+[m[32m---[m
[32m+[m
[32m+[m[32m## 9. Backend[m
[32m+[m
[32m+[m[32mO backend deve utilizar:[m
[32m+[m
[32m+[m[32m* NestJS;[m
[32m+[m[32m* TypeScript;[m
[32m+[m[32m* REST;[m
[32m+[m[32m* Prisma.[m
[32m+[m
[32m+[m[32mControllers devem permanecer responsáveis principalmente pela camada HTTP.[m
[32m+[m
[32m+[m[32mRegras de negócio devem permanecer em services, use cases ou na camada equivalente adotada pelo projeto.[m
[32m+[m
[32m+[m[32mNão colocar regras de negócio complexas diretamente em controllers.[m
[32m+[m
[32m+[m[32mValidar entradas no backend.[m
[32m+[m
[32m+[m[32mNunca confiar exclusivamente na validação realizada pelo frontend.[m
[32m+[m
[32m+[m[32mErros devem ser tratados de maneira consistente.[m
[32m+[m
[32m+[m[32mToda operação que acessa dados pertencentes a um tenant deve respeitar o contexto do tenant autenticado.[m
[32m+[m
[32m+[m[32m---[m
[32m+[m
[32m+[m[32m## 10. Banco de dados[m
[32m+[m
[32m+[m[32mO banco oficial é PostgreSQL.[m
[32m+[m
[32m+[m[32mO acesso ao banco deve utilizar Prisma como ORM.[m
[32m+[m
[32m+[m[32mAlterações estruturais devem ser versionadas através de migrations.[m
[32m+[m
[32m+[m[32mNão realizar alterações destrutivas sem verificar impactos.[m
[32m+[m
[32m+[m[32mNão excluir dados apenas para resolver problemas de modelagem.[m
[32m+[m
[32m+[m[32mVerificar:[m
[32m+[m
[32m+[m[32m* relacionamentos;[m
[32m+[m[32m* foreign keys;[m
[32m+[m[32m* unique constraints;[m
[32m+[m[32m* índices;[m
[32m+[m[32m* nullable;[m
[32m+[m[32m* defaults;[m
[32m+[m[32m* isolamento entre tenants.[m
[32m+[m
[32m+[m[32mSQL continua fazendo parte do conhecimento necessário do projeto, mesmo quando Prisma for utilizado.[m
[32m+[m
[32m+[m[32m---[m
[32m+[m
[32m+[m[32m## 11. Segurança[m
[32m+[m
[32m+[m[32mNunca armazenar senhas em texto puro.[m
[32m+[m
[32m+[m[32mUtilizar Argon2id para armazenamento de senhas.[m
[32m+[m
[32m+[m[32mNunca colocar:[m
[32m+[m
[32m+[m[32m* senhas;[m
[32m+[m[32m* tokens;[m
[32m+[m[32m* chaves privadas;[m
[32m+[m[32m* API keys;[m
[32m+[m[32m* credenciais[m
[32m+[m
[32m+[m[32mdiretamente no código ou no Git.[m
[32m+[m
[32m+[m[32mUtilizar variáveis de ambiente para segredos.[m
[32m+[m
[32m+[m[32mNunca registrar credenciais em logs.[m
[32m+[m
[32m+[m[32mAutorização deve ser verificada no backend.[m
[32m+[m
[32m+[m[32mO frontend não deve ser considerado uma camada de segurança.[m
[32m+[m
[32m+[m[32mFalhas de autorização cross-tenant devem ser tratadas como problemas críticos.[m
[32m+[m
[32m+[m[32m---[m
[32m+[m
[32m+[m[32m## 12. Autenticação e Autorização[m
[32m+[m
[32m+[m[32mA autenticação deve utilizar:[m
[32m+[m
[32m+[m[32m* credenciais (email + senha);[m
[32m+[m[32m* access token JWT (15 min, contém apenas sub + tenantId);[m
[32m+[m[32m* refresh token stateful (string aleatória, hash SHA-256 no banco, cookie HttpOnly);[m
[32m+[m[32m* sessão persistida no banco (tabela Session).[m
[32m+[m
[32m+[m[32mApós autenticar, o usuário seleciona explicitamente o Tenant. A Session é criada durante a seleção.[m
[32m+[m
[32m+[m[32mO sistema utiliza controle de acesso baseado em papéis (RBAC):[m
[32m+[m
[32m+[m[32m* Papéis iniciais: ADMIN, VETERINARIAN, RECEPTIONIST.[m
[32m+[m[32m* Roles são globais e definidas pelo sistema.[m
[32m+[m[32m* Um usuário pode ter múltiplos papéis no mesmo Tenant.[m
[32m+[m[32m* Permissions são granulares por recurso + ação (ex: ANIMAL_CREATE).[m
[32m+[m[32m* Permissions não ficam no JWT — são consultadas no backend com cache.[m
[32m+[m
[32m+[m[32mPlatform Admin é representado pelo campo `User.isPlatformAdmin`. Não há tabela `PlatformAdmin`.[m
[32m+[m
[32m+[m[32mConsultar `docs/architecture.md` e `docs/domain-model.md` para detalhes completos.[m
[32m+[m
[32m+[m[32mUm usuário não deve obter acesso a um tenant simplesmente por conhecer ou fornecer seu identificador.[m
[32m+[m
[32m+[m[32m---[m
[32m+[m
[32m+[m[32m## 13. Testes[m
[32m+[m
[32m+[m[32mNovas regras de negócio devem possuir testes apropriados.[m
[32m+[m
[32m+[m[32mAlterações importantes devem ser verificadas com:[m
[32m+[m
[32m+[m[32m* testes unitários;[m
[32m+[m[32m* testes de API;[m
[32m+[m[32m* testes end-to-end quando aplicável.[m
[32m+[m
[32m+[m[32mTestes devem incluir isolamento entre tenants nas funcionalidades que acessam dados tenant-specific.[m
[32m+[m
[32m+[m[32mUma funcionalidade não deve ser considerada concluída apenas porque o código compila.[m
[32m+[m
[32m+[m[32m---[m
[32m+[m
[32m+[m[32m## 14. Dependências[m
[32m+[m
[32m+[m[32mAntes de adicionar uma dependência:[m
[32m+[m
[32m+[m[32m1. verificar se a funcionalidade já pode ser implementada com a stack existente;[m
[32m+[m[32m2. avaliar manutenção e compatibilidade;[m
[32m+[m[32m3. verificar se uma biblioteca existente no projeto já resolve o problema.[m
[32m+[m
[32m+[m[32mNão adicionar bibliotecas apenas por conveniência.[m
[32m+[m
[32m+[m[32m---[m
[32m+[m
[32m+[m[32m## 15. Git[m
[32m+[m
[32m+[m[32mNão realizar commits automaticamente.[m
[32m+[m
[32m+[m[32mNão executar comandos destrutivos sem necessidade.[m
[32m+[m
[32m+[m[32mNão apagar alterações realizadas pelo usuário.[m
[32m+[m
[32m+[m[32mNão utilizar reset, checkout destrutivo, clean ou comandos equivalentes para descartar trabalho sem autorização explícita.[m
[32m+[m
[32m+[m[32mCada alteração deve permanecer logicamente separada quando possível.[m
[32m+[m
[32m+[m[32m---[m
[32m+[m
[32m+[m[32m## 16. Conclusão de tarefas[m
[32m+[m
[32m+[m[32mAntes de concluir uma tarefa:[m
[32m+[m
[32m+[m[32m1. verificar os arquivos alterados;[m
[32m+[m[32m2. verificar possíveis regressões;[m
[32m+[m[32m3. executar testes relevantes;[m
[32m+[m[32m4. executar lint quando disponível;[m
[32m+[m[32m5. executar typecheck quando disponível;[m
[32m+[m[32m6. executar build quando relevante.[m
[32m+[m
[32m+[m[32mNa resposta final, informar objetivamente:[m
[32m+[m
[32m+[m[32m* o que foi alterado;[m
[32m+[m[32m* quais testes foram executados;[m
[32m+[m[32m* quais verificações passaram;[m
[32m+[m[32m* quais problemas permaneceram.[m
[32m+[m
[32m+[m[32m---[m
[32m+[m
[32m+[m[32m## 17. Regra fundamental para uso de IA[m
[32m+[m
[32m+[m[32mO agente pode propor soluções técnicas, implementar código e analisar alternativas.[m
[32m+[m
[32m+[m[32mO agente não deve definir sozinho regras de negócio importantes.[m
[32m+[m
[32m+[m[32mQuando houver mais de uma interpretação válida de um requisito, preservar a ambiguidade e solicitar uma definição no contexto da tarefa, em vez de incorporar uma decisão arbitrária ao código.[m
[32m+[m
[32m+[m[32mA prioridade é manter o sistema coerente com os requisitos definidos pelos responsáveis pelo projeto.[m
 [m
[31m-Nunca trate uma Skill como substituta da inspeção do código existente.[m
