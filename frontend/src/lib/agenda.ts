// Helpers puros da agenda do dia (kanban por horário).
// Datas chegam em ISO/UTC da API; tudo aqui trabalha em hora local.

export const SLOT_START_HOUR = 7;
export const SLOT_END_HOUR = 19;

export const WEEKDAYS = [
  'domingo',
  'segunda-feira',
  'terça-feira',
  'quarta-feira',
  'quinta-feira',
  'sexta-feira',
  'sábado',
];

export const MONTHS = [
  'janeiro',
  'fevereiro',
  'março',
  'abril',
  'maio',
  'junho',
  'julho',
  'agosto',
  'setembro',
  'outubro',
  'novembro',
  'dezembro',
];

export function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function addDays(date: Date, amount: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/** "segunda-feira, 26 de outubro" */
export function dayTitle(date: Date): string {
  return `${WEEKDAYS[date.getDay()]}, ${date.getDate()} de ${MONTHS[date.getMonth()]}`;
}

/** "07:00" */
export function timeLabel(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/** "07:00" para um slot inteiro. */
export function hourLabel(hour: number): string {
  return `${String(hour).padStart(2, '0')}:00`;
}

/**
 * Horas do quadro: 7h–19h. Com agendamentos no horário comercial, aperta o
 * range para o primeiro..último horário ocupado (menos colunas vazias).
 */
export function hourSlots(items: { scheduledAt: string }[] = []): number[] {
  let first = SLOT_START_HOUR;
  let last = SLOT_END_HOUR;
  const occupied = items
    .map((item) => new Date(item.scheduledAt).getHours())
    .filter((hour) => hour >= SLOT_START_HOUR && hour <= SLOT_END_HOUR);
  if (occupied.length > 0) {
    first = Math.min(...occupied);
    last = Math.max(...occupied);
  }
  const slots: number[] = [];
  for (let hour = first; hour <= last; hour += 1) slots.push(hour);
  return slots;
}

/** Agendamento fora da faixa do quadro (madrugada / noite). */
export function isOutsideHours(iso: string): boolean {
  const hour = new Date(iso).getHours();
  return hour < SLOT_START_HOUR || hour > SLOT_END_HOUR;
}

/** Agrupa os agendamentos do dia por hora cheia local. */
export function groupByHour<T extends { scheduledAt: string }>(items: T[]): Map<number, T[]> {
  const map = new Map<number, T[]>();
  for (const item of items) {
    const hour = new Date(item.scheduledAt).getHours();
    const bucket = map.get(hour) ?? [];
    bucket.push(item);
    map.set(hour, bucket);
  }
  for (const bucket of map.values()) {
    bucket.sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());
  }
  return map;
}

const SEX_LABEL: Record<string, string> = {
  MALE: 'Macho',
  FEMALE: 'Fêmea',
  UNKNOWN: 'Não informado',
};

export function sexLabel(sex: string | null | undefined): string {
  return (sex && SEX_LABEL[sex]) || '—';
}

/** Idade a partir da data de nascimento; cai para o texto aproximado. */
export function ageLabel(dateOfBirth: string | null | undefined, approximateAge?: string | null): string {
  if (dateOfBirth) {
    const born = new Date(dateOfBirth);
    const now = new Date();
    let months = (now.getFullYear() - born.getFullYear()) * 12 + (now.getMonth() - born.getMonth());
    if (now.getDate() < born.getDate()) months -= 1;
    if (months < 0) return '—';
    const years = Math.floor(months / 12);
    const rest = months % 12;
    if (years === 0) return `${months} ${months === 1 ? 'mês' : 'meses'}`;
    if (rest === 0) return `${years} ${years === 1 ? 'ano' : 'anos'}`;
    return `${years}a ${rest}m`;
  }
  return approximateAge || '—';
}
