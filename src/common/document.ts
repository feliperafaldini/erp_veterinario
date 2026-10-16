/**
 * CPF/CNPJ são armazenados normalizados: apenas dígitos, sem máscara
 * (docs/business-rules.md, "Tutor — Modelo").
 *
 * A normalização precisa acontecer antes da validação e da consulta de
 * unicidade. Sem isso, "123.456.789-01" e "12345678901" são documentos
 * diferentes para o banco e o mesmo documento entra duas vezes, quebrando a
 * unicidade global.
 */
export function normalizeDocument(document: string): string {
  return document.replace(/\D/g, '');
}
