export function primaryRole(roles: string[]): string | null {
  if (roles.includes('ADMIN')) return 'ADMIN';
  if (roles.includes('VETERINARIAN')) return 'VETERINARIAN';
  if (roles.includes('RECEPTIONIST')) return 'RECEPTIONIST';
  return roles[0] ?? null;
}

export const ROLE_LABEL: Record<string, string> = {
  ADMIN: 'Administrador',
  VETERINARIAN: 'Veterinário',
  RECEPTIONIST: 'Recepção',
};

/** Página inicial de cada papel. */
export function homePath(_roles: string[]): string {
  return '/inicio';
}
