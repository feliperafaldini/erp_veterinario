---

name: project-context
description: Analisa o contexto, arquitetura, stack e organização do ERP veterinário antes de implementar alterações.
---------------------------------------------------------------------------------------------------------------------

# Project Context

Use esta Skill antes de alterações que possam afetar arquitetura ou múltiplas partes do projeto.

## Procedimento

1. Inspecione a estrutura do projeto.
2. Identifique a stack real através dos arquivos de configuração.
3. Leia os arquivos relacionados à tarefa.
4. Identifique padrões já existentes.
5. Verifique dependências entre os módulos envolvidos.
6. Determine o menor conjunto de alterações necessário.

## Regras

Não presumir que a estrutura do projeto ainda corresponde aos exemplos documentados.

O código existente é a fonte de verdade para detalhes de implementação já estabelecidos.

Não substituir uma arquitetura existente apenas porque outra abordagem parece mais conveniente.

Não modificar arquivos não relacionados à tarefa.

Quando houver conflito entre documentação antiga e implementação atual, sinalizar o conflito antes de fazer uma mudança estrutural.

## Objetivo

Preservar consistência arquitetural e impedir que novas funcionalidades sejam implementadas de maneira isolada do restante do sistema.
