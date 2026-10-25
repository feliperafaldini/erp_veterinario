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
import type { TenantAnimalItem } from '../types';

const sexLabel: Record<string, string> = {
  MALE: 'Macho',
  FEMALE: 'Fêmea',
  UNKNOWN: 'Indefinido',
};

export function AnimalsPage() {
  // GET /animals devolve vínculos da clínica (TenantAnimal) com o Animal aninhado.
  const [links, setLinks] = useState<TenantAnimalItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { success, error: toastError } = useToast();
  const navigate = useNavigate();

  const fetchData = useCallback(() => {
    api
      .get<TenantAnimalItem[]>('/animals')
      .then(setLinks)
      .catch((err: unknown) => {
        toastError(err instanceof HttpError ? err.message : 'Erro ao carregar animais');
      })
      .finally(() => setLoading(false));
  }, [toastError]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleDeactivate = async (animalId: string) => {
    if (!confirm('Deseja desativar este animal?')) return;
    try {
      // a rota usa o id do Animal, não o id do vínculo
      await api.patch(`/animals/${animalId}/deactivate`);
      success('Animal desativado');
      fetchData();
    } catch (err) {
      toastError(err instanceof HttpError ? err.message : 'Erro ao desativar');
    }
  };

  return (
    <div>
      <PageHeader
        title="Animais"
        subtitle={`${links.length} animal(is) cadastrado(s)`}
        actions={<Button onClick={() => navigate('/animais/novo')}>Novo Animal</Button>}
      />
      {loading ? (
        <div className="flex justify-center py-12">
          <Spinner size="lg" />
        </div>
      ) : links.length === 0 ? (
        <Card>
          <EmptyState
            title="Nenhum animal cadastrado"
            description="Comece cadastrando o primeiro animal."
            action={<Button onClick={() => navigate('/animais/novo')}>Cadastrar Animal</Button>}
          />
        </Card>
      ) : (
        <Card>
          <CardBody className="p-0">
            <table className="w-full">
              <thead className="bg-[#fbfbfc] border-b border-line">
                <tr>
                  <th className="text-left px-4 py-3 text-meta font-medium text-ink-3 uppercase">Nome</th>
                  <th className="text-left px-4 py-3 text-meta font-medium text-ink-3 uppercase">Código</th>
                  <th className="text-left px-4 py-3 text-meta font-medium text-ink-3 uppercase">Espécie</th>
                  <th className="text-left px-4 py-3 text-meta font-medium text-ink-3 uppercase">Raça</th>
                  <th className="text-left px-4 py-3 text-meta font-medium text-ink-3 uppercase">Sexo</th>
                  <th className="text-right px-4 py-3 text-meta font-medium text-ink-3 uppercase">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {links.map((item) => {
                  const animalId = item.animal.id;
                  return (
                    <tr key={item.id} className="hover:bg-[#fbfbfc]">
                      <td className="px-4 py-3">
                        <button
                          onClick={() => navigate(`/animais/${animalId}`)}
                          className="font-medium text-accent-hover hover:underline"
                        >
                          {item.animal.name || 'Sem nome'}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-meta text-ink-3 font-mono">{item.animal.internalCode}</td>
                      <td className="px-4 py-3 text-body text-ink-2">
                        {item.animal.species?.name || '—'}
                      </td>
                      <td className="px-4 py-3 text-body text-ink-2">{item.animal.breed?.name || '—'}</td>
                      <td className="px-4 py-3 text-body text-ink-2">
                        <Badge>{sexLabel[item.animal.sex] || item.animal.sex}</Badge>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/animais/${animalId}`)}
                        >
                          Detalhes
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/animais/${animalId}/editar`)}
                        >
                          Editar
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeactivate(animalId)}
                          className="text-red-600 hover:text-red-700"
                        >
                          Desativar
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </CardBody>
        </Card>
      )}
    </div>
  );
}
