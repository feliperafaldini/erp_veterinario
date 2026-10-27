import { useEffect, useState } from 'react';
import { api, HttpError } from '../../lib/api';
import { useToast } from '../../context/ToastContext';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { PageHeader } from '../../components/ui/PageHeader';
import { Spinner } from '../../components/ui/Spinner';
import { ROLE_LABEL } from '../../lib/roles';
import type { UserLink, VeterinarianLink } from '../../types';

const STATUS_LABEL: Record<UserLink['status'], string> = {
  ACTIVE: 'Ativo',
  SUSPENDED: 'Suspenso',
  REVOKED: 'Revogado',
};

const STATUS_VARIANT: Record<UserLink['status'], 'success' | 'warning' | 'danger'> = {
  ACTIVE: 'success',
  SUSPENDED: 'warning',
  REVOKED: 'danger',
};

export function AdminTeamPage() {
  const [users, setUsers] = useState<UserLink[]>([]);
  const [vets, setVets] = useState<VeterinarianLink[]>([]);
  const [loading, setLoading] = useState(true);
  const { error: toastError } = useToast();

  useEffect(() => {
    Promise.all([
      api.get<UserLink[]>('/users'),
      api.get<VeterinarianLink[]>('/veterinarians'),
    ])
      .then(([userList, vetList]) => {
        setUsers(userList);
        setVets(vetList);
      })
      .catch((err: unknown) => {
        toastError(err instanceof HttpError ? err.message : 'Erro ao carregar a equipe');
      })
      .finally(() => setLoading(false));
  }, [toastError]);

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
        title="Equipe"
        subtitle={`${users.length} pessoas com acesso · ${vets.length} veterinários`}
        actions={
          <div className="flex flex-col items-end gap-1">
            <Button disabled title="Convites ainda não têm rota no backend">
              Convidar pessoa
            </Button>
            <span className="text-micro text-ink-4">
              Convite e troca de papel ainda não têm rota na API
            </span>
          </div>
        }
      />

      <Card className="mb-5">
        <div className="px-5 py-3 border-b border-line">
          <h2 className="text-micro uppercase tracking-[0.06em] text-ink-4 font-medium">
            Acesso à clínica
          </h2>
        </div>
        <table className="w-full">
          <thead className="bg-[#fbfbfc] border-b border-line">
            <tr>
              <th className="text-left px-5 py-2.5 micro-label">Pessoa</th>
              <th className="text-left px-5 py-2.5 micro-label">E-mail</th>
              <th className="text-left px-5 py-2.5 micro-label">Papel</th>
              <th className="text-left px-5 py-2.5 micro-label">Vínculo</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {users.map((user) => (
              <tr key={user.userId} className="hover:bg-[#fbfbfc]">
                <td className="px-5 py-3 text-body font-medium text-ink">{user.name}</td>
                <td className="px-5 py-3 text-body text-ink-2">{user.email}</td>
                <td className="px-5 py-3 text-body text-ink-2">
                  {user.roles.map((role) => ROLE_LABEL[role] ?? role).join(', ') || '—'}
                </td>
                <td className="px-5 py-3">
                  <Badge variant={STATUS_VARIANT[user.status]}>{STATUS_LABEL[user.status]}</Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <Card>
        <div className="px-5 py-3 border-b border-line">
          <h2 className="text-micro uppercase tracking-[0.06em] text-ink-4 font-medium">
            Veterinários da clínica
          </h2>
        </div>
        <table className="w-full">
          <thead className="bg-[#fbfbfc] border-b border-line">
            <tr>
              <th className="text-left px-5 py-2.5 micro-label">Nome</th>
              <th className="text-left px-5 py-2.5 micro-label">CRMV</th>
              <th className="text-left px-5 py-2.5 micro-label">Especialidades</th>
              <th className="text-left px-5 py-2.5 micro-label">Vínculo</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {vets.map((link) => (
              <tr key={link.id} className="hover:bg-[#fbfbfc]">
                <td className="px-5 py-3 text-body font-medium text-ink">
                  {link.veterinarian.name}
                </td>
                <td className="px-5 py-3 num text-body text-ink-2">{link.veterinarian.crmv}</td>
                <td className="px-5 py-3 text-body text-ink-2">
                  {link.veterinarian.veterinarianSpecialties
                    .map((item) => item.specialty.name)
                    .join(', ') || '—'}
                </td>
                <td className="px-5 py-3">
                  <Badge variant={link.isActive ? 'success' : 'danger'}>
                    {link.isActive ? 'Ativo' : 'Inativo'}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
