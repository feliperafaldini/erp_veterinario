---

name: frontend
description: Orienta o desenvolvimento do frontend React + TypeScript do ERP veterinário.
-----------------------------------------------------------------------------------------

# Frontend

## Stack

* React
* TypeScript
* Vite
* Tailwind CSS
* shadcn/ui

## Desenvolvimento

Antes de criar uma tela ou componente:

1. verificar componentes existentes;
2. verificar padrões de layout;
3. verificar sistema de rotas;
4. verificar padrões de formulários;
5. verificar como a API é consumida atualmente.

Reutilizar componentes existentes quando apropriado.

Não criar componentes equivalentes com nomes diferentes.

## Responsabilidades

O frontend deve ser responsável principalmente por:

* apresentação;
* interação;
* estado visual;
* formulários;
* validação de interface;
* comunicação com a API.

O frontend não deve ser a autoridade final para regras de negócio ou autorização.

## Formulários

Formulários devem possuir:

* validação;
* feedback visual;
* estado de carregamento;
* tratamento de erro;
* feedback de sucesso quando apropriado.

## API

Não acessar diretamente o banco.

Toda comunicação com dados persistidos deve ocorrer através do backend.

## Interface

Priorizar consistência visual.

Utilizar componentes do projeto antes de criar novos.

Interfaces administrativas devem priorizar clareza e produtividade sobre efeitos visuais desnecessários.

Manter acessibilidade e responsividade conforme o contexto da aplicação.
