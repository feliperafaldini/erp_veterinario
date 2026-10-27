import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { PageHeader } from '../../components/ui/PageHeader';
import { Spinner } from '../../components/ui/Spinner';
import { Badge } from '../../components/ui/Badge';
import { startOfDay, timeLabel } from '../../lib/agenda';
import type {
  Appointment,
  TenantAnimalItem,
  Tutor,
  UserLink,
  VeterinarianLink,
} from '../../types';

export function AdminDashboardPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [animals, setAnimals] = useState<TenantAnimalItem[]>([]);
  const [tutors, setTutors] = useState<Tutor[]>([]);
  const [users, setUsers] = useState<UserLink[]>([]);
  const [vets, setVets] = useState<VeterinarianLink[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    Promise.all([
      api.get<Appointment[]>('/appointments'),
      api.get<TenantAnimalItem[]>('/animals'),
      api.get<Tutor[]>('/tutors'),
      api.get<UserLink[]>('/users'),
      api.get<VeterinarianLink[]>('/veterinarians'),
    ])
      .then(([appointmentList, animalLinks, tutorList, userList, vetList]) => {
        setAppointments(appointmentList);
        setAnimals(animalLinks);
        setTutors(tutorList);
        setUsers(userList);
        setVets(vetList);
      })
      .catch(() => {
        // os cartões mostram o que conseguiu carregar
      })
      .finally(() => setLoading(false));
  }, []);

  const today = startOfDay(new Date());
  const todayCount = useMemo(
    () =>
      appointments.filter(
        (a) => startOfDay(new Date(a.scheduledAt)).getTime() === today.getTime()
      ).length,
    [appointments, today]
  );

  const nextAppointments = useMemo(() => {
    const now = Date.now();
    return appointments
      .filter((a) => new Date(a.scheduledAt).getTime() >= now && a.status !== 'CANCELLED')
      .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())
      .slice(0, 5);
  }, [appointments]);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }

  const metrics = [
    { label: 'Atendimentos hoje', value: todayCount },
    { label: 'Animais na clínica', value: animals.length },
    { label: 'Tutores', value: tutors.length },
    { label: 'Equipe', value: users.length },
    { label: 'Veterinários', value: vets.length },
  ];

  return (
    <div>
      <PageHeader
        title="Painel"
        subtitle="Visão geral da clínica"
        actions={<Button onClick={() => navigate('/agendamentos')}>Novo agendamento</Button>}
      />

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        {metrics.map((metric) => (
          <Card key={metric.label} className="px-4 py-3.5">
            <p className="micro-label">{metric.label}</p>
            <p className="num text-page font-semibold text-ink mt-1">{metric.value}</p>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px] gap-5 items-start">
        <Card>
          <div className="px-5 py-3 border-b border-line flex items-center justify-between">
            <h2 className="text-micro uppercase tracking-[0.06em] text-ink-4 font-medium">
              Próximos atendimentos
            </h2>
            <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard')}>
              Ver agenda
            </Button>
          </div>
          {nextAppointments.length === 0 ? (
            <p className="px-5 py-6 text-meta text-ink-3">Nada agendado.</p>
          ) : (
            <ul>
              {nextAppointments.map((appointment) => (
                <li
                  key={appointment.id}
                  className="px-5 py-3 border-t border-line first:border-t-0 flex items-center gap-4"
                >
                  <div className="w-14 shrink-0">
                    <p className="num text-body text-ink-2">{timeLabel(appointment.scheduledAt)}</p>
                    <p className="num text-micro text-ink-4">
                      {new Date(appointment.scheduledAt).toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        month: '2-digit',
                      })}
                    </p>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-body font-medium text-ink truncate">
                      {appointment.animal.name ?? appointment.animal.internalCode}
                    </p>
                    <p className="text-meta text-ink-3 truncate">
                      {appointment.tutor?.tutorIdentity?.name ?? 'Tutor não informado'}
                      {appointment.reason ? ` · ${appointment.reason}` : ''}
                    </p>
                  </div>
                  <Badge variant={appointment.status === 'IN_PROGRESS' ? 'warning' : 'default'}>
                    {appointment.status === 'IN_PROGRESS' ? 'Em atendimento' : 'Agendado'}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <div className="space-y-4">
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
              <p className="text-micro text-ink-4 mt-3">
                Prévia visual — controle de estoque ainda sem backend.
              </p>
            </div>
          </Card>

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
              <p className="text-micro text-ink-4 mt-3">
                Prévia visual — módulo financeiro ainda sem backend.
              </p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
