---

name: testing
description: Orienta testes unitários, testes de API e testes end-to-end do ERP veterinário.
--------------------------------------------------------------------------------------------

# Testing

## Ferramentas

* Vitest
* Supertest
* Playwright

## Testes unitários

Utilizar Vitest para testar:

* regras de negócio;
* funções;
* services;
* utilitários;
* casos de erro.

Priorizar comportamento observável.

## Testes de API

Utilizar Supertest quando necessário para verificar:

* endpoints;
* autenticação;
* autorização;
* validação;
* respostas;
* integração entre módulos.

## Testes end-to-end

Utilizar Playwright para fluxos completos relevantes.

Exemplo:

login
→ acessar módulo
→ preencher formulário
→ enviar
→ verificar resultado

## Regras

Toda regra de negócio nova ou modificada deve receber testes apropriados.

Testar casos de sucesso e casos de falha.

Não testar somente implementação interna.

Evitar testes excessivamente acoplados à estrutura interna do código.

## Conclusão

Uma funcionalidade só deve ser considerada validada depois que os testes e verificações apropriados forem executados.
