---

name: veterinary-domain
description: Orienta a análise e implementação das entidades, relacionamentos e regras do domínio veterinário em um SaaS multi-tenant.
--------------------------------------------------------------------------------------------------------------------------------------

# Veterinary Domain

Use esta Skill quando uma tarefa envolver regras ou entidades específicas do domínio veterinário.

## Princípios

Não inventar regras clínicas ou administrativas.

Não transformar uma suposição em regra de negócio.

Diferenciar entidades e responsabilidades claramente.

Animal e tutor são entidades distintas.

Um tutor pode possuir múltiplos animais.

## Multi-tenancy

O sistema é um SaaS multi-tenant com PostgreSQL compartilhado e isolamento por tenant_id.

Cada estabelecimento veterinário constitui um tenant.

Antes de definir uma entidade do domínio, determine se seus dados são:

* globais ao sistema;
* pertencentes a um tenant;
* pertencentes a um usuário dentro de um tenant;
* relacionados a outro recurso que determina seu tenant.

Dados específicos de um estabelecimento devem permanecer isolados dos demais estabelecimentos.

O isolamento de tenant deve ser aplicado no backend e refletido na modelagem do banco.

Consultar `docs/domain-model.md` para o modelo completo.

## Conceitos

Os conceitos abaixo estão definidos e especificados:

* Tutor (cadastro por clínica com TutorIdentity global)
* Animal (entidade global com TenantAnimal)
* Agendamento
* Atendimento
* Prontuário
* Procedimento
* Exame
* Vacinação
* Prescrição
* Produto
* Estoque
* Venda
* Financeiro

Consultar `docs/domain-model.md` e `docs/business-rules.md` para detalhes de Tutor e Animal.

## Modelagem

Antes de criar ou modificar uma entidade:

1. verificar se já existe uma entidade equivalente;
2. identificar relacionamentos;
3. verificar escopo do tenant;
4. verificar histórico;
5. verificar impacto no banco;
6. verificar impacto na API;
7. verificar impacto na interface.

## Histórico

Quando uma informação possuir relevância histórica, evitar simplesmente substituir ou excluir o valor anterior.

Utilizar mecanismos de histórico quando isso estiver previsto nos requisitos.

## Regras indefinidas

Considerar explicitamente como indefinidas, até especificação:

* protocolos médicos;
* doses;
* frequência de vacinação;
* preços;
* descontos;
* impostos;
* regras de estoque;
* regras de cancelamento;
* regras financeiras.

Não implementar essas regras por inferência.

## Relações definidas

As seguintes relações já foram definidas pela especificação funcional:

* User ↔ Tenant: N:M via UserTenant (um único vínculo por combinação)
* User ↔ Veterinarian: 1:1 (Veterinarian pode existir sem User)
* Veterinarian ↔ Tenant: N:M via TenantVeterinarian
* Veterinarian ↔ Specialty: N:M via VeterinarianSpecialty
* TutorIdentity ↔ Tutor: 1:N (TutorIdentity global, Tutor tenant-scoped)
* Animal ↔ Tenant: N:M via TenantAnimal
* Animal ↔ Tutor: N:M via AnimalTutor (tenant-scoped)
* Animal ↔ Species: N:1
* Animal ↔ Breed: N:1
* Species ↔ Breed: 1:N
* Animal ↔ Allergy: N:M via AnimalAllergy
* Animal ↔ Medication: N:M via AnimalMedication
* Animal ↔ Vaccine: N:M via AnimalVaccination
* Animal ↔ WeightRecord: 1:N

## Relações ainda não definidas

* Animal ↔ Veterinário
* Atendimento ↔ Animal
* Atendimento ↔ Veterinário
* Agendamento ↔ Atendimento
* Prontuário ↔ Atendimento

Essas relações devem ser definidas antes da modelagem definitiva do banco de dados do domínio.

## Objetivo

Manter o domínio veterinário explícito, coerente, auditável e compatível com o modelo SaaS multi-tenant, sem transformar suposições em regras de negócio.
