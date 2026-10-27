import { useState } from 'react';
import { cn } from '../../lib/utils';
import { timeLabel } from '../../lib/agenda';
import type { Animal, Appointment, AppointmentStatus } from '../../types';

const STATUS_LABEL: Record<AppointmentStatus, string> = {
  SCHEDULED: 'Agendado',
  IN_PROGRESS: 'Em atendimento',
  COMPLETED: 'Concluído',
  CANCELLED: 'Cancelado',
};

const STATUS_DOT: Record<AppointmentStatus, string> = {
  SCHEDULED: 'bg-state-scheduled',
  IN_PROGRESS: 'bg-state-progress',
  COMPLETED: 'bg-state-done',
  CANCELLED: 'bg-state-cancelled',
};

function monogram(name: string | null | undefined, code: string): string {
  const source = (name || code || '').trim();
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '—';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function AnimalAvatar({
  animal,
  name,
  code,
  size = 36,
}: {
  animal?: Animal;
  name: string | null | undefined;
  code: string;
  size?: number;
}) {
  const [failed, setFailed] = useState(false);
  const photoUrl = animal?.photoUrl;

  if (photoUrl && !failed) {
    return (
      <img
        src={photoUrl}
        alt={name ?? code}
        width={size}
        height={size}
        onError={() => setFailed(true)}
        className="shrink-0 rounded-md object-cover bg-[#f2f2f4]"
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <span
      aria-hidden
      className="shrink-0 rounded-md bg-[#f2f2f4] text-ink-2 grid place-items-center font-semibold"
      style={{ width: size, height: size, fontSize: Math.round(size * 0.32) }}
    >
      {monogram(name, code)}
    </span>
  );
}

interface AppointmentCardProps {
  appointment: Appointment;
  animal?: Animal;
  showVet?: boolean;
  onOpen: (appointment: Appointment) => void;
}

export function AppointmentCard({ appointment, animal, showVet = false, onOpen }: AppointmentCardProps) {
  const name = appointment.animal.name ?? appointment.animal.internalCode;
  const tutorName = appointment.tutor?.tutorIdentity?.name;
  const vetName = appointment.veterinarian?.veterinarian?.name;
  const description = appointment.reason || tutorName || 'Sem motivo informado';
  const thirdLine = (showVet ? vetName : tutorName) ?? appointment.animal.internalCode;
  const cancelled = appointment.status === 'CANCELLED';

  return (
    <button
      type="button"
      onClick={() => onOpen(appointment)}
      aria-label={`${timeLabel(appointment.scheduledAt)} — ${name}, ${STATUS_LABEL[appointment.status]}`}
      className={cn(
        'w-full text-left rounded-md border bg-surface px-3 py-2.5',
        'transition-colors duration-150 hover:bg-[#fbfbfc] hover:border-line-strong',
        appointment.status === 'IN_PROGRESS' ? 'border-[#e6d3b8]' : 'border-line',
        cancelled && 'opacity-60'
      )}
    >
      <div className="flex items-start gap-2.5">
        <AnimalAvatar animal={animal} name={appointment.animal.name} code={appointment.animal.internalCode} />
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <span className={cn('text-body font-medium text-ink truncate', cancelled && 'line-through')}>
              {name}
            </span>
            <span className="num text-micro text-ink-4 shrink-0">
              {timeLabel(appointment.scheduledAt)}
            </span>
          </div>
          <p className="text-meta text-ink-3 line-clamp-2">{description}</p>
          <p className="text-micro text-ink-4 truncate">{thirdLine}</p>
        </div>
      </div>
      <div className="mt-2 flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 whitespace-nowrap">
          <span aria-hidden className={cn('h-1.5 w-1.5 rounded-full', STATUS_DOT[appointment.status])} />
          <span className="text-micro text-ink-3">{STATUS_LABEL[appointment.status]}</span>
        </span>
        <span className="num text-micro text-ink-4 whitespace-nowrap">{appointment.animal.internalCode}</span>
      </div>
    </button>
  );
}
