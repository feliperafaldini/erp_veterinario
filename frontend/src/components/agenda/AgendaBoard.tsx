import { useEffect, useRef } from 'react';
import { cn } from '../../lib/utils';
import { groupByHour, hourLabel } from '../../lib/agenda';
import { AppointmentCard } from './AppointmentCard';
import type { Animal, Appointment } from '../../types';

const COLUMN_WIDTH = 212;

interface AgendaBoardProps {
  hours: number[];
  appointments: Appointment[];
  outside: Appointment[];
  animalById: Map<string, Animal>;
  currentHour: number | null;
  showVet: boolean;
  onOpen: (appointment: Appointment) => void;
}

export function AgendaBoard({
  hours,
  appointments,
  outside,
  animalById,
  currentHour,
  showVet,
  onOpen,
}: AgendaBoardProps) {
  const byHour = groupByHour(appointments);
  const scrollerRef = useRef<HTMLDivElement>(null);

  // Abre o quadro na coluna que importa: a hora atual (se for hoje) ou o
  // primeiro horário ocupado do dia — evita começar em colunas vazias.
  useEffect(() => {
    const container = scrollerRef.current;
    if (!container) return;
    const firstOccupied = hours.find((hour) => (byHour.get(hour)?.length ?? 0) > 0);
    const target = currentHour !== null && hours.includes(currentHour) ? currentHour : firstOccupied;
    const index = target !== undefined ? Math.max(0, hours.indexOf(target) - 1) : outside.length > 0 ? hours.length : 0;
    if (index > 0) {
      container.scrollLeft = index * COLUMN_WIDTH;
    }
  }, [hours, appointments, outside, currentHour]);

  return (
    <div ref={scrollerRef} className="-mx-2 overflow-x-auto pb-3">
      <div className="flex min-w-max items-start px-2">
        {hours.map((hour, index) => {
          const items = byHour.get(hour) ?? [];
          const isNow = currentHour === hour;
          return (
            <section
              key={hour}
              aria-label={`Horário ${hourLabel(hour)}`}
              className={cn('w-[212px] shrink-0 px-2', index > 0 && 'border-l border-line')}
            >
              <header
                className={cn(
                  'h-9 flex items-center justify-between gap-2 px-1 -mx-1 rounded-md',
                  isNow && 'bg-accent-soft px-2'
                )}
              >
                <span className={cn('num text-meta font-medium', isNow ? 'text-accent' : 'text-ink-2')}>
                  {hourLabel(hour)}
                </span>
                <span className="num text-micro text-ink-4">{items.length > 0 ? items.length : ''}</span>
              </header>
              <div className="mt-1.5 space-y-2">
                {items.map((appointment) => (
                  <AppointmentCard
                    key={appointment.id}
                    appointment={appointment}
                    animal={animalById.get(appointment.animal.id)}
                    showVet={showVet}
                    onOpen={onOpen}
                  />
                ))}
              </div>
            </section>
          );
        })}

        {outside.length > 0 && (
          <section aria-label="Fora do horário" className="w-[212px] shrink-0 px-2 border-l border-line">
            <header className="h-9 flex items-center justify-between gap-2 px-1">
              <span className="text-micro uppercase tracking-[0.06em] text-ink-4 font-medium">
                Fora do horário
              </span>
              <span className="num text-micro text-ink-4">{outside.length}</span>
            </header>
            <div className="mt-1.5 space-y-2">
              {outside.map((appointment) => (
                <AppointmentCard
                  key={appointment.id}
                  appointment={appointment}
                  animal={animalById.get(appointment.animal.id)}
                  showVet={showVet}
                  onOpen={onOpen}
                />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
