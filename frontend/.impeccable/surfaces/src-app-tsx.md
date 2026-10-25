---
version: 1
slug: "src-app-tsx"
primary_target: "src/App.tsx"
related_targets: []
---

# Surface: shell autenticado + "Hoje" (agenda do dia)

## Scope

Shell autenticado do ERP veterinário e a página inicial do veterinário, mais o padrão de
lista/detalhe que as outras telas (tutores, animais, prontuário, agendamentos) herdam.
Modo do visitante: **Operate** — a pessoa veio executar uma tarefa.

## Audiência, trabalho e restrições

Veterinário clínico, entre um atendimento e outro, com o tutor ao lado. Ação principal: abrir o
animal que está na frente e registrar o atendimento. Restrições: pt-BR apenas; dados fictícios;
roda local; backend REST já define todas as regras clínicas.

## Direção escolhida

Brief fixado pelo responsável do produto (não foi sorteado): clean e minimalista, referência
Instagram para desktop — trilho de ícones à esquerda que abre no hover. O trilho é o momento
memorável; a agenda do dia entra no ritmo de uma tabela de horários.

## Direction contract

**THESIS:** o trilho é o produto — uma coluna de ícones monocromática que ganha voz no hover,
sobre um fundo quase branco; recusa explicitamente o arranjo "painel de cards com números".

**OWN-WORLD:** fundo `#FAFAFA` com superfícies brancas e separadores de 1px `#EAEAEC`; tinta
`#111` para texto primário, `#6B6B75` secundário; acento único em trabalho (seleção/estado ativo);
cores semânticas só onde significam algo — agendado, em atendimento, concluído, cancelado.
Tipografia de sistema com numerais tabulares para dados. Zero gradiente, zero sombra decorativa:
uma hairline carrega a separação, uma elevação suave só em modal.

**STORY:** ao entrar, o veterinário entende "este é o meu dia" e vê o próximo paciente sem
procurar; o trilho ensina onde ficam tutores, animais e agenda sem ocupar espaço.

**FIRST VIEWPORT:** coluna esquerda de 64px com monograma da clínica no topo, quatro ícones e
avatar no pé; ao passar o mouse, expande para 232px revelando os rótulos. Ao lado, a agenda do
dia: cabeçalho enxuto com a data e o total de atendimentos, depois uma lista com coluna de
horário à esquerda e, em cada linha, animal + tutor, motivo e estado. A ação primária
("Novo agendamento") fica no cabeçalho, alinhada à direita, discreta.

**FORM:** trilho de ícones com expansão no hover, posição 1 da lista de estruturas; a agenda em
ritmo de tabela de horários é a segunda. seed: none (unavailable)

**FINISH:** unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Decisões em aberto

- Nome e monograma da clínica: hoje o shell mostra "VetClinic"/"VC" fixos; deveriam vir do tenant
  escolhido no login (o login já devolve `tenants[].name`). Precisa ser ligado no estado de auth.
- Densidade da agenda para telas de 1366px (notebook de apresentação) versus 1440+.
