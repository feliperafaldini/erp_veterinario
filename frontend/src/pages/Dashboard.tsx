import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { api, HttpError } from '../lib/api';
import { useToast } from '../context/ToastContext';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { EmptyState } from '../components/ui/EmptyState';
import { Spinner } from '../components/ui/Spinner';
import { AgendaBoard } from '../components/agenda/AgendaBoard';
import { AppointmentDetailModal } from '../components/agenda/AppointmentDetailModal';
import { addDays, dayTitle, hourSlots, isOutsideHours, isSameDay, startOfDay } from '../lib/agenda';
import type {
  Animal,
  Appointment,
  AppointmentStatus,
  TenantAnimalItem,
  VeterinarianLink,
} from '../types';

export function DashboardPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [animals, setAnimals] = useState<TenantAnimalItem[]>([]);
  const [vets, setVets] = useState<VeterinarianLink[]>([]);
  const [day, setDay] = useState(() => startOfDay(new Date()));
  const [vetFilter, setVetFilter] = useState('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const { error: toastError, success: toastSuccess } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    Promise.all([
      api.get<Appointment[]>('/appointments'),
      api.get<TenantAnimalItem[]>('/animals'),
      api.get<VeterinarianLink[]>('/veterinarians').catch(() => [] as VeterinarianLink[]),
    ])
      .then(([appointmentList, animalLinks, vetLinks]) => {
        setAppointments(appointmentList);
        setAnimals(animalLinks);
        setVets(vetLinks);
      })
      .catch((err: unknown) => {
        toastError(err instanceof HttpError ? err.message : 'Erro ao carregar a agenda');
      })
      .finally(() => setLoading(false));
  }, [toastError]);

  const animalById = useMemo(() => {
    const map = new Map<string, Animal>();
    for (const link of animals) map.set(link.animal.id, link.animal);
    return map;
  }, [animals]);

  const today = startOfDay(new Date());
  const isToday = isSameDay(day, today);

  const dayAppointments = useMemo(
    () =>
      appointments
        .filter((appointment) => isSameDay(new Date(appointment.scheduledAt), day))
        .filter((appointment) => vetFilter === 'all' || appointment.veterinarian?.id === vetFilter)
        .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()),
    [appointments, day, vetFilter]
  );

  const hours = useMemo(() => hourSlots(dayAppointments), [dayAppointments]);
  const insideAppointments = useMemo(
    () => dayAppointments.filter((a) => !isOutsideHours(a.scheduledAt)),
    [dayAppointments]
  );
  const outsideAppointments = useMemo(
    () => dayAppointments.filter((a) => isOutsideHours(a.scheduledAt)),
    [dayAppointments]
  );
  const pending = dayAppointments.filter((a) => a.status === 'SCHEDULED').length;
  const inProgress = dayAppointments.filter((a) => a.status === 'IN_PROGRESS').length;

  const selected = selectedId ? appointments.find((a) => a.id === selectedId) ?? null : null;
  const selectedAnimal = selected ? animalById.get(selected.animal.id) : undefined;

  const handleStatusChange = useCallback(
    async (appointment: Appointment, status: AppointmentStatus) => {
      try {
        const updated = await api.patch<Appointment>(`/appointments/${appointment.id}`, { status });
        setAppointments((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
        toastSuccess(
          status === 'IN_PROGRESS'
            ? 'Atendimento iniciado'
            : status === 'COMPLETED'
              ? 'Atendimento concluído'
              : 'Agendamento cancelado'
        );
      } catch (err) {
        toastError(err instanceof HttpError ? err.message : 'Erro ao atualizar o agendamento');
      }
    },
    [toastError, toastSuccess]
  );

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-page font-semibold text-ink">Agenda</h1>
            <div className="flex items-center gap-1">
              <button
                type="button"
                aria-label="Dia anterior"
                onClick={() => setDay((d) => addDays(d, -1))}
                className="h-7 w-7 grid place-items-center rounded-md border border-line text-ink-3 hover:bg-[#f2f2f4] hover:text-ink"
              >
                <ChevronLeft size={16} strokeWidth={1.75} />
              </button>
              <button
                type="button"
                aria-label="Próximo dia"
                onClick={() => setDay((d) => addDays(d, 1))}
                className="h-7 w-7 grid place-items-center rounded-md border border-line text-ink-3 hover:bg-[#f2f2f4] hover:text-ink"
              >
                <ChevronRight size={16} strokeWidth={1.75} />
              </button>
              {!isToday && (
                <button
                  type="button"
                  onClick={() => setDay(today)}
                  className="h-7 px-2 rounded-md text-meta text-ink-2 hover:bg-[#f2f2f4] hover:text-ink"
                >
                  Hoje
                </button>
              )}
            </div>
          </div>
          <p className="text-meta text-ink-3 mt-0.5 first-letter:uppercase">{dayTitle(day)}</p>
        </div>

        <div className="flex items-center gap-2">
          <select
            aria-label="Filtrar por veterinário"
            value={vetFilter}
            onChange={(e) => setVetFilter(e.target.value)}
            className="h-9 rounded-md border border-line-strong bg-surface px-2.5 text-body text-ink-2 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent-ring"
          >
            <option value="all">Todos os veterinários</option>
            {vets.map((link) => (
              <option key={link.id} value={link.id}>
                {link.veterinarian.name}
              </option>
            ))}
          </select>
          <Button onClick={() => navigate('/agendamentos')}>Novo agendamento</Button>
        </div>
      </div>

      {dayAppointments.length > 0 && (
        <div className="mt-4 mb-5 flex items-center gap-3 text-meta text-ink-3">
          <span className="num text-ink-2 font-medium">
            {dayAppointments.length} {dayAppointments.length === 1 ? 'atendimento' : 'atendimentos'}
          </span>
          <span aria-hidden className="h-3 w-px bg-line-strong" />
          <span>{pending} aguardando</span>
          <span aria-hidden className="h-3 w-px bg-line-strong" />
          <span>{inProgress} em atendimento</span>
        </div>
      )}

      {dayAppointments.length === 0 ? (
        <Card>
          <EmptyState
            title="Nada agendado para este dia"
            description="A agenda está vazia. Crie um agendamento para começar."
            action={<Button onClick={() => navigate('/agendamentos')}>Novo agendamento</Button>}
          />
        </Card>
      ) : (
        <AgendaBoard
          hours={hours}
          appointments={insideAppointments}
          outside={outsideAppointments}
          animalById={animalById}
          currentHour={isToday ? new Date().getHours() : null}
          showVet={vetFilter === 'all'}
          onOpen={(appointment) => setSelectedId(appointment.id)}
        />
      )}

      <AppointmentDetailModal
        appointment={selected}
        animal={selectedAnimal}
        onClose={() => setSelectedId(null)}
        onOpenRecord={(animalId) => {
          setSelectedId(null);
          navigate(`/animais/${animalId}`);
        }}
        onStatusChange={handleStatusChange}
      />
    </div>
  );
}
