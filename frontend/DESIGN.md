---
name: ERP Veterinário — design system
colors:
  ground: "#fafafa"
  surface: "#ffffff"
  line: "#e9e9ec"
  line-strong: "#dcdce1"
  ink: "#111114"
  ink-2: "#45454f"
  ink-3: "#5e5e6a"
  ink-4: "#6f6f7b"
  accent: "#145c46"
  accent-hover: "#0f4635"
  accent-soft: "#e9f1ed"
  state-progress: "#9a5b0b"
  state-cancelled: "#9c3529"
typography:
  family: "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica Neue, Arial"
  micro: "11px / 16px, 0.06em, 500"
  meta: "12px / 18px"
  body: "13px / 20px"
  lead: "15px / 22px"
  title: "18px / 26px, -0.01em"
  page: "22px / 30px, -0.02em, 600"
  numerals: "tabular (font-variant-numeric: tabular-nums)"
rounded:
  control: "6px"
  container: "8px"
  overlay: "12px"
spacing:
  unit: "4px"
  page-x: "32px"
  page-y: "28px"
  rail-collapsed: "64px"
  rail-expanded: "232px"
components:
  rail: "w-16 → w-232px no hover, border-r 1px line, item ativo bg accent-soft"
  button-primary: "h-9, rounded-md, bg accent, text branco, 13px/500"
  input: "h-9, rounded-md, border line-strong, foco border accent + ring 1px"
  table: "thead micro-label uppercase, linhas divide-y line, hover #f6f6f7"
  badge: "11px, rounded 4px, fundo tonal + texto de estado"
---

# Design System: ERP Veterinário

## Overview

**Creative North Star: "o trilho e a agenda"**

Duas coisas carregam a identidade: um trilho de ícones que só ganha voz quando o cursor chega
perto, e uma agenda lida como tabela de horários. O resto é silêncio: fundo quase branco,
hairlines de 1px, nenhuma sombra decorativa, nenhum card de número.

O produto é uma tela de trabalho (modo *Operate*). O veterinário está de pé, com o tutor ao
lado, e o sucesso é chegar ao prontuário do animal em segundos. Por isso a interface não compete
com o dado clínico: a cor aparece só onde carrega significado — seleção e estado de atendimento.

**Key Characteristics:**
- Superfícies brancas sobre um ground `#fafafa`, separadas por hairline `#e9e9ec`.
- Trilho de 64px que expande para 232px no hover, com os rótulos aparecendo em fade.
- Tinta `#111114` para o dado; três degraus de cinza sóbrios para hierarquia.
- Um único acento (verde profundo `#145c46`) em trabalho: item ativo, ação primária, foco.
- Cores semânticas exclusivas de estado: agendado, em atendimento, concluído, cancelado.
- Numerais tabulares em horários, códigos e contadores.

## Colors

A paleta é **Restrained**: neutros tintados + um acento. Nada de "cinza com um azul de categoria":
o acento é verde profundo, escolhido pelo cenário (clínica, luz ambiente, uso prolongado) e não
pela categoria.

- **Ground `#fafafa` / Surface `#ffffff`** — o chão e a mesa. Separação por hairline, nunca por sombra.
- **Ink `#111114`** — dado clínico e nome de animal. É o único texto que grita.
- **Ink-2 `#45454f`** — rótulos de controle e texto secundário (7,9:1 no surface).
- **Ink-3 `#5e5e6a`** — metadados de linha (6,1:1 no ground).
- **Ink-4 `#6f6f7b`** — micro-rótulos de tabela e horários (4,75:1 no ground, acima do piso de 4,5:1).
- **Accent `#145c46`** — seleção e ação. Sobre branco, 7,9:1. Soft `#e9f1ed` para o fundo do item ativo.
- **Estados** — em atendimento `#9a5b0b` em `#fdf3e3`; cancelado `#9c3529` em `#fbedeb`; concluído `#145c46` em `#e9f1ed`.

**A Regra do Acento em Trabalho.** O acento só aparece onde significa algo: o item ativo do
trilho, o botão primário, o anel de foco, o fio de seleção. Nenhum enfeite colorido.

## Typography

Família de sistema (workhorse de UI): a tela de trabalho não pede voz tipográfica própria, pede
ritmo. A escala é curta e o peso carrega a hierarquia, não o tamanho:

- `page` 22px/600 — título da tela (Hoje, Animais).
- `title` 18px/500 — título de modal.
- `lead` 15px/22 — nome de animal em destaque e vazio de estado.
- `body` 13px/20 — corpo, células de tabela, controles.
- `meta` 12px/18 — metadados de linha, legendas, subtítulo de página.
- `micro` 11px/0.06em uppercase 500 — cabeçalho de tabela e rótulo de seção.

**A Regra dos Numerais Tabulares.** Tudo que é tempo, código ou contagem usa `tabular-nums`;
colunas de horário não podem dançar quando o minuto muda.

## Layout

Trilho fixo à esquerda + conteúdo em `max-width: 1180px` com `px-8 py-7`. A agenda usa uma
coluna de horário fixa (44px) e o resto fluido; o painel lateral de "Últimas consultas" tem
300px fixos e sai de cena abaixo de `lg`. Nada de grid de cards: agrupamento por dia com
hairline entre grupos.

**A Regra do Trilho Silencioso.** O trilho nunca ocupa espaço de leitura: colapsado mostra ícone
e monograma; o rótulo só existe no hover, e o conteúdo acompanha a expansão com a mesma curva.

## Elevation & Depth

Uma só elevação no sistema: `0 1px 2px rgba(17,17,20,0.04), 0 12px 32px -12px rgba(17,17,20,0.18)`,
exclusiva de modal. Fora dela, profundidade é hairline.

## Shapes

Cantos de 6px em controles, 8px em containers, 12px em overlay. Nenhum pill, nenhum círculo
decorativo, nenhum card aninhado.

## Components

- **Rail** — 64px → 232px no hover (`160ms`, `cubic-bezier(0.22,1,0.36,1)`); item ativo com
  fundo `accent-soft`, ícone `lucide` 20px peso 1,9 e rótulo 500.
- **Agenda row** — `time` tabular em ink-3, nome do animal + código, tutor + motivo em meta,
  badge de estado à direita; hover `#f6f6f7`; agrupada por dia (Hoje / Amanhã / dia da semana).
- **Table** — cabeçalho micro-label, linhas `divide-y` em `line`, sem zebra, ações em texto.
- **Button** — primário verde sólido, secundário branco com hairline, perigo em contorno
  (`#9c3529`), ghost para ações de linha.
- **Input/Select** — altura 36px, borda `line-strong`, foco com borda de acento e anel de 1px.
- **Badge** — 11px, raio 4px, fundo tonal por estado; nunca texto em inglês (enum traduzido).
- **Modal** — overlay `rgba(17,17,20,0.28)` sem blur, painel com hairline e a única sombra do sistema.

## Motion

Uma curva só (`cubic-bezier(0.22,1,0.36,1)`, 160–200ms) para largura do trilho, margem do
conteúdo e fade dos rótulos. Nenhuma animação de entrada repetida por seção; nada que esconda
conteúdo por timing.

## Browser surfaces

Seleção de texto em `accent-soft` com tinta `#111114`; caret verde; `:focus-visible` com outline
de 2px `#9cc4b3` e offset 2px; scrollbar fina `#dcdce1` com hover `#a3a3ad`.

## Do's and Don'ts

- **Do** tratar o animal como protagonista da linha; **don't** transformar a home em painel de indicadores.
- **Do** usar hairline para separar; **don't** empilhar cards com sombra.
- **Do** traduzir estado de domínio para o português na interface; **don't** expor `SCHEDULED` na tela.
- **Do** manter o trilho colapsado por padrão; **don't** abrir a navegação permanentemente.
- **Do** manter metadados acima de 4,5:1; **don't** clarear cinza "para ficar elegante".
