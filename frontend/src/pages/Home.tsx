import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, ChevronUp, GripVertical } from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/EmptyState';
import { Modal } from '../components/ui/Modal';
import { Spinner } from '../components/ui/Spinner';
import { AnimalAvatar } from '../components/agenda/AppointmentCard';
import { dayTitle, isSameDay, startOfDay, timeLabel } from '../lib/agenda';
import {
  APPOINTMENT_STATUS_LABEL,
  APPOINTMENT_STATUS_VARIANT,
} from '../lib/appointment-status';
import { ROLE_LABEL, primaryRole } from '../lib/roles';
import type {
  Animal,
  Appointment,
  TenantAnimalItem,
  UserLink,
  VeterinarianLink,
} from '../types';

type WidgetId = 'resumo' | 'agenda' | 'proximos' | 'atalhos' | 'equipe' | 'estoque' | 'custos';

type MetricId = 'total' | 'pending' | 'inProgress' | 'completed';

/** O que cada card mostra, além de aparecer ou não. */
interface WidgetOptions {
  metrics?: MetricId[];
  rows?: number;
  showTutor?: boolean;
  showReason?: boolean;
}

interface DashboardPrefs {
  order: WidgetId[];
  options: Partial<Record<WidgetId, WidgetOptions>>;
}

const METRICS: { id: MetricId; label: string; tone: string }[] = [
  { id: 'total', label: 'Atendimentos hoje', tone: 'text-ink' },
  { id: 'pending', label: 'Aguardando', tone: 'text-ink' },
  { id: 'inProgress', label: 'Em atendimento', tone: 'text-state-progress' },
  { id: 'completed', label: 'Concluídos', tone: 'text-state-done' },
];

const ALL_METRICS: MetricId[] = METRICS.map((metric) => metric.id);

/** Quantidades oferecidas por card que lista registros. */
const ROW_CHOICES: Partial<Record<WidgetId, number[]>> = {
  agenda: [4, 6, 8, 12],
  proximos: [3, 5, 8, 12],
  equipe: [3, 5, 8],
};

/** Valor mostrado no seletor quando o usuário nunca escolheu (igual ao render padrão). */
const DEFAULT_ROWS: Partial<Record<WidgetId, number>> = { agenda: 8, proximos: 5, equipe: 5 };

const TOGGLES: Partial<Record<WidgetId, { key: 'showTutor' | 'showReason'; label: string }[]>> = {
  agenda: [{ key: 'showTutor', label: 'Mostrar o tutor de cada atendimento' }],
  proximos: [{ key: 'showReason', label: 'Mostrar o motivo do atendimento' }],
};

interface WidgetContext {
  can: (permission: string) => boolean;
  role: string | null;
}

interface WidgetDef {
  id: WidgetId;
  title: string;
  description: string;
  span: string;
  available: (ctx: WidgetContext) => boolean;
}

const WIDGETS: WidgetDef[] = [
  {
    id: 'resumo',
    title: 'Resumo do dia',
    description: 'Atendimentos de hoje por status.',
    span: 'lg:col-span-12',
    available: ({ can }) => can('APPOINTMENT_READ'),
  },
  {
    id: 'agenda',
    title: 'Agenda de hoje',
    description: 'Lista dos atendimentos do dia.',
    span: 'lg:col-span-7',
    available: ({ can }) => can('APPOINTMENT_READ'),
  },
  {
    id: 'proximos',
    title: 'Próximos atendimentos',
    description: 'Os próximos compromissos da agenda.',
    span: 'lg:col-span-5',
    available: ({ can }) => can('APPOINTMENT_READ'),
  },
  {
    id: 'atalhos',
    title: 'Atalhos',
    description: 'Cadastros e novo agendamento.',
    span: 'lg:col-span-5',
    available: ({ can }) =>
      can('APPOINTMENT_CREATE') || can('TUTOR_CREATE') || can('ANIMAL_CREATE'),
  },
  {
    id: 'equipe',
    title: 'Equipe',
    description: 'Quem tem acesso à clínica.',
    span: 'lg:col-span-7',
    available: ({ can }) => can('USER_MANAGE'),
  },
  {
    id: 'estoque',
    title: 'Estoque',
    description: 'Itens abaixo do mínimo (prévia).',
    span: 'lg:col-span-6',
    available: ({ role }) => role === 'ADMIN',
  },
  {
    id: 'custos',
    title: 'Custos',
    description: 'Custo mensal estimado (prévia).',
    span: 'lg:col-span-6',
    available: ({ role }) => role === 'ADMIN',
  },
];

const DEFAULTS: Record<string, WidgetId[]> = {
  ADMIN: ['resumo', 'proximos', 'equipe', 'estoque', 'custos'],
  VETERINARIAN: ['resumo', 'agenda', 'proximos', 'atalhos'],
  RECEPTIONIST: ['resumo', 'agenda', 'proximos', 'atalhos'],
};

function prefKey(userId: string, tenantId: string): string {
  return `erp.dashboard.${userId}.${tenantId}`;
}

function isWidgetId(value: unknown): value is WidgetId {
  return WIDGETS.some((widget) => widget.id === value);
}

function loadPrefs(userId: string, tenantId: string): DashboardPrefs | null {
  try {
    const raw = localStorage.getItem(prefKey(userId, tenantId));
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    // formato antigo: um array só com a ordem dos cards
    if (Array.isArray(parsed)) return { order: parsed.filter(isWidgetId), options: {} };
    if (!parsed || typeof parsed !== 'object') return null;
    const data = parsed as { order?: unknown; options?: unknown };
    const order = Array.isArray(data.order) ? data.order.filter(isWidgetId) : [];
    const options =
      data.options && typeof data.options === 'object'
        ? (data.options as Partial<Record<WidgetId, WidgetOptions>>)
        : {};
    return { order, options };
  } catch {
    return null;
  }
}

function savePrefs(userId: string, tenantId: string, prefs: DashboardPrefs) {
  localStorage.setItem(prefKey(userId, tenantId), JSON.stringify(prefs));
}

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Bom dia';
  if (hour < 18) return 'Boa tarde';
  return 'Boa noite';
}

function firstName(name: string | undefined | null): string {
  if (!name) return '';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '';
  if (/^(dr|dra|sr|sra)\.?$/i.test(parts[0]) && parts[1]) return parts[1];
  return parts[0];
}

export function HomePage() {
  const { user, activeTenant, roles, can } = useAuth();
  const navigate = useNavigate();
  const role = primaryRole(roles);

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [animals, setAnimals] = useState<TenantAnimalItem[]>([]);
  const [users, setUsers] = useState<UserLink[]>([]);
  const [vets, setVets] = useState<VeterinarianLink[]>([]);
  const [loading, setLoading] = useState(true);

  const [visible, setVisible] = useState<WidgetId[] | null>(null);
  const [options, setOptions] = useState<Partial<Record<WidgetId, WidgetOptions>>>({});
  const [customizing, setCustomizing] = useState(false);
  const [draft, setDraft] = useState<WidgetId[]>([]);
  const [draftEnabled, setDraftEnabled] = useState<WidgetId[]>([]);
  const [draftOptions, setDraftOptions] = useState<Partial<Record<WidgetId, WidgetOptions>>>({});
  const [draggingId, setDraggingId] = useState<WidgetId | null>(null);
  const [dragEnabled, setDragEnabled] = useState<WidgetId | null>(null);
  const [expandedId, setExpandedId] = useState<WidgetId | null>(null);

  useEffect(() => {
    Promise.all([
      api.get<Appointment[]>('/appointments').catch(() => [] as Appointment[]),
      api.get<TenantAnimalItem[]>('/animals').catch(() => [] as TenantAnimalItem[]),
      api.get<UserLink[]>('/users').catch(() => [] as UserLink[]),
      api.get<VeterinarianLink[]>('/veterinarians').catch(() => [] as VeterinarianLink[]),
    ])
      .then(([appointmentList, animalLinks, userList, vetList]) => {
        setAppointments(appointmentList);
        setAnimals(animalLinks);
        setUsers(userList);
        setVets(vetList);
      })
      .finally(() => setLoading(false));
  }, []);

  const available = useMemo(
    () => WIDGETS.filter((widget) => widget.available({ can, role })),
    [can, role]
  );
  const availableIds = useMemo(() => available.map((widget) => widget.id), [available]);
  const defaults = DEFAULTS[role ?? 'VETERINARIAN'] ?? [];
  const visibleIds = (visible ?? defaults).filter((id) => availableIds.includes(id));

  useEffect(() => {
    if (!user || !activeTenant) return;
    const saved = loadPrefs(user.id, activeTenant.id);
    setVisible(saved?.order ?? defaults);
    setOptions(saved?.options ?? {});
    // defaults é derivado de role; a troca de papel recarrega a seleção
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, activeTenant?.id, role]);

  const animalById = useMemo(() => {
    const map = new Map<string, Animal>();
    for (const link of animals) map.set(link.animal.id, link.animal);
    return map;
  }, [animals]);

  const todayItems = useMemo(() => {
    const today = startOfDay(new Date());
    return appointments
      .filter((appointment) => isSameDay(new Date(appointment.scheduledAt), today))
      .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());
  }, [appointments]);

  const pending = todayItems.filter((a) => a.status === 'SCHEDULED').length;
  const inProgress = todayItems.filter((a) => a.status === 'IN_PROGRESS').length;
  const completed = todayItems.filter((a) => a.status === 'COMPLETED').length;

  const nextAppointments = useMemo(() => {
    const now = Date.now();
    return appointments
      .filter(
        (appointment) =>
          new Date(appointment.scheduledAt).getTime() >= now &&
          appointment.status !== 'CANCELLED'
      )
      .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());
  }, [appointments]);

  const rowsFor = (id: WidgetId, fallback: number) => options[id]?.rows ?? fallback;

  const openCustomize = () => {
    // a lista do modal mantém todos os módulos disponíveis, na ordem salva:
    // ligar/desligar não move a linha, só o arrasto muda a ordem
    setDraft([...visibleIds, ...availableIds.filter((id) => !visibleIds.includes(id))]);
    setDraftEnabled(visibleIds);
    setDraftOptions(options);
    setExpandedId(null);
    setCustomizing(true);
  };

  const saveCustomize = () => {
    if (!user || !activeTenant) return;
    const filtered = draft.filter((id) => draftEnabled.includes(id));
    savePrefs(user.id, activeTenant.id, { order: filtered, options: draftOptions });
    setVisible(filtered);
    setOptions(draftOptions);
    setCustomizing(false);
  };

  const toggleDraft = (id: WidgetId) => {
    setDraftEnabled((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const moveDraft = (from: number, to: number) => {
    setDraft((prev) => {
      if (to < 0 || to >= prev.length || from === to) return prev;
      const next = [...prev];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      return next;
    });
  };

  const dragOver = (overId: WidgetId) => {
    if (!draggingId || draggingId === overId) return;
    const from = draft.indexOf(draggingId);
    const to = draft.indexOf(overId);
    if (from < 0 || to < 0) return;
    moveDraft(from, to);
  };

  const patchDraftOption = (id: WidgetId, patch: WidgetOptions) => {
    setDraftOptions((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));
  };

  const toggleMetric = (id: WidgetId, metric: MetricId) => {
    const current = draftOptions[id]?.metrics ?? ALL_METRICS;
    const next = current.includes(metric)
      ? current.filter((item) => item !== metric)
      : ALL_METRICS.filter((item) => item === metric || current.includes(item));
    // nunca deixa o card sem nenhum número
    patchDraftOption(id, { metrics: next.length === 0 ? ALL_METRICS : next });
  };

  const resetDraft = () => {
    const padrao = defaults.filter((id) => availableIds.includes(id));
    setDraft([...padrao, ...availableIds.filter((id) => !padrao.includes(id))]);
    setDraftEnabled(padrao);
    setDraftOptions({});
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }

  const renderWidget = (id: WidgetId) => {
    switch (id) {
      case 'resumo': {
        const chosen = options.resumo?.metrics ?? ALL_METRICS;
        const values: Record<MetricId, number> = {
          total: todayItems.length,
          pending,
          inProgress,
          completed,
        };
        const shown = METRICS.filter((metric) => chosen.includes(metric.id));
        return (
          <Card className="px-5 py-4">
            <div
              className={`grid grid-cols-2 gap-4 ${
                shown.length > 2 ? 'md:grid-cols-4' : 'md:grid-cols-2'
              }`}
            >
              {shown.map((metric) => (
                <div key={metric.id}>
                  <p className="micro-label">{metric.label}</p>
                  <p className={`num text-page font-semibold mt-1 ${metric.tone}`}>
                    {values[metric.id]}
                  </p>
                </div>
              ))}
            </div>
          </Card>
        );
      }

      case 'agenda':
        return (
          <Card>
            <div className="px-5 py-3 border-b border-line flex items-center justify-between">
              <h2 className="text-micro uppercase tracking-[0.06em] text-ink-4 font-medium">
                Agenda de hoje
              </h2>
              <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard')}>
                Abrir agenda
              </Button>
            </div>
            {todayItems.length === 0 ? (
              <p className="px-5 py-6 text-meta text-ink-3">Nada agendado para hoje.</p>
            ) : (
              <ul>
                {todayItems.slice(0, rowsFor('agenda', 8)).map((appointment) => (
                  <li
                    key={appointment.id}
                    className="px-5 py-2.5 border-t border-line first:border-t-0 flex items-center gap-3"
                  >
                    <time className="num text-meta text-ink-3 w-11 shrink-0">
                      {timeLabel(appointment.scheduledAt)}
                    </time>
                    <AnimalAvatar
                      animal={animalById.get(appointment.animal.id)}
                      name={appointment.animal.name}
                      code={appointment.animal.internalCode}
                      size={32}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-body font-medium text-ink truncate">
                        {appointment.animal.name ?? appointment.animal.internalCode}
                      </p>
                      {options.agenda?.showTutor !== false && (
                        <p className="text-meta text-ink-3 truncate">
                          {appointment.tutor?.tutorIdentity?.name ?? 'Tutor não informado'}
                        </p>
                      )}
                    </div>
                    <Badge variant={APPOINTMENT_STATUS_VARIANT[appointment.status]}>
                      {APPOINTMENT_STATUS_LABEL[appointment.status]}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        );

      case 'proximos':
        return (
          <Card>
            <div className="px-5 py-3 border-b border-line">
              <h2 className="text-micro uppercase tracking-[0.06em] text-ink-4 font-medium">
                Próximos atendimentos
              </h2>
            </div>
            {nextAppointments.length === 0 ? (
              <p className="px-5 py-6 text-meta text-ink-3">Nada agendado.</p>
            ) : (
              <ul>
                {nextAppointments.slice(0, rowsFor('proximos', 5)).map((appointment) => (
                  <li key={appointment.id} className="px-5 py-3 border-t border-line first:border-t-0">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-body font-medium text-ink truncate">
                        {appointment.animal.name ?? appointment.animal.internalCode}
                      </span>
                      <span className="num text-micro text-ink-4 shrink-0">
                        {new Date(appointment.scheduledAt).toLocaleDateString('pt-BR', {
                          day: '2-digit',
                          month: '2-digit',
                        })}{' '}
                        {timeLabel(appointment.scheduledAt)}
                      </span>
                    </div>
                    <p className="text-meta text-ink-3 truncate">
                      {appointment.tutor?.tutorIdentity?.name ?? 'Tutor não informado'}
                      {options.proximos?.showReason !== false && appointment.reason
                        ? ` · ${appointment.reason}`
                        : ''}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        );

      case 'atalhos':
        return (
          <Card>
            <div className="px-5 py-3 border-b border-line">
              <h2 className="text-micro uppercase tracking-[0.06em] text-ink-4 font-medium">
                Atalhos
              </h2>
            </div>
            <div className="px-5 py-4 flex flex-wrap gap-2">
              {can('APPOINTMENT_CREATE') && (
                <Button onClick={() => navigate('/agendamentos')}>Novo agendamento</Button>
              )}
              {can('TUTOR_CREATE') && (
                <Button variant="secondary" onClick={() => navigate('/tutores/novo')}>
                  Novo tutor
                </Button>
              )}
              {can('ANIMAL_CREATE') && (
                <Button variant="secondary" onClick={() => navigate('/animais/novo')}>
                  Novo animal
                </Button>
              )}
            </div>
          </Card>
        );

      case 'equipe':
        return (
          <Card>
            <div className="px-5 py-3 border-b border-line flex items-center justify-between">
              <h2 className="text-micro uppercase tracking-[0.06em] text-ink-4 font-medium">
                Equipe
              </h2>
              {can('USER_MANAGE') && (
                <Button variant="ghost" size="sm" onClick={() => navigate('/admin/equipe')}>
                  Gerenciar
                </Button>
              )}
            </div>
            <ul>
              {users.slice(0, rowsFor('equipe', 5)).map((member) => (
                <li
                  key={member.userId}
                  className="px-5 py-2.5 border-t border-line first:border-t-0 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <p className="text-body font-medium text-ink truncate">{member.name}</p>
                    <p className="text-meta text-ink-3 truncate">{member.email}</p>
                  </div>
                  <Badge>{member.roles.map((r) => ROLE_LABEL[r] ?? r).join(', ') || '—'}</Badge>
                </li>
              ))}
            </ul>
            <p className="px-5 py-3 text-meta text-ink-3 border-t border-line">
              {users.length} pessoas com acesso · {vets.length} veterinários
            </p>
          </Card>
        );

      case 'estoque':
        return (
          <Card>
            <div className="px-5 py-3 border-b border-line flex items-center justify-between">
              <h2 className="text-micro uppercase tracking-[0.06em] text-ink-4 font-medium">
                Estoque
              </h2>
              <Button variant="ghost" size="sm" onClick={() => navigate('/admin/estoque')}>
                Abrir
              </Button>
            </div>
            <div className="px-5 py-4">
              <p className="num text-page font-semibold text-ink">3</p>
              <p className="text-meta text-ink-3">itens abaixo do mínimo</p>
              <p className="text-micro text-ink-4 mt-2">
                Prévia visual — controle de estoque ainda sem backend.
              </p>
            </div>
          </Card>
        );

      case 'custos':
        return (
          <Card>
            <div className="px-5 py-3 border-b border-line flex items-center justify-between">
              <h2 className="text-micro uppercase tracking-[0.06em] text-ink-4 font-medium">
                Custos
              </h2>
              <Button variant="ghost" size="sm" onClick={() => navigate('/admin/custos')}>
                Abrir
              </Button>
            </div>
            <div className="px-5 py-4">
              <p className="num text-page font-semibold text-ink">R$ 21.520</p>
              <p className="text-meta text-ink-3">custo mensal estimado</p>
              <p className="text-micro text-ink-4 mt-2">
                Prévia visual — módulo financeiro ainda sem backend.
              </p>
            </div>
          </Card>
        );

      default:
        return null;
    }
  };

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4 mb-5">
        <div>
          <h1 className="text-page font-semibold text-ink">Dashboard</h1>
          <p className="text-meta text-ink-3 mt-0.5">
            {greeting()}, {firstName(user?.name)} · {dayTitle(new Date())}
            {role ? ` · ${ROLE_LABEL[role]}` : ''}
          </p>
        </div>
        <Button variant="secondary" onClick={openCustomize}>
          Personalizar
        </Button>
      </div>

      {visibleIds.length === 0 ? (
        <Card>
          <EmptyState
            title="Sua página inicial está vazia"
            description="Escolha os módulos que quer ver no seu dia a dia."
            action={<Button onClick={openCustomize}>Personalizar início</Button>}
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {visibleIds.map((id) => {
            const def = WIDGETS.find((widget) => widget.id === id);
            if (!def) return null;
            return (
              <section key={id} className={def.span} aria-label={def.title}>
                {renderWidget(id)}
              </section>
            );
          })}
        </div>
      )}

      <Modal open={customizing} onClose={() => setCustomizing(false)} title="Personalizar início">
        <p className="text-meta text-ink-3 mb-4">
          Escolha o que aparece na sua página inicial. Módulos sem permissão para o seu papel não
          aparecem nesta lista.
        </p>
        <ul className="space-y-2 max-h-[52vh] overflow-y-auto pr-1">
          {draft.map((id, index) => {
            const widget = available.find((item) => item.id === id);
            if (!widget) return null;
            const rowChoices = ROW_CHOICES[id];
            const toggles = TOGGLES[id] ?? [];
            const hasOptions = id === 'resumo' || Boolean(rowChoices) || toggles.length > 0;
            const isExpanded = expandedId === id;
            const opt = draftOptions[id] ?? {};
            const enabled = draftEnabled.includes(id);
            return (
              <li
                key={id}
                draggable={dragEnabled === id}
                onDragStart={(event) => {
                  setDraggingId(id);
                  event.dataTransfer.effectAllowed = 'move';
                }}
                onDragEnd={() => {
                  setDraggingId(null);
                  setDragEnabled(null);
                }}
                onDragOver={(event) => {
                  event.preventDefault();
                  dragOver(id);
                }}
                onDrop={(event) => {
                  event.preventDefault();
                  setDraggingId(null);
                  setDragEnabled(null);
                }}
                className={`rounded-md border bg-surface ${
                  draggingId === id ? 'border-accent opacity-60' : 'border-line'
                }`}
              >
                <div className="flex items-start gap-1 px-2 py-2">
                  <span
                    aria-hidden
                    title="Arraste para reordenar"
                    onMouseDown={() => setDragEnabled(id)}
                    className="mt-0.5 rounded p-1 text-ink-4 hover:text-ink cursor-grab active:cursor-grabbing"
                  >
                    <GripVertical size={16} />
                  </span>
                  <label className="flex min-w-0 flex-1 items-start gap-2 pt-0.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={enabled}
                      onChange={() => toggleDraft(id)}
                      className="mt-0.5 h-4 w-4 accent-[#145c46]"
                    />
                    <span className="min-w-0">
                      <span
                        className={`block text-body font-medium ${
                          enabled ? 'text-ink' : 'text-ink-3'
                        }`}
                      >
                        {widget.title}
                      </span>
                      <span className="block text-meta text-ink-3">{widget.description}</span>
                    </span>
                  </label>
                  <div className="flex items-center gap-0.5">
                    <button
                      type="button"
                      aria-label={`Mover ${widget.title} para cima`}
                      disabled={index === 0}
                      onClick={() => moveDraft(index, index - 1)}
                      className="h-6 w-6 grid place-items-center rounded text-ink-3 hover:text-ink disabled:opacity-25"
                    >
                      <ChevronUp size={14} />
                    </button>
                    <button
                      type="button"
                      aria-label={`Mover ${widget.title} para baixo`}
                      disabled={index === draft.length - 1}
                      onClick={() => moveDraft(index, index + 1)}
                      className="h-6 w-6 grid place-items-center rounded text-ink-3 hover:text-ink disabled:opacity-25"
                    >
                      <ChevronDown size={14} className="rotate-180" />
                    </button>
                    {hasOptions && (
                      <button
                        type="button"
                        aria-label={`Opções de ${widget.title}`}
                        aria-expanded={isExpanded}
                        onClick={() => setExpandedId(isExpanded ? null : id)}
                        className="h-6 w-6 grid place-items-center rounded text-ink-3 hover:text-ink"
                      >
                        <ChevronDown
                          size={14}
                          className={`transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                        />
                      </button>
                    )}
                  </div>
                </div>

                {isExpanded && (
                  <div className="border-t border-line px-3 py-3 space-y-2">
                    {id === 'resumo' && (
                      <>
                        <p className="micro-label">Números que aparecem</p>
                        {METRICS.map((metric) => (
                          <label
                            key={metric.id}
                            className="flex items-center gap-2 text-body text-ink-2 cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={(opt.metrics ?? ALL_METRICS).includes(metric.id)}
                              onChange={() => toggleMetric(id, metric.id)}
                              className="h-3.5 w-3.5 accent-[#145c46]"
                            />
                            {metric.label}
                          </label>
                        ))}
                      </>
                    )}
                    {rowChoices && (
                      <label className="flex items-center justify-between gap-3 text-body text-ink-2">
                        Quantos registros mostrar
                        <select
                          value={String(opt.rows ?? DEFAULT_ROWS[id] ?? rowChoices[0])}
                          onChange={(event) =>
                            patchDraftOption(id, { rows: Number(event.target.value) })
                          }
                          className="h-8 rounded-md border border-line bg-surface px-2 text-body text-ink"
                        >
                          {rowChoices.map((qty) => (
                            <option key={qty} value={qty}>
                              {qty}
                            </option>
                          ))}
                        </select>
                      </label>
                    )}
                    {toggles.map((toggle) => (
                      <label
                        key={toggle.key}
                        className="flex items-center gap-2 text-body text-ink-2 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={(opt[toggle.key] ?? true) !== false}
                          onChange={(event) =>
                            patchDraftOption(id, { [toggle.key]: event.target.checked })
                          }
                          className="h-3.5 w-3.5 accent-[#145c46]"
                        />
                        {toggle.label}
                      </label>
                    ))}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
        <div className="flex items-center justify-between gap-2 pt-4 mt-4 border-t border-line">
          <Button
            variant="ghost"
            size="sm"
            onClick={resetDraft}
          >
            Restaurar padrão
          </Button>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => setCustomizing(false)}>
              Cancelar
            </Button>
            <Button size="sm" onClick={saveCustomize}>
              Salvar
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
