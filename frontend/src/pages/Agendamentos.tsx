import { useEffect, useMemo, useState, useCallback } from 'react';
import { api, HttpError } from '../lib/api';
import { useToast } from '../context/ToastContext';
import { Button } from '../components/ui/Button';
import { Card, CardBody } from '../components/ui/Card';
import { PageHeader } from '../components/ui/PageHeader';
import { Spinner } from '../components/ui/Spinner';
import { EmptyState } from '../components/ui/EmptyState';
import { Badge } from '../components/ui/Badge';
import type {
  Appointment,
  AppointmentStatus,
  CreateAppointmentBody,
  TenantAnimalItem,
  Tutor,
  VeterinarianLink,
} from '../types';

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

type Period = 'today' | 'next7' | 'next30' | 'past' | 'all';

const PERIODS: { value: Period; label: string }[] = [
  { value: 'today', label: 'Hoje' },
  { value: 'next7', label: 'Próximos 7 dias' },
  { value: 'next30', label: 'Próximos 30 dias' },
  { value: 'past', label: 'Passados' },
  { value: 'all', label: 'Todos' },
];

const PAGE_SIZES = [10, 20, 50];

function periodRange(period: Period): { start?: number; end?: number } {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const day = 86400000;
  switch (period) {
    case 'today':
      return { start: today, end: today + day };
    case 'next7':
      return { start: today, end: today + 7 * day };
    case 'next30':
      return { start: today, end: today + 30 * day };
    case 'past':
      return { end: today };
    default:
      return {};
  }
}

function formatDateTime(value?: string | null) {
  if (!value) return '—';
  const d = new Date(value);
  const date = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  const time = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  return `${date} · ${time}`;
}

/** Remove strings vazias para não violar o forbidNonWhitelisted da API. */
function compact<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const out: Record<string, unknown> = {};
  Object.entries(obj).forEach(([k, v]) => {
    if (v === undefined || v === null || v === '') return;
    out[k] = v;
  });
  return out as Partial<T>;
}

export function AppointmentsPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [animals, setAnimals] = useState<TenantAnimalItem[]>([]);
  const [vets, setVets] = useState<VeterinarianLink[]>([]);
  const [tutors, setTutors] = useState<Tutor[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [period, setPeriod] = useState<Period>('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const { error: toastError } = useToast();

  const fetchData = useCallback(() => {
    Promise.all([
      api.get<Appointment[]>('/appointments'),
      api.get<TenantAnimalItem[]>('/animals'),
      api.get<VeterinarianLink[]>('/veterinarians').catch(() => [] as VeterinarianLink[]),
      api.get<Tutor[]>('/tutors').catch(() => [] as Tutor[]),
    ])
      .then(([appts, animalLinks, vetLinks, tutorList]) => {
        setAppointments(appts);
        setAnimals(animalLinks);
        setVets(vetLinks);
        setTutors(tutorList);
      })
      .catch((err: unknown) => {
        toastError(err instanceof HttpError ? err.message : 'Erro ao carregar agendamentos');
      })
      .finally(() => setLoading(false));
  }, [toastError]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filtered = useMemo(() => {
    const { start, end } = periodRange(period);
    return appointments
      .filter((appointment) => {
        const time = new Date(appointment.scheduledAt).getTime();
        if (start !== undefined && time < start) return false;
        if (end !== undefined && time >= end) return false;
        return true;
      })
      .sort((a, b) => {
        const diff =
          new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime();
        return period === 'past' ? -diff : diff;
      });
  }, [appointments, period]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageItems = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const firstItem = filtered.length === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const lastItem = Math.min(currentPage * pageSize, filtered.length);

  const changePeriod = (value: Period) => {
    setPeriod(value);
    setPage(1);
  };

  const changePageSize = (value: number) => {
    setPageSize(value);
    setPage(1);
  };

  const handleStatusChange = async (id: string, status: AppointmentStatus) => {
    try {
      await api.patch(`/appointments/${id}`, { status });
      fetchData();
    } catch (err) {
      toastError(err instanceof HttpError ? err.message : 'Erro ao atualizar');
    }
  };

  const periodLabel = PERIODS.find((p) => p.value === period)?.label ?? 'Todos';

  return (
    <div>
      <PageHeader
        title="Agendamentos"
        subtitle={`${filtered.length} no período · ${periodLabel}`}
        actions={
          <Button onClick={() => setShowForm(!showForm)}>
            {showForm ? 'Cancelar' : 'Novo Agendamento'}
          </Button>
        }
      />

      {showForm && (
        <Card className="mb-6">
          <CardBody>
            <AppointmentForm
              animals={animals}
              vets={vets}
              tutors={tutors}
              onSuccess={() => {
                setShowForm(false);
                fetchData();
              }}
              onCancel={() => setShowForm(false)}
              onError={(msg) => toastError(msg)}
            />
          </CardBody>
        </Card>
      )}

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <label htmlFor="periodo" className="text-meta text-ink-3">
          Período
        </label>
        <select
          id="periodo"
          value={period}
          onChange={(e) => changePeriod(e.target.value as Period)}
          className="h-9 rounded-md border border-line-strong bg-surface px-2.5 text-body text-ink-2 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent-ring"
        >
          {PERIODS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {loading && <Spinner size="sm" />}
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Spinner size="lg" />
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <EmptyState
            title="Nenhum agendamento no período"
            description={
              appointments.length === 0
                ? 'Agende uma consulta.'
                : 'Troque o período para ver outros agendamentos.'
            }
          />
        </Card>
      ) : (
        <Card>
          <CardBody className="p-0 overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[#fbfbfc] border-b border-line">
                <tr>
                  <th className="text-left px-4 py-2.5 micro-label">Data</th>
                  <th className="text-left px-4 py-2.5 micro-label">Animal</th>
                  <th className="text-left px-4 py-2.5 micro-label">Tutor</th>
                  <th className="text-left px-4 py-2.5 micro-label">Veterinário</th>
                  <th className="text-left px-4 py-2.5 micro-label">Motivo</th>
                  <th className="text-left px-4 py-2.5 micro-label">Status</th>
                  <th className="text-right px-4 py-2.5 micro-label">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {pageItems.map((appt) => (
                  <tr key={appt.id} className="hover:bg-[#fbfbfc]">
                    <td className="px-4 py-3 text-body whitespace-nowrap">{formatDateTime(appt.scheduledAt)}</td>
                    <td className="px-4 py-3 text-body font-medium">{appt.animal?.name || '—'}</td>
                    <td className="px-4 py-3 text-body">{appt.tutor?.tutorIdentity?.name || '—'}</td>
                    <td className="px-4 py-3 text-body">{appt.veterinarian?.veterinarian?.name || '—'}</td>
                    <td className="px-4 py-3 text-body text-ink-2">{appt.reason || '—'}</td>
                    <td className="px-4 py-3">
                      <Badge variant={STATUS_VARIANT[appt.status]}>{STATUS_LABEL[appt.status]}</Badge>
                    </td>
                    <td className="px-4 py-3 text-right space-x-1 whitespace-nowrap">
                      {appt.status === 'SCHEDULED' && (
                        <>
                          <Button variant="ghost" size="sm" onClick={() => handleStatusChange(appt.id, 'IN_PROGRESS')}>
                            Iniciar
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleStatusChange(appt.id, 'CANCELLED')}>
                            Cancelar
                          </Button>
                        </>
                      )}
                      {appt.status === 'IN_PROGRESS' && (
                        <Button variant="ghost" size="sm" onClick={() => handleStatusChange(appt.id, 'COMPLETED')}>
                          Concluir
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardBody>

          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-t border-line">
            <span className="text-meta text-ink-3">
              Mostrando {firstItem}–{lastItem} de {filtered.length}
            </span>
            <div className="flex items-center gap-2">
              <label htmlFor="page-size" className="text-meta text-ink-4">
                Por página
              </label>
              <select
                id="page-size"
                value={pageSize}
                onChange={(e) => changePageSize(Number(e.target.value))}
                className="h-8 rounded-md border border-line-strong bg-surface px-2 text-meta text-ink-2"
              >
                {PAGE_SIZES.map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
              <Button
                variant="secondary"
                size="sm"
                disabled={currentPage <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Anterior
              </Button>
              <span className="num text-meta text-ink-3">
                {currentPage} / {totalPages}
              </span>
              <Button
                variant="secondary"
                size="sm"
                disabled={currentPage >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                Próxima
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}

function AppointmentForm({
  animals,
  vets,
  tutors,
  onSuccess,
  onCancel,
  onError,
}: {
  animals: TenantAnimalItem[];
  vets: VeterinarianLink[];
  tutors: Tutor[];
  onSuccess: () => void;
  onCancel: () => void;
  onError: (msg: string) => void;
}) {
  const [form, setForm] = useState<CreateAppointmentBody>({
    animalId: '',
    veterinarianId: '',
    tutorId: '',
    scheduledAt: '',
    reason: '',
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/appointments', compact({ ...form }));
      onSuccess();
    } catch (err) {
      onError(err instanceof HttpError ? err.message : 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  const update = (field: keyof CreateAppointmentBody, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        <div className="flex flex-col gap-1">
          <label className="text-body font-medium text-ink-2">Animal</label>
          <select
            value={form.animalId}
            onChange={(e) => update('animalId', e.target.value)}
            required
            className="rounded-md border border-line-strong px-3 py-2 text-body bg-surface"
          >
            <option value="">Selecione...</option>
            {animals.map((link) => (
              <option key={link.animal.id} value={link.animal.id}>
                {link.animal.name || link.animal.internalCode}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-body font-medium text-ink-2">Veterinário</label>
          <select
            value={form.veterinarianId}
            onChange={(e) => update('veterinarianId', e.target.value)}
            required
            className="rounded-md border border-line-strong px-3 py-2 text-body bg-surface"
          >
            <option value="">Selecione...</option>
            {vets.map((link) => (
              <option key={link.id} value={link.id}>
                {link.veterinarian.name}
                {link.veterinarian.crmv ? ` — ${link.veterinarian.crmv}` : ''}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-body font-medium text-ink-2">Tutor</label>
          <select
            value={form.tutorId || ''}
            onChange={(e) => update('tutorId', e.target.value)}
            className="rounded-md border border-line-strong px-3 py-2 text-body bg-surface"
          >
            <option value="">—</option>
            {tutors.map((t) => (
              <option key={t.id} value={t.id}>
                {t.tutorIdentity?.name || 'Sem nome'}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1">
          <label className="text-body font-medium text-ink-2">Data/Hora</label>
          <input
            type="datetime-local"
            value={form.scheduledAt}
            onChange={(e) => update('scheduledAt', e.target.value)}
            required
            className="rounded-md border border-line-strong px-3 py-2 text-body"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-body font-medium text-ink-2">Motivo</label>
          <input
            type="text"
            value={form.reason}
            onChange={(e) => update('reason', e.target.value)}
            className="rounded-md border border-line-strong px-3 py-2 text-body"
          />
        </div>
      </div>
      <div className="flex justify-end gap-3">
        <Button variant="secondary" type="button" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" disabled={saving}>
          {saving ? 'Salvando...' : 'Agendar'}
        </Button>
      </div>
    </form>
  );
}
