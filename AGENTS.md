# ERP Veterinário — Instruções do Projeto

## Objetivo e prioridades

Este projeto é um ERP veterinário SaaS multi-tenant. Cada estabelecimento é um tenant, e os dados de cada tenant devem permanecer isolados. Preserve a clareza arquitetural, segurança, integridade dos dados, testabilidade e facilidade de manutenção. Não introduza regras de negócio por suposição.

## Fontes de verdade

Antes de implementar, inspecione o código, configuração, testes e convenções existentes; identifique módulos, abstrações e dependências relacionados e faça a menor alteração necessária.

Use `docs/domain-model.md`, `docs/business-rules.md` e `docs/architecture.md` para regras e decisões documentadas. O código e os arquivos de configuração mostram a implementação atual, mas não anulam requisitos documentados. Se houver conflito entre requisito, documentação e implementação, registre a discrepância e não resolva uma regra de negócio ambígua por conta própria.

Não reescreva partes sem necessidade, não duplique abstrações existentes e não altere arquivos alheios à tarefa.

## Stack e arquitetura

Stack definida pelo projeto:

- Frontend: React, TypeScript, Vite, Tailwind CSS e shadcn/ui.
- Backend: Node.js, TypeScript, NestJS e API REST.
- Persistência: PostgreSQL e Prisma.
- Autenticação: credenciais, Argon2id, JWT de curta duração e refresh token de longa duração.
- Testes: Vitest, Supertest e Playwright quando aplicável.
- Infraestrutura: Docker e Docker Compose.

Não substitua tecnologias da stack sem decisão explícita do projeto. Confira a configuração real antes de presumir que uma parte da stack (por exemplo, o frontend) já está implementada.

O backend deve permanecer um monólito modular NestJS, organizado por domínio. Não adote microservices nem crie módulos apenas com base em exemplos documentais.

## Regras de domínio

Não invente regras clínicas, protocolos veterinários, dosagens, regras fiscais ou financeiras, preços, impostos, permissões, políticas de estoque, cancelamento ou comportamentos administrativos. Quando faltar uma regra, registre a lacuna e solicite uma definição antes de codificá-la.

Classifique cada item levantado explicitamente como: requisito conhecido; regra de negócio definida; decisão técnica; hipótese ainda não confirmada. Trate hipóteses como pendentes de definição e não as transforme em código sem confirmação.

Animal e Tutor são entidades distintas. Um Tutor pode estar associado a vários Animais, e um Animal a vários Tutores. Preserve histórico quando a alteração ou exclusão comprometer rastreabilidade.

### Tutor

- `TutorIdentity` é global e contém nome, tipo de documento e CPF/CNPJ; não contém telefone, email ou endereço.
- CPF/CNPJ são normalizados e únicos globalmente.
- Busca global por documento pode revelar que existe cadastro em outra clínica, sem expor os dados dessa clínica.
- O nome pertence à identidade global; sua alteração afeta todas as clínicas que a referenciam.
- O cadastro operacional e os dados de contato do Tutor são tenant-scoped.

### Animal

- Animal é uma entidade global. `internalCode` é único globalmente e microchip, quando preenchido, também é globalmente único.
- Nome, espécie, raça, sexo, castração, nascimento, foto, cor/pelagem e porte são atributos globais compartilhados.
- Espécies e raças são entidades globais e dinâmicas.
- Prontuário e outros dados privados da clínica permanecem no escopo do tenant.
- Peso, alergias, medicamentos e vacinação são compartilhados com histórico e proveniência, conforme especificado nos documentos de domínio.

## Multi-tenancy e segurança

O sistema é multi-tenant desde o início. Não implemente uma arquitetura single-clinic para adicionar multi-tenancy depois como uma alteração superficial; o isolamento entre tenants é requisito fundamental de segurança e arquitetura.

A primeira versão usa PostgreSQL compartilhado com isolamento lógico por tenant. Diferencie dados globais da plataforma, dados tenant-scoped, dados do usuário dentro de um tenant e dados globais com proveniência. Não adicione `tenantId` automaticamente a toda entidade; determine o escopo a partir do modelo documentado.

O backend determina o tenant autorizado a partir da autenticação e da autorização. O cliente não pode escolher livremente um identificador de tenant para obter acesso. Toda operação sobre dados tenant-scoped — leitura, criação, atualização e exclusão — deve aplicar o contexto do tenant na camada apropriada; não dependa apenas do frontend ou de validação no controller. Inclua verificações cross-tenant nos testes das funcionalidades afetadas. Avalie PostgreSQL RLS como defesa adicional antes da primeira versão de produção. Migrar futuramente para schemas ou bancos separados exige projeto específico.

Nunca armazene senhas em texto puro; use Argon2id. Mantenha segredos em variáveis de ambiente, fora do código e do Git, e nunca os registre em logs. A autorização é responsabilidade do backend. Trate falhas cross-tenant como problemas críticos.

## Backend

Controllers devem cuidar principalmente da camada HTTP; mantenha regras de negócio em services, use cases ou abstrações equivalentes. Valide entradas no backend e trate erros de forma consistente. Não exponha modelos internos do banco diretamente quando isso criar acoplamento desnecessário.

### Autenticação e autorização

- Login usa email e senha; após autenticar, o usuário seleciona explicitamente um tenant autorizado.
- A Session é criada durante a seleção do tenant.
- O access token JWT dura 15 minutos e contém somente `sub` e `tenantId` como claims de aplicação.
- O refresh token é aleatório, stateful, armazenado no banco apenas como hash SHA-256 e enviado por cookie HttpOnly.
- Roles iniciais: `ADMIN`, `VETERINARIAN` e `RECEPTIONIST`. Roles são globais; um usuário pode ter várias roles por tenant.
- Permissions são granulares por recurso e ação, não ficam no JWT e são consultadas no backend com cache.
- Platform Admin é representado por `User.isPlatformAdmin`; não existe tabela `PlatformAdmin`.

Consulte `docs/architecture.md` e `docs/domain-model.md` para detalhes e fluxos completos.

## Frontend

Reutilize componentes e padrões existentes; antes de criar telas ou componentes, confira layout, rotas, formulários e consumo da API. Separe apresentação, estado da interface, comunicação com API e validação. O frontend não é autoridade para autorização ou regras críticas de negócio. Interfaces devem tratar carregamento, sucesso, erro, ausência de dados e validação conforme aplicável.

## Banco de dados e dependências

Use Prisma como ORM padrão e versione alterações estruturais por migrations. Antes de alterar o banco, inspecione schema e migrations, relacionamentos, chaves estrangeiras, unicidade, índices, nullability, defaults e impacto nos dados e na API. Não apague migrations nem dados para contornar problemas de modelagem; não faça alterações destrutivas sem compreender seus impactos. Use SQL parametrizado quando necessário e adequado; Prisma não elimina a necessidade de considerar o comportamento do PostgreSQL.

Antes de adicionar dependências, verifique se a stack ou uma biblioteca já presente resolve o problema e avalie manutenção e compatibilidade. Não adicione dependências por conveniência.

## Testes e verificações

Novas regras de negócio e alterações relevantes devem ter testes apropriados, incluindo sucesso, falha, autorização e isolamento entre tenants quando aplicável. Prefira testes de comportamento observável, sem acoplamento excessivo à implementação interna.

Execute verificações relevantes disponíveis no projeto (testes, lint, typecheck ou build conforme o escopo) e informe na conclusão quais foram executadas, quais passaram e o que não pôde ser verificado. Não considere compilação isolada prova suficiente de correção.

## Git e conclusão

Não faça commits automaticamente. Não descarte alterações do usuário nem use comandos destrutivos como `reset`, `checkout` para descartar trabalho ou `clean` sem autorização explícita. Mantenha mudanças logicamente separadas quando possível.

Antes de concluir, revise os arquivos alterados e possíveis regressões. Na resposta, resuma o que mudou, verificações executadas e problemas restantes.
