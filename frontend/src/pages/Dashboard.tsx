import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { useToast } from '../context/ToastContext';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Card } from '../components/ui/Card';
import { EmptyState } from '../components/ui/EmptyState';
import { Spinner } from '../components/ui/Spinner';
import type { Appointment, Consultation } from '../types';

const STATUS_LABEL: Record<Appointment['status'], string> = {
  SCHEDULED: 'Agendado',
  IN_PROGRESS: 'Em atendimento',
  COMPLETED: 'Concluído',
  CANCELLED: 'Cancelado',
};

const STATUS_VARIANT: Record<Appointment['status'], 'default' | 'warning' | 'success' | 'danger'> = {
  SCHEDULED: 'default',
  IN_PROGRESS: 'warning',
  COMPLETED: 'success',
  CANCELLED: 'danger',
};

const WEEKDAYS = [
  'domingo',
  'segunda-feira',
  'terça-feira',
  'quarta-feira',
  'quinta-feira',
  'sexta-feira',
  'sábado',
];

const MONTHS = [
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

function startOfDay(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

function dayLabel(date: Date, today: number): string {
  const diff = Math.round((startOfDay(date) - today) / 86400000);
  if (diff === 0) return 'Hoje';
  if (diff === 1) return 'Amanhã';
  if (diff === -1) return 'Ontem';
  if (diff > 1 && diff <= 7) return WEEKDAYS[date.getDay()].replace('-feira', '');
  return `${date.getDate()} de ${MONTHS[date.getMonth()]}`;
}

function timeLabel(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export function DashboardPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [loading, setLoading] = useState(true);
  const { error: toastError } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    Promise.all([api.get<Appointment[]>('/appointments'), api.get<Consultation[]>('/consultations')])
      .then(([appointmentsData, consultationsData]) => {
        setAppointments(appointmentsData);
        setConsultations(consultationsData);
      })
      .catch((err: unknown) => {
        toastError(err instanceof Error ? err.message : 'Erro ao carregar a agenda');
      })
      .finally(() => setLoading(false));
  }, [toastError]);

  const now = new Date();
  const today = startOfDay(now);

  const groups = useMemo(() => {
    const map = new Map<number, Appointment[]>();
    for (const appointment of appointments) {
      const key = startOfDay(new Date(appointment.scheduledAt));
      const list = map.get(key) ?? [];
      list.push(appointment);
      map.set(key, list);
    }
    return [...map.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([key, items]) => ({
        key,
        label: dayLabel(new Date(key), today),
        items: items.sort(
          (a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()
        ),
      }));
  }, [appointments, today]);

  const todayItems = groups.find((g) => g.key === today)?.items ?? [];
  const inProgress = todayItems.filter((a) => a.status === 'IN_PROGRESS').length;
  const pendingToday = todayItems.filter((a) => a.status === 'SCHEDULED').length;
  const latestConsultations = useMemo(
    () =>
      [...consultations]
        .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime())
        .slice(0, 4),
    [consultations]
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
      <div className="flex items-start justify-between gap-4 mb-1">
        <div>
          <h1 className="text-page font-semibold text-ink">Hoje</h1>
          <p className="text-meta text-ink-3 mt-0.5">
            {WEEKDAYS[now.getDay()]}, {now.getDate()} de {MONTHS[now.getMonth()]}
          </p>
        </div>
        <Button onClick={() => navigate('/agendamentos')}>Novo agendamento</Button>
      </div>

      <div className="mt-4 mb-6 flex items-center gap-3 text-meta text-ink-3">
        <span className="num text-ink-2 font-medium">
          {todayItems.length} {todayItems.length === 1 ? 'atendimento' : 'atendimentos'}
        </span>
        <span aria-hidden className="h-3 w-px bg-line-strong" />
        <span>{pendingToday} aguardando</span>
        <span aria-hidden className="h-3 w-px bg-line-strong" />
        <span>{inProgress} em atendimento</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_300px] gap-6 items-start">
        <Card>
          {groups.length === 0 ? (
            <EmptyState
              title="Nada agendado"
              description="A agenda está vazia. Crie um agendamento para começar o dia."
              action={<Button onClick={() => navigate('/agendamentos')}>Novo agendamento</Button>}
            />
          ) : (
            <div>
              {groups.map((group, groupIndex) => (
                <section key={group.key}>
                  <div
                    className={`flex items-baseline justify-between px-5 py-2.5 ${
                      groupIndex === 0 ? '' : 'border-t border-line'
                    } bg-[#fbfbfc]`}
                  >
                    <h2 className="text-micro uppercase tracking-[0.06em] text-ink-4 font-medium">
                      {group.label}
                    </h2>
                    <span className="num text-meta text-ink-4">{group.items.length}</span>
                  </div>
                  <ul>
                    {group.items.map((appointment) => (
                      <li
                        key={appointment.id}
                        className="row-hover flex items-center gap-4 px-5 py-3 border-t border-line first:border-t-0"
                      >
                        <time
                          dateTime={appointment.scheduledAt}
                          className="num text-meta text-ink-3 w-11 shrink-0"
                        >
                          {timeLabel(appointment.scheduledAt)}
                        </time>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-body font-medium text-ink truncate">
                              {appointment.animal?.name ?? appointment.animal?.internalCode}
                            </span>
                            <span className="num text-micro text-ink-4 shrink-0">
                              {appointment.animal?.internalCode}
                            </span>
                          </div>
                          <p className="text-meta text-ink-3 truncate">
                            {appointment.tutor?.tutorIdentity?.name ?? 'Tutor não informado'}
                            {appointment.reason ? ` · ${appointment.reason}` : ''}
                          </p>
                        </div>
                        <Badge variant={STATUS_VARIANT[appointment.status]}>
                          {STATUS_LABEL[appointment.status]}
                        </Badge>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <div className="px-5 py-3 border-b border-line">
            <h2 className="text-micro uppercase tracking-[0.06em] text-ink-4 font-medium">
              Últimas consultas
            </h2>
          </div>
          {latestConsultations.length === 0 ? (
            <p className="px-5 py-6 text-meta text-ink-3">Nenhuma consulta registrada ainda.</p>
          ) : (
            <ul>
              {latestConsultations.map((consultation) => (
                <li key={consultation.id} className="px-5 py-3 border-t border-line first:border-t-0">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-body font-medium text-ink truncate">
                      {consultation.animal?.name ?? consultation.animal?.internalCode}
                    </span>
                    <time
                      dateTime={consultation.startedAt}
                      className="num text-micro text-ink-4 shrink-0"
                    >
                      {new Date(consultation.startedAt).toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        month: '2-digit',
                      })}
                    </time>
                  </div>
                  <p className="text-meta text-ink-3 truncate">
                    {consultation.chiefComplaint ?? 'Sem queixa registrada'}
                  </p>
                  <p className="text-micro text-ink-4 truncate">
                    {consultation.veterinarian?.veterinarian?.name ?? 'Veterinário não informado'}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
