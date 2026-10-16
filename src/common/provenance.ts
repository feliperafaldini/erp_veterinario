/**
 * Remove a proveniência (tenant e usuário que registraram) dos registros que
 * pertencem a OUTRO tenant, antes de devolver o histórico compartilhado do
 * Animal. Os campos continuam persistidos para rastreabilidade; eles apenas
 * não são expostos a outras clínicas.
 */
export function hideForeignProvenance<T extends Record<string, unknown>>(
  records: T[],
  tenantId: string,
  tenantKey: string,
  userKey: string,
): T[] {
  return records.map((record) => {
    if (record[tenantKey] === tenantId) {
      return record;
    }

    const copy = { ...record } as Record<string, unknown>;
    delete copy[tenantKey];
    delete copy[userKey];

    return copy as T;
  });
}
