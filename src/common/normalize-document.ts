/**
 * Normalização de CPF/CNPJ — decisão de domínio registrada.
 *
 * Regra: remover todos os caracteres não numéricos, armazenando apenas
 * dígitos. A validação de dígito verificador e a validação de comprimento
 * específico por tipo NÃO fazem parte desta regra
 * (docs/business-rules.md, seção "Tutor — Modelo").
 *
 * Função deliberadamente **não coercitiva**: entrada que não seja string
 * devolve o valor original intacto. Assim, `documentNumber` enviado como
 * número JSON continua sendo rejeitado por `@IsString()` com 400, em vez
 * de ser convertido em string e aceito silenciosamente.
 *
 * Usada em dois pontos, que devem permanecer equivalentes:
 * - `CreateTutorDto.documentNumber` via `@Transform` — normaliza antes da
 *   validação, para que `@MaxLength(14)` avalie o valor já normalizado.
 * - `TutorService.create` — normalização defensiva para qualquer chamada
 *   que não passe pelo HTTP.
 */
export function normalizeDocument(value: string): string;
export function normalizeDocument(value: unknown): unknown;
export function normalizeDocument(value: unknown): unknown {
  if (typeof value !== 'string') {
    return value;
  }

  return value.replace(/\D/g, '');
}
