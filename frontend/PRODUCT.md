# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Veterinário clínico de uma clínica de pequenos animais. Trabalha em pé, entre um atendimento e
outro, no consultório ou no balcão, num notebook. O trabalho dele é abrir o animal que está na
sua frente, ler o histórico e registrar o atendimento — não administrar a clínica.

## Product Purpose

ERP veterinário SaaS multi-tenant: cada clínica é um tenant com dados isolados. Reúne cadastro
de tutores e animais (identidades globais compartilhadas entre clínicas), prontuário por clínica
(consultas, diagnósticos, peso, vacinação, alergia, medicação) e agendamentos. Existe para que o
histórico clínico de um animal acompanhe o animal entre clínicas sem vazar dado de uma clínica
para outra. Sucesso = o veterinário encontra o animal e registra o atendimento em poucos
segundos, e nenhuma clínica vê dado de outra.

## Positioning

Animal e tutor têm identidade global; o prontuário é privado por clínica. Um mesmo animal
atendido em duas clínicas tem um histórico clínico independente em cada uma, compartilhando
apenas os dados de identificação. Um concorrente de clínica única não copia isso sem refazer o
modelo de dados.

## Operating Context

- Atendimento presencial com o tutor ao lado; digitação rápida, pausas constantes.
- Agenda do dia organiza o trabalho: o que está marcado, o que chegou, o que terminou.
- Terminologia do domínio em português: tutor, animal, prontuário, consulta, diagnóstico,
  vacinação, agendamento, clínica/estabelecimento.
- A demonstração roda local, com backend e banco na mesma máquina.

## Capabilities and Constraints

Implementado no backend e exposto nesta interface: autenticação (registro, login, seleção de
clínica), tutores, animais com vínculo de clínica e tutores, consultas com diagnósticos,
registros clínicos (peso, vacinação, alergia, medicação) e agendamentos. Catálogos de espécie,
raça, vacina, alergia, medicação e especialidade são somente leitura nesta versão.

Fora do escopo desta interface: convites, gestão de papéis, criação de catálogos, dados do
estabelecimento, perfil do usuário, prescrição, estoque e faturamento. Nenhuma regra clínica é
inventada na interface — ela exibe e envia o que o backend define.

## Brand Commitments

- Interface **clean e minimalista**, referência declarada: Instagram para desktop.
- Sidebar fixa à esquerda, colapsada em ícones, que **expande no hover** revelando os nomes das
  opções clicáveis.
- Idioma **pt-BR apenas**, sem i18n.
- Dados de demonstração são fictícios; nenhum dado real de cliente.

## Evidence on Hand

- `frontend/scripts/demo-data.mjs` popula uma clínica de demonstração via API (4 tutores, 5
  animais, pesos, vacinas, alergia, medicação, 3 agendamentos, 2 consultas com diagnóstico).
- Catálogos reais vêm do seed do backend (`prisma/seed.ts`): espécies, raças, vacinas,
  medicamentos, alergias, especialidades, papéis e permissões.
- Não há depoimentos, clientes, métricas ou preços reais — nada disso deve ser fabricado.

## Product Principles

1. O animal na frente do veterinário vem antes de qualquer painel: chegar ao prontuário é o
   caminho mais curto da tela.
2. A clínica é o contexto, não a tela: o tenant aparece no topo, sem virar burocracia.
3. Histórico se lê de cima para baixo, do mais recente para o mais antigo.
4. Nada de dado clínico inventado pela interface; ela mostra o que foi registrado e por quem.
5. Silêncio visual: a interface não compete com o animal nem com o tutor.

## Accessibility & Inclusion

Nenhum requisito formal definido pelo responsável do projeto. Manter contraste de texto legível
no uso real (consultório, luz ambiente variável) e navegação por teclado nos formulários.
