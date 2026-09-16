# ERP Veterinário — Regras do Projeto

## 1. Objetivo

Este projeto é um ERP veterinário desenvolvido como um SaaS multi-tenant.

O sistema será oferecido como uma plataforma para múltiplos estabelecimentos veterinários independentes.

Cada estabelecimento representa um tenant lógico do sistema.

Os dados pertencentes a um estabelecimento devem permanecer isolados dos dados dos demais estabelecimentos.

O usuário autenticado somente poderá acessar dados dos estabelecimentos aos quais possui vínculo e autorização.

O sistema deve ser projetado desde o início considerando múltiplos tenants.

Não implementar uma arquitetura single-clinic e tentar adicionar multi-tenancy posteriormente como uma alteração superficial.

O isolamento entre tenants é um requisito fundamental de segurança e arquitetura.

O sistema será desenvolvido de forma incremental, priorizando:

* clareza arquitetural;
* manutenção;
* segurança;
* isolamento de dados;
* integridade dos dados;
* testabilidade;
* facilidade de evolução;
* compreensão do código pelos desenvolvedores.

O agente deve implementar o sistema de acordo com os requisitos definidos neste projeto e não criar regras de negócio por conta própria.

---

## 2. Stack oficial

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
* API REST

### Persistência

* PostgreSQL
* Prisma ORM

### Autenticação

* autenticação baseada em credenciais;
* Argon2id para armazenamento seguro de senhas;
* JWT para autenticação;
* access token de curta duração;
* refresh token de longa duração;
* controle de acesso baseado em papéis e permissões.

### Testes

* Vitest para testes unitários;
* Supertest para testes de API;
* Playwright para testes end-to-end.

### Infraestrutura

* Docker;
* Docker Compose.

### Controle de versão

* Git;
* GitHub.

Não introduzir outra tecnologia para substituir uma dessas sem decisão explícita do projeto.

---

## 3. Arquitetura

O backend deve permanecer como um monólito modular.

Não utilizar microservices.

Os módulos de domínio devem permanecer separados dentro da aplicação NestJS.

Exemplo conceitual:

src/
├── auth/
├── users/
├── tenants/
├── tutors/
├── animals/
├── appointments/
├── consultations/
├── medical-records/
├── vaccines/
├── prescriptions/
├── inventory/
└── billing/

A estrutura real poderá evoluir conforme os requisitos sejam definidos.

Não criar módulos apenas com base neste exemplo.

---

## 4. Multi-tenancy

O sistema utiliza arquitetura SaaS multi-tenant.

Cada estabelecimento veterinário constitui um tenant.

A estratégia adotada para a primeira versão do sistema é:

* PostgreSQL compartilhado;
* isolamento lógico por `tenant_id`.

Dados pertencentes a um tenant não podem ser acessados por outro tenant.

A aplicação deve implementar isolamento de tenant em múltiplas camadas:

1. o backend determina o contexto do tenant a partir da autenticação e autorização;
2. a camada de acesso a dados deve respeitar o tenant atual;
3. operações de leitura, criação, atualização e exclusão devem respeitar o tenant;
4. testes automatizados devem verificar tentativas de acesso cross-tenant;
5. PostgreSQL Row-Level Security (RLS) deve ser avaliado como camada adicional de defesa antes da primeira versão de produção.

O frontend nunca deve ser considerado responsável por garantir isolamento entre tenants.

Não confiar exclusivamente em filtros adicionados manualmente em controllers.

Não permitir que o cliente informe livremente um `tenant_id` para obter acesso a outro tenant.

A modelagem deve distinguir:

* dados globais da plataforma;
* dados pertencentes a um tenant;
* dados pertencentes a um usuário dentro de um tenant.

A estratégia de tabelas e relacionamentos com `tenant_id` deve ser definida durante a modelagem do domínio.

Não assumir que toda tabela deve possuir `tenant_id` diretamente. Quando uma entidade estiver inequivocamente vinculada a um tenant através de outra entidade, essa relação deve ser analisada antes de duplicar a informação.

A estratégia de banco compartilhado com `tenant_id` é uma decisão arquitetural da primeira versão. Uma eventual migração futura para schemas separados ou bancos separados exigirá um projeto de migração específico e não deve ser considerada uma mudança trivial.

---

## 5. Princípios de desenvolvimento

Antes de implementar qualquer funcionalidade:

1. Inspecionar o código existente.
2. Identificar os módulos e abstrações relacionados.
3. Verificar as convenções já utilizadas.
4. Verificar dependências e impactos.
5. Implementar somente o necessário para a tarefa.

Não reescrever partes do sistema sem necessidade.

Não introduzir abstrações excessivas.

Não duplicar código quando uma abstração existente puder ser reutilizada de maneira clara.

Não alterar arquivos não relacionados à tarefa.

---

## 6. Requisitos e regras de negócio

Requisitos funcionais têm prioridade sobre suposições do agente.

Nunca inventar:

* regras clínicas;
* protocolos veterinários;
* regras fiscais;
* regras financeiras;
* preços;
* impostos;
* permissões;
* protocolos de vacinação;
* dosagens;
* comportamentos administrativos.

Quando uma regra de negócio estiver indefinida, registrar a lacuna em vez de assumir uma resposta arbitrária.

Diferenciar claramente:

* requisito conhecido;
* regra de negócio definida;
* decisão técnica;
* hipótese ainda não confirmada.

---

## 7. Domínio

### Entidades

Animal e Tutor são entidades distintas.

Um Tutor pode possuir múltiplos Animais.

Um Animal pode possuir múltiplos Tutores.

Informações clínicas relevantes devem preservar histórico quando a alteração ou exclusão puder comprometer a rastreabilidade.

Não sobrescrever dados históricos quando o requisito exigir histórico.

Entidades e relações devem ser definidas a partir dos requisitos reais do projeto.

### Tutor

O Tutor possui uma identidade global mínima (TutorIdentity), mas o cadastro operacional existe por clínica.

TutorIdentity contém: nome, documento (CPF/CNPJ), tipo do documento. Não contém telefone, email ou endereço.

CPF/CNPJ são normalizados e únicos globalmente.

Busca global por CPF é permitida para descobrir que existe um registro em outra clínica, sem expor dados da outra clínica.

O nome do Tutor pertence à identidade global. Alterar o nome altera a identidade compartilhada e o nome visualizado por todas as clínicas.

O cadastro de uma clínica referencia a TutorIdentity. Tutor, TutorPhone, TutorAddress e TutorEmergencyContact são tenant-scoped.

Consultar `docs/domain-model.md` e `docs/business-rules.md` para detalhes completos.

### Animal

Animal é uma entidade GLOBAL no sistema. O mesmo Animal pode ser atendido por várias clínicas.

Animal possui `internalCode` único GLOBALMENTE (não por tenant).

Microchip é opcional e único globalmente quando preenchido.

Castração, espécie, raça, sexo, data de nascimento, nome, foto, cor/pelagem e porte são dados GLOBAIS compartilhados entre clínicas.

Prontuário, consultas e dados clínicos privados permanecem por tenant (TenantAnimal).

Species e Breed são entidades globais e dinâmicas.

Peso, alergias, medicamentos e vacinação são dados compartilhados com histórico e rastreabilidade de proveniência.

Consultar `docs/domain-model.md`, `docs/business-rules.md` e `docs/architecture.md` para detalhes completos.

---

## 8. Frontend

O frontend deve utilizar:

* React;
* TypeScript;
* Vite;
* Tailwind CSS;
* shadcn/ui.

Reutilizar componentes existentes.

Não criar componentes equivalentes com nomes diferentes.

Manter separação entre:

* apresentação;
* estado da interface;
* comunicação com API;
* validação;
* regras que pertencem ao backend.

Regras críticas de negócio não devem existir exclusivamente no frontend.

Interfaces devem possuir estados adequados para:

* carregamento;
* sucesso;
* erro;
* ausência de dados;
* validação.

---

## 9. Backend

O backend deve utilizar:

* NestJS;
* TypeScript;
* REST;
* Prisma.

Controllers devem permanecer responsáveis principalmente pela camada HTTP.

Regras de negócio devem permanecer em services, use cases ou na camada equivalente adotada pelo projeto.

Não colocar regras de negócio complexas diretamente em controllers.

Validar entradas no backend.

Nunca confiar exclusivamente na validação realizada pelo frontend.

Erros devem ser tratados de maneira consistente.

Toda operação que acessa dados pertencentes a um tenant deve respeitar o contexto do tenant autenticado.

---

## 10. Banco de dados

O banco oficial é PostgreSQL.

O acesso ao banco deve utilizar Prisma como ORM.

Alterações estruturais devem ser versionadas através de migrations.

Não realizar alterações destrutivas sem verificar impactos.

Não excluir dados apenas para resolver problemas de modelagem.

Verificar:

* relacionamentos;
* foreign keys;
* unique constraints;
* índices;
* nullable;
* defaults;
* isolamento entre tenants.

SQL continua fazendo parte do conhecimento necessário do projeto, mesmo quando Prisma for utilizado.

---

## 11. Segurança

Nunca armazenar senhas em texto puro.

Utilizar Argon2id para armazenamento de senhas.

Nunca colocar:

* senhas;
* tokens;
* chaves privadas;
* API keys;
* credenciais

diretamente no código ou no Git.

Utilizar variáveis de ambiente para segredos.

Nunca registrar credenciais em logs.

Autorização deve ser verificada no backend.

O frontend não deve ser considerado uma camada de segurança.

Falhas de autorização cross-tenant devem ser tratadas como problemas críticos.

---

## 12. Autenticação e Autorização

A autenticação deve utilizar:

* credenciais (email + senha);
* access token JWT (15 min, contém apenas sub + tenantId);
* refresh token stateful (string aleatória, hash SHA-256 no banco, cookie HttpOnly);
* sessão persistida no banco (tabela Session).

Após autenticar, o usuário seleciona explicitamente o Tenant. A Session é criada durante a seleção.

O sistema utiliza controle de acesso baseado em papéis (RBAC):

* Papéis iniciais: ADMIN, VETERINARIAN, RECEPTIONIST.
* Roles são globais e definidas pelo sistema.
* Um usuário pode ter múltiplos papéis no mesmo Tenant.
* Permissions são granulares por recurso + ação (ex: ANIMAL_CREATE).
* Permissions não ficam no JWT — são consultadas no backend com cache.

Platform Admin é representado pelo campo `User.isPlatformAdmin`. Não há tabela `PlatformAdmin`.

Consultar `docs/architecture.md` e `docs/domain-model.md` para detalhes completos.

Um usuário não deve obter acesso a um tenant simplesmente por conhecer ou fornecer seu identificador.

---

## 13. Testes

Novas regras de negócio devem possuir testes apropriados.

Alterações importantes devem ser verificadas com:

* testes unitários;
* testes de API;
* testes end-to-end quando aplicável.

Testes devem incluir isolamento entre tenants nas funcionalidades que acessam dados tenant-specific.

Uma funcionalidade não deve ser considerada concluída apenas porque o código compila.

---

## 14. Dependências

Antes de adicionar uma dependência:

1. verificar se a funcionalidade já pode ser implementada com a stack existente;
2. avaliar manutenção e compatibilidade;
3. verificar se uma biblioteca existente no projeto já resolve o problema.

Não adicionar bibliotecas apenas por conveniência.

---

## 15. Git

Não realizar commits automaticamente.

Não executar comandos destrutivos sem necessidade.

Não apagar alterações realizadas pelo usuário.

Não utilizar reset, checkout destrutivo, clean ou comandos equivalentes para descartar trabalho sem autorização explícita.

Cada alteração deve permanecer logicamente separada quando possível.

---

## 16. Conclusão de tarefas

Antes de concluir uma tarefa:

1. verificar os arquivos alterados;
2. verificar possíveis regressões;
3. executar testes relevantes;
4. executar lint quando disponível;
5. executar typecheck quando disponível;
6. executar build quando relevante.

Na resposta final, informar objetivamente:

* o que foi alterado;
* quais testes foram executados;
* quais verificações passaram;
* quais problemas permaneceram.

---

## 17. Regra fundamental para uso de IA

O agente pode propor soluções técnicas, implementar código e analisar alternativas.

O agente não deve definir sozinho regras de negócio importantes.

Quando houver mais de uma interpretação válida de um requisito, preservar a ambiguidade e solicitar uma definição no contexto da tarefa, em vez de incorporar uma decisão arbitrária ao código.

A prioridade é manter o sistema coerente com os requisitos definidos pelos responsáveis pelo projeto.

