import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, HttpError } from '../lib/api';
import { useToast } from '../context/ToastContext';
import { Button } from '../components/ui/Button';
import { Card, CardBody } from '../components/ui/Card';
import { PageHeader } from '../components/ui/PageHeader';
import { Spinner } from '../components/ui/Spinner';
import { EmptyState } from '../components/ui/EmptyState';
import { Badge } from '../components/ui/Badge';
import type { Tutor } from '../types';

export function TutorsPage() {
  const [tutors, setTutors] = useState<Tutor[]>([]);
  const [loading, setLoading] = useState(true);
  const { success, error: toastError } = useToast();
  const navigate = useNavigate();

  const fetchTutors = useCallback(() => {
    api
      .get<Tutor[]>('/tutors')
      .then(setTutors)
      .catch((err: unknown) => {
        const msg = err instanceof HttpError ? err.message : 'Erro ao carregar tutores';
        toastError(msg);
      })
      .finally(() => setLoading(false));
  }, [toastError]);

  useEffect(() => {
    fetchTutors();
  }, [fetchTutors]);

  const handleDeactivate = async (id: string) => {
    if (!confirm('Deseja desativar este tutor?')) return;
    try {
      await api.patch(`/tutors/${id}/deactivate`);
      success('Tutor desativado');
      fetchTutors();
    } catch (err) {
      toastError(err instanceof HttpError ? err.message : 'Erro ao desativar');
    }
  };

  return (
    <div>
      <PageHeader
        title="Tutores"
        subtitle={`${tutors.length} tutor(es) cadastrado(s)`}
        actions={
          <Button onClick={() => navigate('/tutores/novo')}>Novo Tutor</Button>
        }
      />
      {loading ? (
        <div className="flex justify-center py-12">
          <Spinner size="lg" />
        </div>
      ) : tutors.length === 0 ? (
        <Card>
          <EmptyState
            title="Nenhum tutor cadastrado"
            description="Comece cadastrando o primeiro tutor."
            action={<Button onClick={() => navigate('/tutores/novo')}>Cadastrar Tutor</Button>}
          />
        </Card>
      ) : (
        <Card>
          <CardBody className="p-0">
            <table className="w-full">
              <thead className="bg-[#fbfbfc] border-b border-line">
                <tr>
                  <th className="text-left px-4 py-3 text-meta font-medium text-ink-3 uppercase">Nome</th>
                  <th className="text-left px-4 py-3 text-meta font-medium text-ink-3 uppercase">Documento</th>
                  <th className="text-left px-4 py-3 text-meta font-medium text-ink-3 uppercase">Email</th>
                  <th className="text-right px-4 py-3 text-meta font-medium text-ink-3 uppercase">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {tutors.map((tutor) => (
                  <tr key={tutor.id} className="hover:bg-[#fbfbfc]">
                    <td className="px-4 py-3">
                      <span className="font-medium text-ink">
                        {tutor.tutorIdentity?.name || 'Sem nome'}
                      </span>
                      {!tutor.isActive && (
                        <Badge variant="warning" className="ml-2">
                          Inativo
                        </Badge>
                      )}
                    </td>
                    <td className="px-4 py-3 text-body text-ink-2">
                      <Badge>{tutor.tutorIdentity?.documentType || '—'}</Badge>{' '}
                      {tutor.tutorIdentity?.documentNumber || '—'}
                    </td>
                    <td className="px-4 py-3 text-body text-ink-2">{tutor.email || '—'}</td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate(`/tutores/${tutor.id}/editar`)}
                      >
                        Editar
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeactivate(tutor.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        Desativar
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardBody>
        </Card>
      )}
    </div>
  );
}
