import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { cn } from '../../lib/utils';
import { groupByHour, hourLabel } from '../../lib/agenda';
import { AppointmentCard } from './AppointmentCard';
import type { Animal, Appointment } from '../../types';

const COLUMN_WIDTH = 300;
const DRAG_THRESHOLD = 5;
const MIN_THUMB_WIDTH = 40;

interface AgendaBoardProps {
  hours: number[];
  appointments: Appointment[];
  outside: Appointment[];
  animalById: Map<string, Animal>;
  currentHour: number | null;
  showVet: boolean;
  onOpen: (appointment: Appointment) => void;
}

interface ScrollMetrics {
  scrollLeft: number;
  clientWidth: number;
  scrollWidth: number;
  trackWidth: number;
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
  const trackRef = useRef<HTMLDivElement>(null);
  const suppressClickRef = useRef(false);
  const [dragging, setDragging] = useState(false);
  const [metrics, setMetrics] = useState<ScrollMetrics>({
    scrollLeft: 0,
    clientWidth: 0,
    scrollWidth: 0,
    trackWidth: 0,
  });

  const updateMetrics = useCallback(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    setMetrics({
      scrollLeft: scroller.scrollLeft,
      clientWidth: scroller.clientWidth,
      scrollWidth: scroller.scrollWidth,
      trackWidth: trackRef.current?.clientWidth ?? 0,
    });
  }, []);

  useEffect(() => {
    updateMetrics();
    const scroller = scrollerRef.current;
    const track = trackRef.current;
    if (!scroller) return;
    const onScroll = () => updateMetrics();
    scroller.addEventListener('scroll', onScroll, { passive: true });
    const observer = new ResizeObserver(updateMetrics);
    observer.observe(scroller);
    if (track) observer.observe(track);
    return () => {
      scroller.removeEventListener('scroll', onScroll);
      observer.disconnect();
    };
  }, [updateMetrics]);
  // Arrastar com o mouse (ou caneta) rola o quadro na horizontal, como no
  // touch. Abaixo do limiar de 5px continua sendo clique no card.
  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerType === 'touch') return; // touch já tem pan nativo
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    const container = scrollerRef.current;
    if (!container) return;

    const startX = event.clientX;
    const startScroll = container.scrollLeft;
    const pointerId = event.pointerId;
    let moved = false;

    const onMove = (ev: PointerEvent) => {
      if (ev.pointerId !== pointerId) return;
      const dx = ev.clientX - startX;
      if (!moved && Math.abs(dx) < DRAG_THRESHOLD) return;
      if (!moved) {
        moved = true;
        setDragging(true);
      }
      container.scrollLeft = startScroll - dx;
      updateMetrics();
      ev.preventDefault();
    };

    const onUp = (ev: PointerEvent) => {
      if (ev.pointerId !== pointerId) return;
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
      setDragging(false);
      if (moved) {
        suppressClickRef.current = true;
        window.setTimeout(() => {
          suppressClickRef.current = false;
        }, 0);
      }
    };

    window.addEventListener('pointermove', onMove, { passive: false });
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
  };

  // Abre o quadro na coluna que importa: a hora atual (se for hoje) ou o
  // primeiro horário ocupado do dia — evita começar em colunas vazias.
  useEffect(() => {
    const container = scrollerRef.current;
    if (!container) return;
    const firstOccupied = hours.find((hour) => (byHour.get(hour)?.length ?? 0) > 0);
    const target = currentHour !== null && hours.includes(currentHour) ? currentHour : firstOccupied;
    const index =
      target !== undefined ? Math.max(0, hours.indexOf(target) - 1) : outside.length > 0 ? hours.length : 0;
    container.scrollLeft = index * COLUMN_WIDTH;
    updateMetrics();
  }, [hours, appointments, outside, currentHour, updateMetrics]);

  const hasOverflow = metrics.scrollWidth > metrics.clientWidth + 1;
  const maxScroll = Math.max(0, metrics.scrollWidth - metrics.clientWidth);
  const thumbWidth = Math.max(
    MIN_THUMB_WIDTH,
    Math.min(metrics.trackWidth, (metrics.clientWidth / Math.max(1, metrics.scrollWidth)) * metrics.trackWidth)
  );
  const maxThumbTravel = Math.max(0, metrics.trackWidth - thumbWidth);
  const thumbLeft = maxScroll > 0 ? (metrics.scrollLeft / maxScroll) * maxThumbTravel : 0;

  // A trilha só existe depois que há overflow; mede de novo quando ela aparece.
  useEffect(() => {
    if (hasOverflow) updateMetrics();
  }, [hasOverflow, updateMetrics]);

  const handleThumbPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    const scroller = scrollerRef.current;
    if (!scroller || maxThumbTravel <= 0) return;
    const startX = event.clientX;
    const startScroll = scroller.scrollLeft;
    const pointerId = event.pointerId;

    const onMove = (ev: PointerEvent) => {
      if (ev.pointerId !== pointerId) return;
      scroller.scrollLeft = startScroll + ((ev.clientX - startX) / maxThumbTravel) * maxScroll;
      updateMetrics();
      ev.preventDefault();
    };
    const onUp = (ev: PointerEvent) => {
      if (ev.pointerId !== pointerId) return;
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };

    window.addEventListener('pointermove', onMove, { passive: false });
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
  };

  const handleTrackPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget) return; // clique no thumb é tratado lá
    const scroller = scrollerRef.current;
    if (!scroller || maxScroll <= 0) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const ratio = (event.clientX - rect.left) / rect.width;
    scroller.scrollLeft = Math.min(
      maxScroll,
      Math.max(0, ratio * metrics.scrollWidth - scroller.clientWidth / 2)
    );
    updateMetrics();
  };

  return (
    <div className="-mx-2 flex-1 flex flex-col min-h-0 rounded-lg border border-line bg-surface overflow-hidden">
      <div
        ref={scrollerRef}
        onPointerDown={handlePointerDown}
        onClickCapture={(event) => {
          if (suppressClickRef.current) {
            event.preventDefault();
            event.stopPropagation();
            suppressClickRef.current = false;
          }
        }}
        className={cn(
          'flex-1 min-h-0 overflow-auto hide-scrollbar',
          dragging ? 'cursor-grabbing select-none' : 'cursor-grab'
        )}
      >
        <div className="flex min-w-max items-stretch h-full px-2">
          {hours.map((hour, index) => {
            const items = byHour.get(hour) ?? [];
            const isNow = currentHour === hour;
            return (
              <section
                key={hour}
                aria-label={`Horário ${hourLabel(hour)}`}
                className={cn('w-[300px] shrink-0 px-2 h-full', index > 0 && 'border-l border-line')}
              >
                <header
                  className={cn(
                    'h-9 flex items-center justify-between gap-2 px-1 -mx-1 rounded-md',
                    isNow && 'bg-accent-soft px-2'
                  )}
                >
                  <span className={cn('num text-lead font-medium', isNow ? 'text-accent' : 'text-ink-2')}>
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
            <section
              aria-label="Fora do horário"
              className="w-[300px] shrink-0 px-2 border-l border-line h-full"
            >
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

      {hasOverflow && (
        <div
          ref={trackRef}
          onPointerDown={handleTrackPointerDown}
          className="mx-3 my-2 h-4 rounded-full bg-[#efeff2] cursor-pointer"
          aria-hidden
        >
          <div
            onPointerDown={handleThumbPointerDown}
            className="h-4 rounded-full bg-[#c4c4cc] hover:bg-[#9b9ba6] cursor-grab active:cursor-grabbing touch-none"
            style={{ width: thumbWidth, marginLeft: thumbLeft }}
          />
        </div>
      )}
    </div>
  );
}
