import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  PawPrint,
  Plus,
  UserPlus,
  Users,
} from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { Spinner } from '../components/ui/Spinner';
import { AnimalAvatar } from '../components/agenda/AppointmentCard';
import { addDays, ageLabel, dayTitle, isSameDay, sexLabel, startOfDay, timeLabel } from '../lib/agenda';
import {
  APPOINTMENT_STATUS_LABEL,
  APPOINTMENT_STATUS_VARIANT,
} from '../lib/appointment-status';
import { ROLE_LABEL, primaryRole } from '../lib/roles';
import type { Animal, Appointment, TenantAnimalItem, UserLink } from '../types';

/**
 * PROTÓTIPO (branch prototype/inicio-carrossel) — Início em carrossel.
 * Cada página é uma tarefa do dia; arrastar para o lado (ou ← →) troca de página.
 * Não substitui /inicio: rota separada, /inicio-carrossel, para comparação.
 */

type PageId = 'agora' | 'hoje' | 'proximos' | 'acoes' | 'clinica';

interface PageContext {
  can: (permission: string) => boolean;
  role: string | null;
}

interface PageDef {
  id: PageId;
  label: string;
  hint: string;
  available: (ctx: PageContext) => boolean;
}

const PAGES: PageDef[] = [
  {
    id: 'agora',
    label: 'Agora',
    hint: 'O próximo atendimento',
    available: ({ can }) => can('APPOINTMENT_READ'),
  },
  {
    id: 'hoje',
    label: 'Hoje',
    hint: 'O que acontece na clínica agora',
    available: ({ can }) => can('APPOINTMENT_READ'),
  },
  {
    id: 'proximos',
    label: 'Próximos',
    hint: 'Os próximos dias',
    available: ({ can }) => can('APPOINTMENT_READ'),
  },
  {
    id: 'acoes',
    label: 'Ações',
    hint: 'Cadastros e agendamento',
    available: ({ can }) =>
      can('APPOINTMENT_CREATE') || can('TUTOR_CREATE') || can('ANIMAL_CREATE'),
  },
  {
    id: 'clinica',
    label: 'Clínica',
    hint: 'Equipe e visão administrativa',
    available: ({ role }) => role === 'ADMIN',
  },
];

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

function shortDate(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

function dayLabel(date: Date): string {
  const today = startOfDay(new Date());
  if (isSameDay(date, today)) return 'Hoje';
  if (isSameDay(date, addDays(today, 1))) return 'Amanhã';
  const weekday = date.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '');
  return weekday.charAt(0).toUpperCase() + weekday.slice(1);
}

export function HomeCarouselPage() {
  const { user, roles, can } = useAuth();
  const navigate = useNavigate();
  const role = primaryRole(roles);

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [animals, setAnimals] = useState<TenantAnimalItem[]>([]);
  const [users, setUsers] = useState<UserLink[]>([]);
  const [loading, setLoading] = useState(true);

  const [index, setIndex] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [overflowing, setOverflowing] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);
  // slide (0…3n) para onde o carrossel está indo — não confundir com o índice real
  const posRef = useRef(0);

  useEffect(() => {
    Promise.all([
      api.get<Appointment[]>('/appointments').catch(() => [] as Appointment[]),
      api.get<TenantAnimalItem[]>('/animals').catch(() => [] as TenantAnimalItem[]),
      api.get<UserLink[]>('/users').catch(() => [] as UserLink[]),
    ])
      .then(([appointmentList, animalLinks, userList]) => {
        setAppointments(appointmentList);
        setAnimals(animalLinks);
        setUsers(userList);
      })
      .finally(() => setLoading(false));
  }, []);

  const pages = useMemo(
    () => PAGES.filter((page) => page.available({ can, role })),
    [can, role]
  );
  const pageCount = pages.length;
  // três cópias: o carrossel é circular (depois da última vem a primeira de novo)
  const slides = useMemo(
    () => (pageCount === 0 ? [] : Array.from({ length: pageCount * 3 }, (_, i) => i)),
    [pageCount]
  );
  const realIndex = pageCount === 0 ? 0 : ((index % pageCount) + pageCount) % pageCount;

  // índice fora do intervalo depois de trocar de papel/permissão
  useEffect(() => {
    if (index > pages.length - 1) setIndex(Math.max(0, pages.length - 1));
  }, [pages.length, index]);

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

  const now = Date.now();
  const upcomingToday = todayItems.filter(
    (a) => new Date(a.scheduledAt).getTime() >= now && a.status !== 'CANCELLED'
  );
  const nextOne = upcomingToday[0] ?? null;

  // próximo atendimento de verdade: pode ser hoje ou nos dias seguintes
  const nextAppointment = useMemo(() => {
    const nowTs = Date.now();
    return (
      appointments
        .filter(
          (appointment) =>
            (appointment.status === 'SCHEDULED' || appointment.status === 'IN_PROGRESS') &&
            new Date(appointment.scheduledAt).getTime() >= nowTs
        )
        .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())[0] ??
      null
    );
  }, [appointments]);

  const nextDays = useMemo(() => {
    const today = startOfDay(new Date());
    const limit = addDays(today, 8);
    const groups = new Map<string, Appointment[]>();
    appointments
      .filter((appointment) => {
        const when = new Date(appointment.scheduledAt);
        return (
          when.getTime() >= now &&
          appointment.status !== 'CANCELLED' &&
          when < limit &&
          !isSameDay(when, today)
        );
      })
      .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())
      .forEach((appointment) => {
        const key = startOfDay(new Date(appointment.scheduledAt)).toISOString();
        const bucket = groups.get(key);
        if (bucket) bucket.push(appointment);
        else groups.set(key, [appointment]);
      });
    return Array.from(groups.entries()).map(([key, items]) => ({
      date: new Date(key),
      items,
    }));
  }, [appointments, now]);

  const agendaPath = role === 'RECEPTIONIST' ? '/recepcao' : '/dashboard';

  const goToSlide = (slide: number) => {
    const track = trackRef.current;
    if (!track) return;
    const width = track.clientWidth || 1;
    // posRef guarda para onde estamos indo: teclas repetidas não podem ler um
    // scrollLeft no meio da animação e voltar para trás
    posRef.current = slide;
    track.scrollTo({ left: slide * width, behavior: 'smooth' });
    if (pageCount) setIndex(((slide % pageCount) + pageCount) % pageCount);
  };

  // uma página para o lado, a partir de onde o carrossel está indo (não do índice já renderizado)
  const step = (delta: number) => {
    const track = trackRef.current;
    if (!track || pageCount === 0) return;
    let base = posRef.current;
    // teclas repetidas podem empurrar a posição para fora da cópia do meio; nesse caso
    // reescreve a posição para a ocorrência equivalente do meio antes de andar — sem isso
    // o scrollTo bate no fim do container e o comando se perde
    if (base < pageCount || base >= pageCount * 2) {
      base = pageCount + (((base % pageCount) + pageCount) % pageCount);
      track.scrollLeft = base * (track.clientWidth || 1);
      posRef.current = base;
    }
    goToSlide(base + delta);
  };

  const goTo = (target: number) => {
    if (pageCount === 0) return;
    const wanted = ((target % pageCount) + pageCount) % pageCount;
    const currentReal = ((posRef.current % pageCount) + pageCount) % pageCount;
    // caminho mais curto no círculo: de "Agora" para "Ações" volta uma página em vez de três
    let delta = wanted - currentReal;
    if (delta > pageCount / 2) delta -= pageCount;
    if (delta < -pageCount / 2) delta += pageCount;
    goToSlide(posRef.current + delta);
  };

  const onScroll = () => {
    const track = trackRef.current;
    if (!track || track.clientWidth === 0 || pageCount === 0) return;
    const raw = Math.round(track.scrollLeft / track.clientWidth);
    setIndex(((raw % pageCount) + pageCount) % pageCount);
  };

  // posiciona na cópia do meio e recentraliza depois de cada transição
  useEffect(() => {
    const track = trackRef.current;
    if (!track || pageCount === 0) return;
    const width = () => track.clientWidth || 1;
    posRef.current = pageCount + realIndex;
    track.scrollLeft = posRef.current * width();

    let timer = 0;
    const settle = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        const raw = Math.round(track.scrollLeft / width());
        const normalized = ((raw % pageCount) + pageCount) % pageCount;
        const inMiddle = raw >= pageCount && raw < pageCount * 2;
        posRef.current = inMiddle ? raw : pageCount + normalized;
        if (!inMiddle) track.scrollLeft = posRef.current * width();
        setIndex(normalized);
      }, 160);
    };
    const onResize = () => {
      posRef.current = pageCount + realIndex;
      track.scrollLeft = posRef.current * width();
    };
    track.addEventListener('scroll', settle);
    window.addEventListener('resize', onResize);
    return () => {
      track.removeEventListener('scroll', settle);
      window.removeEventListener('resize', onResize);
      window.clearTimeout(timer);
    };
    // realIndex de propósito fora das deps: só o reposicionamento inicial/interação importa
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageCount, loading]);

  // arrasto horizontal com pointer events (mouse/trackpad); touch usa o pan nativo
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    let startX = 0;
    let startScroll = 0;
    let active = false;
    let moved = false;

    const down = (event: PointerEvent) => {
      if (event.pointerType === 'touch') return;
      active = true;
      moved = false;
      startX = event.clientX;
      startScroll = track.scrollLeft;
    };
    const move = (event: PointerEvent) => {
      if (!active) return;
      const dx = event.clientX - startX;
      if (!moved && Math.abs(dx) < 5) return;
      if (!moved) {
        moved = true;
        // desliga o snap de forma imperativa: setState só vale no próximo render
        // e o navegador re-snaparia cada scrollLeft atribuído no mesmo frame
        track.style.scrollSnapType = 'none';
        setDragging(true);
      }
      track.scrollLeft = startScroll - dx;
    };
    const up = () => {
      if (!active) return;
      active = false;
      if (moved) {
        track.style.scrollSnapType = '';
        setDragging(false);
        const width = Math.max(1, track.clientWidth);
        const target = Math.round(track.scrollLeft / width);
        track.scrollTo({ left: target * width, behavior: 'smooth' });
        const total = pages.length || 1;
        setIndex(((target % total) + total) % total);
        posRef.current = target;
      }
    };
    const clickGuard = (event: MouseEvent) => {
      if (!moved) return;
      event.stopPropagation();
      event.preventDefault();
      moved = false;
    };

    track.addEventListener('pointerdown', down);
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    track.addEventListener('click', clickGuard, true);
    return () => {
      track.removeEventListener('pointerdown', down);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      track.removeEventListener('click', clickGuard, true);
    };
    // precisa rodar depois que o track existe (o loading inicial renderiza o spinner)
  }, [loading, pages.length]);

  // fade no rodapé só quando a página ativa passa da altura visível
  useEffect(() => {
    const measure = () => {
      const track = trackRef.current;
      const sections = track?.querySelectorAll<HTMLElement>('section');
      const raw = track ? Math.round(track.scrollLeft / (track.clientWidth || 1)) : index;
      const active = sections?.[raw] ?? sections?.[index];
      setOverflowing(active ? active.scrollHeight - active.clientHeight > 8 : false);
    };
    measure();
    const timer = window.setTimeout(measure, 150);
    window.addEventListener('resize', measure);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('resize', measure);
    };
  }, [index, loading, pages.length]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;
      if (event.key === 'ArrowRight') step(1);
      if (event.key === 'ArrowLeft') step(-1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, pages.length]);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }

  const appointmentRow = (appointment: Appointment) => {
    const animal = animalById.get(appointment.animal.id);
    return (
      <button
        key={appointment.id}
        type="button"
        onClick={() => navigate(agendaPath)}
        className="w-full text-left px-4 py-2.5 border-t border-line first:border-t-0 flex items-center gap-3 hover:bg-[#fbfbfc] transition-colors"
      >
        <time className="num text-meta text-ink-3 w-10 shrink-0">
          {timeLabel(appointment.scheduledAt)}
        </time>
        <AnimalAvatar
          animal={animal}
          name={appointment.animal.name}
          code={appointment.animal.internalCode}
          size={32}
        />
        <p className="min-w-0 flex-1 text-body font-medium text-ink truncate">
          {appointment.animal.name ?? appointment.animal.internalCode}
        </p>
        <Badge variant={APPOINTMENT_STATUS_VARIANT[appointment.status]}>
          {APPOINTMENT_STATUS_LABEL[appointment.status]}
        </Badge>
      </button>
    );
  };

  const renderPage = (id: PageId) => {
    switch (id) {
      case 'agora': {
        if (!nextAppointment) {
          return (
            <div className="rounded-xl bg-surface shadow-lift px-8 py-10">
              <p className="micro-label">Próximo atendimento</p>
              <p className="text-page font-semibold text-ink mt-3">Nada marcado à frente</p>
              <p className="text-body text-ink-3 mt-1">
                Nenhum atendimento agendado ou em andamento a partir de agora.
              </p>
              <div className="mt-5">
                <Button
                  variant="secondary"
                  onClick={() => goTo(pages.findIndex((page) => page.id === 'proximos'))}
                >
                  Ver próximos
                </Button>
              </div>
            </div>
          );
        }

        const animal = animalById.get(nextAppointment.animal.id);
        const name = nextAppointment.animal.name ?? nextAppointment.animal.internalCode;
        const basics = [
          animal?.species?.name ?? null,
          animal ? (animal.breed?.name ?? 'SRD') : null,
          animal ? sexLabel(animal.sex) : null,
          animal ? ageLabel(animal.dateOfBirth, animal.approximateAge) : null,
        ]
          .filter((part) => part && part !== '—')
          .join(' · ');
        const when = new Date(nextAppointment.scheduledAt);
        const today = isSameDay(when, startOfDay(new Date()));

        return (
          <button
            type="button"
            onClick={() => navigate(agendaPath)}
            className="mx-auto w-full max-w-[820px] text-left rounded-xl bg-surface shadow-lift overflow-hidden transition-transform hover:-translate-y-0.5"
          >
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 p-6 sm:p-8">
              <AnimalAvatar
                animal={animal}
                name={nextAppointment.animal.name}
                code={nextAppointment.animal.internalCode}
                size={240}
              />
              <div className="min-w-0 flex-1">
                <p className="micro-label">Próximo atendimento</p>
                <p className="text-page font-semibold text-ink mt-2 truncate">{name}</p>
                {basics && <p className="text-lead text-ink-2 mt-1 truncate">{basics}</p>}

                <div className="mt-6 min-w-0">
                  <p className="micro-label">Tutor</p>
                  <p className="text-title font-medium text-ink mt-1 truncate">
                    {nextAppointment.tutor?.tutorIdentity?.name ?? 'Não informado'}
                  </p>
                </div>
              </div>

              <div className="shrink-0 sm:text-right sm:pl-4">
                <p className="micro-label">Horário</p>
                <p className="num text-page font-semibold text-ink mt-1">
                  {timeLabel(nextAppointment.scheduledAt)}
                </p>
                <p className="text-meta text-ink-3 mt-0.5">{today ? 'hoje' : dayLabel(when)}</p>
              </div>
            </div>
          </button>
        );
      }

      case 'hoje':
        return (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              type="button"
              onClick={() => navigate(agendaPath)}
              className="text-left rounded-xl bg-surface shadow-lift px-4 py-4 hover:bg-[#fcfcfd] transition-colors"
            >
              <p className="micro-label">A seguir</p>
              {nextOne ? (
                <div className="flex items-center gap-3 mt-2">
                  <AnimalAvatar
                    animal={animalById.get(nextOne.animal.id)}
                    name={nextOne.animal.name}
                    code={nextOne.animal.internalCode}
                    size={56}
                  />
                  <div className="min-w-0">
                    <p className="text-title font-medium text-ink truncate">
                      {nextOne.animal.name ?? nextOne.animal.internalCode}
                    </p>
                    <p className="num text-body text-ink-3">
                      {timeLabel(nextOne.scheduledAt)}
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-body text-ink-3 mt-2">Nada mais hoje</p>
              )}
            </button>

            <div className="rounded-xl bg-surface shadow-lift px-4 py-4">
              <p className="micro-label">Hoje</p>
              <p className="num text-page font-semibold text-ink mt-2">{todayItems.length}</p>
              <p className="text-meta text-ink-3">atendimentos</p>
            </div>

            <div className="rounded-xl bg-surface shadow-lift px-4 py-4">
              <p className="micro-label">Aguardando</p>
              <p className="num text-page font-semibold text-ink mt-2">{pending}</p>
              <p className="text-meta text-ink-3">
                {inProgress} em atendimento · {completed} concluídos
              </p>
            </div>

            <div className="md:col-span-3 rounded-xl bg-surface shadow-lift overflow-hidden">
              <div className="px-4 py-3 border-b border-line flex items-center justify-between">
                <h2 className="micro-label">Agenda de hoje</h2>
                <Button variant="ghost" size="sm" onClick={() => navigate(agendaPath)}>
                  Ver agenda
                </Button>
              </div>
              {todayItems.length === 0 ? (
                <p className="px-4 py-5 text-meta text-ink-3">Nada agendado para hoje.</p>
              ) : (
                <>
                  {todayItems.slice(0, 4).map((appointment) => appointmentRow(appointment))}
                  {todayItems.length > 4 && (
                    <button
                      type="button"
                      onClick={() => navigate(agendaPath)}
                      className="w-full px-4 py-2.5 border-t border-line text-meta text-ink-3 hover:text-ink text-left"
                    >
                      +{todayItems.length - 4} outros atendimentos
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        );

      case 'proximos':
        if (nextDays.length === 0) {
          return (
            <div className="rounded-xl bg-surface shadow-lift">
              <EmptyState
                title="Agenda livre à frente"
                description="Nenhum atendimento marcado para os próximos dias."
              />
            </div>
          );
        }
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {nextDays.slice(0, 4).map((group) => (
              <div
                key={group.date.toISOString()}
                className="rounded-xl bg-surface shadow-lift overflow-hidden"
              >
                <div className="px-4 py-3 border-b border-line flex items-baseline justify-between">
                  <h2 className="micro-label">
                    {dayLabel(group.date)} · {shortDate(group.date.toISOString())}
                  </h2>
                  <span className="num text-micro text-ink-4">{group.items.length}</span>
                </div>
                {group.items.slice(0, 3).map((appointment) => appointmentRow(appointment))}
                {group.items.length > 3 && (
                  <p className="px-4 py-2 border-t border-line text-meta text-ink-4">
                    +{group.items.length - 3} atendimentos
                  </p>
                )}
              </div>
            ))}
          </div>
        );

      case 'acoes':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {can('APPOINTMENT_CREATE') && (
                <button
                  type="button"
                  onClick={() => navigate('/agendamentos')}
                  className="text-left rounded-xl bg-surface shadow-lift px-5 py-5 hover:-translate-y-0.5 transition-all"
                >
                  <span className="h-10 w-10 rounded-md bg-accent-soft text-accent grid place-items-center">
                    <Plus size={20} strokeWidth={1.8} />
                  </span>
                  <p className="text-lead font-medium text-ink mt-3">Novo agendamento</p>
                  <p className="text-body text-ink-3">Marcar consulta ou retorno</p>
                </button>
              )}
              {can('TUTOR_CREATE') && (
                <button
                  type="button"
                  onClick={() => navigate('/tutores/novo')}
                  className="text-left rounded-xl bg-surface shadow-lift px-5 py-5 hover:-translate-y-0.5 transition-all"
                >
                  <span className="h-10 w-10 rounded-md bg-accent-soft text-accent grid place-items-center">
                    <UserPlus size={20} strokeWidth={1.8} />
                  </span>
                  <p className="text-lead font-medium text-ink mt-3">Novo tutor</p>
                  <p className="text-body text-ink-3">Cadastrar responsável</p>
                </button>
              )}
              {can('ANIMAL_CREATE') && (
                <button
                  type="button"
                  onClick={() => navigate('/animais/novo')}
                  className="text-left rounded-xl bg-surface shadow-lift px-5 py-5 hover:-translate-y-0.5 transition-all"
                >
                  <span className="h-10 w-10 rounded-md bg-accent-soft text-accent grid place-items-center">
                    <PawPrint size={20} strokeWidth={1.8} />
                  </span>
                  <p className="text-lead font-medium text-ink mt-3">Novo animal</p>
                  <p className="text-body text-ink-3">Abrir prontuário do paciente</p>
                </button>
              )}
            </div>

            <div className="rounded-xl bg-surface shadow-lift overflow-hidden">
              <div className="px-5 py-3 border-b border-line">
                <h2 className="text-micro uppercase tracking-[0.06em] text-ink-4 font-medium">
                  Ir para
                </h2>
              </div>
              <div className="divide-y divide-line">
                {[
                  { to: agendaPath, label: 'Agenda do dia', icon: ClipboardList },
                  { to: '/tutores', label: 'Tutores', icon: Users },
                  { to: '/animais', label: 'Animais', icon: PawPrint },
                  { to: '/agendamentos', label: 'Agendamentos', icon: ClipboardList },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.to}
                      type="button"
                      onClick={() => navigate(item.to)}
                      className="w-full px-5 py-3 flex items-center gap-3 text-left hover:bg-[#fbfbfc] transition-colors"
                    >
                      <Icon size={18} strokeWidth={1.6} className="text-ink-3 shrink-0" />
                      <span className="text-body text-ink flex-1">{item.label}</span>
                      <ChevronRight size={16} className="text-ink-4 shrink-0" />
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        );

      case 'clinica':
        return (
          <div className="space-y-4">
            <div className="rounded-xl bg-surface shadow-lift overflow-hidden">
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
              {users.length === 0 ? (
                <p className="px-5 py-6 text-meta text-ink-3">Sem pessoas cadastradas.</p>
              ) : (
                users.slice(0, 4).map((member) => (
                  <div
                    key={member.userId}
                    className="px-5 py-3 border-t border-line first:border-t-0 flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <p className="text-body font-medium text-ink truncate">{member.name}</p>
                      <p className="text-meta text-ink-3 truncate">{member.email}</p>
                    </div>
                    <Badge>{member.roles.map((r) => ROLE_LABEL[r] ?? r).join(', ') || '—'}</Badge>
                  </div>
                ))
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-xl bg-surface shadow-lift px-5 py-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-micro uppercase tracking-[0.06em] text-ink-4 font-medium">
                    Estoque
                  </h2>
                  <Button variant="ghost" size="sm" onClick={() => navigate('/admin/estoque')}>
                    Abrir
                  </Button>
                </div>
                <p className="num text-page font-semibold text-ink mt-2">3</p>
                <p className="text-body text-ink-3">itens abaixo do mínimo</p>
                <p className="text-micro text-ink-4 mt-2">
                  Prévia visual — estoque ainda sem backend.
                </p>
              </div>
              <div className="rounded-xl bg-surface shadow-lift px-5 py-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-micro uppercase tracking-[0.06em] text-ink-4 font-medium">
                    Custos
                  </h2>
                  <Button variant="ghost" size="sm" onClick={() => navigate('/admin/custos')}>
                    Abrir
                  </Button>
                </div>
                <p className="num text-page font-semibold text-ink mt-2">R$ 21.520</p>
                <p className="text-body text-ink-3">custo mensal estimado</p>
                <p className="text-micro text-ink-4 mt-2">
                  Prévia visual — financeiro ainda sem backend.
                </p>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-56px)] min-h-[520px]">
      <div className="flex flex-wrap items-start justify-between gap-4 mb-3">
        <div>
          <h1 className="text-page font-semibold text-ink">Início</h1>
          <p className="text-meta text-ink-3 mt-0.5">
            {greeting()}, {firstName(user?.name)} · {dayTitle(new Date())}
            {role ? ` · ${ROLE_LABEL[role]}` : ''}
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate('/inicio')}
          className="text-meta text-ink-3 hover:text-ink underline underline-offset-2"
        >
          Voltar ao início atual
        </button>
      </div>

      <div className="relative flex-1 min-h-0 flex flex-col">
        <div
          ref={trackRef}
          onScroll={onScroll}
          className={`flex-1 min-h-0 flex overflow-x-auto overflow-y-hidden ${
            dragging
              ? 'snap-none cursor-grabbing select-none'
              : 'snap-x snap-mandatory cursor-grab'
          }`}
          style={{ scrollbarWidth: 'none' }}
        >
          {slides.map((slide) => {
            const page = pages[slide % pageCount];
            if (!page) return null;
            return (
              <section
                key={slide}
                aria-label={page.label}
                className="w-full shrink-0 snap-start h-full overflow-y-auto pr-1"
              >
                {/* centraliza o bloco de cards quando a página não enche a altura */}
                <div className="min-h-full flex flex-col [justify-content:safe_center] px-2 pb-3 pt-1">
                  {renderPage(page.id)}
                </div>
              </section>
            );
          })}
          {pages.length === 0 && (
            <section className="w-full shrink-0 snap-start h-full">
              <div className="rounded-xl bg-surface shadow-lift">
                <EmptyState
                  title="Sem módulos para o seu papel"
                  description="Nenhuma página está disponível com as permissões atuais."
                />
              </div>
            </section>
          )}
        </div>
        {overflowing && (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-9 bg-gradient-to-t from-ground to-transparent" />
        )}
      </div>

      <div className="flex items-center justify-between gap-4 mt-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <button
              type="button"
              aria-label="Página anterior"
              onClick={() => step(-1)}
              className="h-7 w-7 grid place-items-center rounded-full border border-line bg-surface text-ink-2 hover:text-ink"
            >
              <ChevronLeft size={16} strokeWidth={1.8} />
            </button>
            <button
              type="button"
              aria-label="Próxima página"
              onClick={() => step(1)}
              className="h-7 w-7 grid place-items-center rounded-full border border-line bg-surface text-ink-2 hover:text-ink"
            >
              <ChevronRight size={16} strokeWidth={1.8} />
            </button>
          </div>
          <div className="flex items-center gap-2">
            {pages.map((page, i) => (
              <button
                key={page.id}
                type="button"
                onClick={() => goTo(i)}
                aria-current={i === realIndex ? 'true' : undefined}
                className={`h-1.5 rounded-full transition-all ${
                  i === realIndex ? 'w-7 bg-accent' : 'w-2 bg-line-strong hover:bg-ink-4'
                }`}
                aria-label={`Ir para ${page.label}`}
              />
            ))}
          </div>
        </div>
        <p className="text-meta text-ink-3">
          {pages[realIndex] ? (
            <>
              <span className="text-ink font-medium">{pages[realIndex].label}</span> ·{' '}
              {pages[realIndex].hint}
            </>
          ) : null}
        </p>
        <p className="text-micro text-ink-4 hidden md:block">Arraste ou use ← →</p>
      </div>
    </div>
  );
}
