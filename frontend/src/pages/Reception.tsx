import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { api, HttpError } from '../lib/api';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Card } from '../components/ui/Card';
import { EmptyState } from '../components/ui/EmptyState';
import { Spinner } from '../components/ui/Spinner';
import { PageHeader } from '../components/ui/PageHeader';
import { AnimalAvatar } from '../components/agenda/AppointmentCard';
import { addDays, dayTitle, isSameDay, startOfDay, timeLabel } from '../lib/agenda';
import type { Animal, Appointment, AppointmentStatus, TenantAnimalItem } from '../types';

const STATUS_LABEL: Record<AppointmentStatus, string> = {
  SCHEDULED: 'Agendado',
  IN_PROGRESS: 'Em atendimento',
  COMPLETED: 'Concluído',
  CANCELLED: 'Cancelado',
};

const STATUS_VARIANT: Record<AppointmentStatus, 'default' | 'warning' | 'success' | 'danger'> = {
  SCHEDULED: 'default',
  IN_PROGRESS: 'warning',
  COMPLETED: 'success',
  CANCELLED: 'danger',
};

export function ReceptionPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [animals, setAnimals] = useState<TenantAnimalItem[]>([]);
  const [day, setDay] = useState(() => startOfDay(new Date()));
  const [loading, setLoading] = useState(true);
  const { error: toastError, success: toastSuccess } = useToast();
  const { can } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    Promise.all([
      api.get<Appointment[]>('/appointments'),
      api.get<TenantAnimalItem[]>('/animals'),
    ])
      .then(([appointmentList, animalLinks]) => {
        setAppointments(appointmentList);
        setAnimals(animalLinks);
      })
      .catch((err: unknown) => {
        toastError(err instanceof HttpError ? err.message : 'Erro ao carregar a recepção');
      })
      .finally(() => setLoading(false));
  }, [toastError]);

  const animalById = useMemo(() => {
    const map = new Map<string, Animal>();
    for (const link of animals) map.set(link.animal.id, link.animal);
    return map;
  }, [animals]);

  const dayItems = useMemo(
    () =>
      appointments
        .filter((appointment) => isSameDay(new Date(appointment.scheduledAt), day))
        .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()),
    [appointments, day]
  );

  const pending = dayItems.filter((a) => a.status === 'SCHEDULED').length;
  const inProgress = dayItems.filter((a) => a.status === 'IN_PROGRESS').length;
  const completed = dayItems.filter((a) => a.status === 'COMPLETED').length;
  const isToday = isSameDay(day, new Date());

  const handleCancel = useCallback(
    async (appointment: Appointment) => {
      try {
        const updated = await api.patch<Appointment>(`/appointments/${appointment.id}`, {
          status: 'CANCELLED',
        });
        setAppointments((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
        toastSuccess('Agendamento cancelado');
      } catch (err) {
        toastError(err instanceof HttpError ? err.message : 'Erro ao cancelar o agendamento');
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
      <PageHeader
        title="Recepção"
        subtitle={`${dayTitle(day)} · ${dayItems.length} ${dayItems.length === 1 ? 'atendimento' : 'atendimentos'}`}
        actions={
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => navigate('/tutores/novo')}>
              Novo tutor
            </Button>
            <Button variant="secondary" onClick={() => navigate('/animais/novo')}>
              Novo animal
            </Button>
            <Button onClick={() => navigate('/agendamentos')}>Novo agendamento</Button>
          </div>
        }
      />

      <div className="flex items-center gap-2 mb-5">
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
            onClick={() => setDay(startOfDay(new Date()))}
            className="h-7 px-2 rounded-md text-meta text-ink-2 hover:bg-[#f2f2f4] hover:text-ink"
          >
            Hoje
          </button>
        )}
        <span aria-hidden className="h-3 w-px bg-line-strong mx-1" />
        <span className="text-meta text-ink-3">{pending} aguardando</span>
        <span aria-hidden className="h-3 w-px bg-line-strong" />
        <span className="text-meta text-ink-3">{inProgress} em atendimento</span>
        <span aria-hidden className="h-3 w-px bg-line-strong" />
        <span className="text-meta text-ink-3">{completed} concluídos</span>
      </div>

      <Card>
        {dayItems.length === 0 ? (
          <EmptyState
            title="Nada agendado para este dia"
            description="Crie um agendamento ou escolha outro dia."
            action={<Button onClick={() => navigate('/agendamentos')}>Novo agendamento</Button>}
          />
        ) : (
          <ul>
            {dayItems.map((appointment) => {
              const animal = animalById.get(appointment.animal.id);
              const name = appointment.animal.name ?? appointment.animal.internalCode;
              return (
                <li
                  key={appointment.id}
                  className="row-hover flex items-center gap-4 px-5 py-3 border-t border-line first:border-t-0"
                >
                  <time
                    dateTime={appointment.scheduledAt}
                    className="num text-body text-ink-2 w-12 shrink-0"
                  >
                    {timeLabel(appointment.scheduledAt)}
                  </time>
                  <AnimalAvatar
                    animal={animal}
                    name={appointment.animal.name}
                    code={appointment.animal.internalCode}
                    size={44}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-2">
                      <span className="text-body font-medium text-ink truncate">{name}</span>
                      <span className="num text-micro text-ink-4">{appointment.animal.internalCode}</span>
                    </div>
                    <p className="text-meta text-ink-3 truncate">
                      {appointment.tutor?.tutorIdentity?.name ?? 'Tutor não informado'}
                      {appointment.reason ? ` · ${appointment.reason}` : ''}
                    </p>
                    <p className="text-micro text-ink-4 truncate">
                      {appointment.veterinarian?.veterinarian?.name ?? 'Sem veterinário'}
                    </p>
                  </div>
                  <Badge variant={STATUS_VARIANT[appointment.status]}>
                    {STATUS_LABEL[appointment.status]}
                  </Badge>
                  <div className="flex gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigate(`/animais/${appointment.animal.id}`)}
                    >
                      Abrir
                    </Button>
                    {appointment.status === 'SCHEDULED' && can('APPOINTMENT_UPDATE') && (
                      <Button variant="ghost" size="sm" onClick={() => handleCancel(appointment)}>
                        Cancelar
                      </Button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}
