import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api, HttpError } from '../lib/api';
import { useToast } from '../context/ToastContext';
import { Button } from '../components/ui/Button';
import { Card, CardBody, CardHeader } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Spinner } from '../components/ui/Spinner';
import { EmptyState } from '../components/ui/EmptyState';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Textarea } from '../components/ui/Textarea';
import { Modal } from '../components/ui/Modal';
import type {
  AllergyRecord,
  Animal,
  AnimalTutor,
  CatalogItem,
  Consultation,
  MedicationRecord,
  TenantAnimalItem,
  Tutor,
  VaccinationRecord,
  WeightRecord,
} from '../types';

type Tab = 'overview' | 'consultas' | 'peso' | 'vacinas' | 'alergias' | 'medicacoes' | 'tutores';

const tabs: { id: Tab; label: string }[] = [
  { id: 'overview', label: 'Visão Geral' },
  { id: 'consultas', label: 'Consultas' },
  { id: 'peso', label: 'Peso' },
  { id: 'vacinas', label: 'Vacinas' },
  { id: 'alergias', label: 'Alergias' },
  { id: 'medicacoes', label: 'Medicações' },
  { id: 'tutores', label: 'Tutores' },
];

const sexLabel: Record<string, string> = { MALE: 'Macho', FEMALE: 'Fêmea', UNKNOWN: 'Indefinido' };
const sizeLabel: Record<string, string> = { SMALL: 'Pequeno', MEDIUM: 'Médio', LARGE: 'Grande' };
const statusLabel: Record<string, string> = { ACTIVE: 'Ativo', INACTIVE: 'Inativo', DECEASED: 'Falecido' };

function formatDate(value?: string | null) {
  if (!value) return '—';
  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (dateOnly) return `${dateOnly[3]}/${dateOnly[2]}/${dateOnly[1]}`;
  // Datas sem hora chegam como meia-noite UTC; formatar no fuso local
  // recuaria um dia — exibimos os componentes UTC nesse caso.
  const utcMidnight = /^(\d{4})-(\d{2})-(\d{2})T00:00:00(?:\.000)?Z$/.exec(value);
  if (utcMidnight) return `${utcMidnight[3]}/${utcMidnight[2]}/${utcMidnight[1]}`;
  return new Date(value).toLocaleDateString('pt-BR');
}

function formatDateTime(value?: string | null) {
  if (!value) return '—';
  return new Date(value).toLocaleString('pt-BR');
}

/** Remove strings vazias: a API roda ValidationPipe com forbidNonWhitelisted. */
function compact<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const out: Record<string, unknown> = {};
  Object.entries(obj).forEach(([k, v]) => {
    if (v === undefined || v === null || v === '') return;
    out[k] = v;
  });
  return out as Partial<T>;
}

export function AnimalDetailPage() {
  const { id } = useParams();
  const [link, setLink] = useState<TenantAnimalItem | null>(null);
  const [tab, setTab] = useState<Tab>('overview');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { error: toastError } = useToast();

  const fetchAnimal = useCallback(() => {
    // GET /animals/:id devolve o vínculo com a clínica; o Animal vem aninhado.
    api
      .get<TenantAnimalItem>(`/animals/${id}`)
      .then(setLink)
      .catch((err: unknown) => {
        toastError(err instanceof HttpError ? err.message : 'Erro ao carregar animal');
      })
      .finally(() => setLoading(false));
  }, [id, toastError]);

  useEffect(() => {
    fetchAnimal();
  }, [fetchAnimal]);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!link) {
    return <div className="text-ink-2">Animal não encontrado.</div>;
  }

  const animal = link.animal;

  return (
    <div>
      <div className="flex items-center gap-4 mb-6 flex-wrap">
        <button onClick={() => navigate('/animais')} className="text-ink-3 hover:text-ink-2">
          ← Voltar
        </button>
        <h1 className="text-page font-semibold text-ink">{animal.name || 'Sem nome'}</h1>
        <Badge>{sexLabel[animal.sex] || animal.sex}</Badge>
        <Badge variant={link.status === 'ACTIVE' ? 'success' : 'warning'}>
          {statusLabel[link.status] || link.status}
        </Badge>
        <span className="text-meta font-mono text-ink-3">{animal.internalCode}</span>
        <div className="ml-auto">
          <Button variant="secondary" onClick={() => navigate(`/animais/${animal.id}/editar`)}>
            Editar
          </Button>
        </div>
      </div>

      <div className="border-b border-line mb-6">
        <nav className="flex gap-1 -mb-px overflow-x-auto">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-4 py-2 text-body font-medium border-b-2 whitespace-nowrap ${
                tab === t.id
                  ? 'border-primary-600 text-accent-hover'
                  : 'border-transparent text-ink-3 hover:text-ink-2'
              }`}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </div>

      {tab === 'overview' && <OverviewTab animal={animal} link={link} />}
      {tab === 'consultas' && <ConsultationsTab animalId={animal.id} />}
      {tab === 'peso' && <WeightTab animalId={animal.id} />}
      {tab === 'vacinas' && <VaccinationsTab animalId={animal.id} />}
      {tab === 'alergias' && <AllergiesTab animalId={animal.id} />}
      {tab === 'medicacoes' && <MedicationsTab animalId={animal.id} />}
      {tab === 'tutores' && <TutorsTab animalId={animal.id} />}
    </div>
  );
}

function OverviewTab({ animal, link }: { animal: Animal; link: TenantAnimalItem }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Card>
        <CardHeader>
          <h3 className="font-semibold text-ink">Dados do Animal</h3>
        </CardHeader>
        <CardBody>
          <dl className="space-y-2 text-body">
            <DetailRow label="Código interno" value={animal.internalCode} />
            <DetailRow label="Espécie" value={animal.species?.name || '—'} />
            <DetailRow label="Raça" value={animal.breed?.name || '—'} />
            <DetailRow label="Sexo" value={sexLabel[animal.sex] || animal.sex} />
            <DetailRow label="Porte" value={animal.size ? sizeLabel[animal.size] || animal.size : '—'} />
            <DetailRow label="Cor" value={animal.color || '—'} />
            <DetailRow label="Nascimento" value={formatDate(animal.dateOfBirth)} />
            <DetailRow label="Idade aproximada" value={animal.approximateAge || '—'} />
            <DetailRow label="Microchip" value={animal.microchip || '—'} />
          </dl>
        </CardBody>
      </Card>
      <Card>
        <CardHeader>
          <h3 className="font-semibold text-ink">Vínculo com a Clínica</h3>
        </CardHeader>
        <CardBody>
          <dl className="space-y-2 text-body">
            <DetailRow label="Status do animal" value={statusLabel[animal.status] || animal.status} />
            <DetailRow label="Vínculo" value={statusLabel[link.status] || link.status} />
            <DetailRow label="Castrado" value={animal.isCastrated ? 'Sim' : 'Não'} />
            <DetailRow label="Data da castração" value={formatDate(animal.castrationDate)} />
            <DetailRow label="Cadastrado em" value={formatDateTime(link.createdAt)} />
            <DetailRow label="Notas do vínculo" value={link.notes || '—'} />
            <DetailRow label="Observações" value={animal.notes || '—'} />
          </dl>
        </CardBody>
      </Card>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-ink-3">{label}</dt>
      <dd className="font-medium text-ink text-right break-words">{value}</dd>
    </div>
  );
}

function TabShell({
  title,
  addLabel,
  onAdd,
  children,
}: {
  title: string;
  addLabel: string;
  onAdd: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lead font-semibold text-ink">{title}</h2>
        <Button onClick={onAdd}>{addLabel}</Button>
      </div>
      {children}
    </div>
  );
}

function Table({ head, children }: { head: string[]; children: React.ReactNode }) {
  return (
    <Card>
      <CardBody className="p-0 overflow-x-auto">
        <table className="w-full">
          <thead className="bg-[#fbfbfc] border-b border-line">
            <tr>
              {head.map((h) => (
                <th
                  key={h}
                  className="text-left px-4 py-3 text-meta font-medium text-ink-3 uppercase whitespace-nowrap"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">{children}</tbody>
        </table>
      </CardBody>
    </Card>
  );
}

// ===== Consultas =====
function ConsultationsTab({ animalId }: { animalId: string }) {
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [loading, setLoading] = useState(true);
  const { error: toastError } = useToast();

  useEffect(() => {
    // GET /consultations não aceita filtro por animal: buscamos todas e
    // filtramos no cliente pelo animal.id.
    api
      .get<Consultation[]>('/consultations')
      .then((all) => setConsultations(all.filter((c) => c.animal?.id === animalId)))
      .catch((err: unknown) => {
        toastError(err instanceof HttpError ? err.message : 'Erro ao carregar consultas');
      })
      .finally(() => setLoading(false));
  }, [animalId, toastError]);

  if (loading) return <Spinner />;

  if (consultations.length === 0) {
    return (
      <Card>
        <EmptyState title="Nenhuma consulta registrada" />
      </Card>
    );
  }

  return (
    <Table head={['Início', 'Veterinário', 'Tutor', 'Status', 'Queixa principal']}>
      {consultations.map((c) => (
        <tr key={c.id} className="hover:bg-[#fbfbfc]">
          <td className="px-4 py-3 text-body whitespace-nowrap">{formatDateTime(c.startedAt)}</td>
          <td className="px-4 py-3 text-body">{c.veterinarian?.veterinarian?.name || '—'}</td>
          <td className="px-4 py-3 text-body">{c.tutor?.tutorIdentity?.name || '—'}</td>
          <td className="px-4 py-3">
            <Badge variant={c.status === 'COMPLETED' ? 'success' : c.status === 'OPEN' ? 'info' : 'default'}>
              {c.status}
            </Badge>
          </td>
          <td className="px-4 py-3 text-body text-ink-2 max-w-md">{c.chiefComplaint || '—'}</td>
        </tr>
      ))}
    </Table>
  );
}

// ===== Peso =====
function WeightTab({ animalId }: { animalId: string }) {
  const [records, setRecords] = useState<WeightRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const { error: toastError } = useToast();

  const fetchRecords = useCallback(() => {
    setLoading(true);
    api
      .get<WeightRecord[]>(`/animals/${animalId}/weight`)
      .then(setRecords)
      .catch((err: unknown) => {
        toastError(err instanceof HttpError ? err.message : 'Erro ao carregar pesos');
      })
      .finally(() => setLoading(false));
  }, [animalId, toastError]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  return (
    <TabShell title="Histórico de Peso" addLabel="Registrar Peso" onAdd={() => setOpen(true)}>
      {loading ? (
        <Spinner />
      ) : records.length === 0 ? (
        <Card>
          <EmptyState title="Nenhum registro de peso" />
        </Card>
      ) : (
        <Table head={['Data', 'Peso (kg)', 'Notas']}>
          {records.map((r) => (
            <tr key={r.id} className="hover:bg-[#fbfbfc]">
              <td className="px-4 py-3 text-body whitespace-nowrap">{formatDate(r.recordedAt)}</td>
              <td className="px-4 py-3 font-medium">{r.weight}</td>
              <td className="px-4 py-3 text-body text-ink-2">{r.notes || '—'}</td>
            </tr>
          ))}
        </Table>
      )}
      <Modal open={open} onClose={() => setOpen(false)} title="Registrar peso" size="sm">
        {open && (
          <WeightForm
            animalId={animalId}
            onDone={() => {
              setOpen(false);
              fetchRecords();
            }}
            onCancel={() => setOpen(false)}
          />
        )}
      </Modal>
    </TabShell>
  );
}

function WeightForm({
  animalId,
  onDone,
  onCancel,
}: {
  animalId: string;
  onDone: () => void;
  onCancel: () => void;
}) {
  const [weight, setWeight] = useState('');
  const [recordedAt, setRecordedAt] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const { success, error: toastError } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const value = Number(weight.replace(',', '.'));
    if (!Number.isFinite(value) || value <= 0) {
      toastError('Informe um peso válido (maior que zero).');
      return;
    }
    setSaving(true);
    try {
      await api.post(
        `/animals/${animalId}/weight`,
        compact({ weight: value, recordedAt, notes })
      );
      success('Peso registrado');
      onDone();
    } catch (err) {
      toastError(err instanceof HttpError ? err.message : 'Erro ao salvar peso');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        label="Peso (kg)"
        type="number"
        step="0.01"
        min="0.01"
        value={weight}
        onChange={(e) => setWeight(e.target.value)}
        required
      />
      <Input
        label="Data da medição"
        type="date"
        value={recordedAt}
        onChange={(e) => setRecordedAt(e.target.value)}
      />
      <Textarea label="Notas" value={notes} onChange={(e) => setNotes(e.target.value)} />
      <div className="flex justify-end gap-3">
        <Button variant="secondary" type="button" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" disabled={saving}>
          {saving ? 'Salvando...' : 'Salvar'}
        </Button>
      </div>
    </form>
  );
}

// ===== Vacinas =====
function VaccinationsTab({ animalId }: { animalId: string }) {
  const [records, setRecords] = useState<VaccinationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const { error: toastError } = useToast();

  const fetchRecords = useCallback(() => {
    setLoading(true);
    api
      .get<VaccinationRecord[]>(`/animals/${animalId}/vaccinations`)
      .then(setRecords)
      .catch((err: unknown) => {
        toastError(err instanceof HttpError ? err.message : 'Erro ao carregar vacinas');
      })
      .finally(() => setLoading(false));
  }, [animalId, toastError]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  return (
    <TabShell title="Vacinas" addLabel="Registrar Vacina" onAdd={() => setOpen(true)}>
      {loading ? (
        <Spinner />
      ) : records.length === 0 ? (
        <Card>
          <EmptyState title="Nenhuma vacina registrada" />
        </Card>
      ) : (
        <Table head={['Vacina', 'Aplicação', 'Lote', 'Próxima dose', 'Notas']}>
          {records.map((r) => (
            <tr key={r.id} className="hover:bg-[#fbfbfc]">
              <td className="px-4 py-3 text-body font-medium">{r.vaccine?.name || '—'}</td>
              <td className="px-4 py-3 text-body whitespace-nowrap">{formatDate(r.applicationDate)}</td>
              <td className="px-4 py-3 text-body">{r.lotNumber || '—'}</td>
              <td className="px-4 py-3 text-body whitespace-nowrap">{formatDate(r.nextDoseDate)}</td>
              <td className="px-4 py-3 text-body text-ink-2">{r.notes || '—'}</td>
            </tr>
          ))}
        </Table>
      )}
      <Modal open={open} onClose={() => setOpen(false)} title="Registrar vacina">
        {open && (
          <VaccinationForm
            animalId={animalId}
            onDone={() => {
              setOpen(false);
              fetchRecords();
            }}
            onCancel={() => setOpen(false)}
          />
        )}
      </Modal>
    </TabShell>
  );
}

function VaccinationForm({
  animalId,
  onDone,
  onCancel,
}: {
  animalId: string;
  onDone: () => void;
  onCancel: () => void;
}) {
  const [vaccines, setVaccines] = useState<CatalogItem[]>([]);
  const [vaccineId, setVaccineId] = useState('');
  const [applicationDate, setApplicationDate] = useState('');
  const [lotNumber, setLotNumber] = useState('');
  const [nextDoseDate, setNextDoseDate] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const { success, error: toastError } = useToast();

  useEffect(() => {
    api
      .get<CatalogItem[]>('/vaccines')
      .then(setVaccines)
      .catch(() => toastError('Erro ao carregar catálogo de vacinas'));
  }, [toastError]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post(
        `/animals/${animalId}/vaccinations`,
        compact({ vaccineId, applicationDate, lotNumber, nextDoseDate, notes })
      );
      success('Vacina registrada');
      onDone();
    } catch (err) {
      toastError(err instanceof HttpError ? err.message : 'Erro ao salvar vacina');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Select
        label="Vacina"
        value={vaccineId}
        onChange={(e) => setVaccineId(e.target.value)}
        options={vaccines.map((v) => ({ value: v.id, label: v.name }))}
        placeholder="Selecione..."
        required
      />
      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Aplicação"
          type="date"
          value={applicationDate}
          onChange={(e) => setApplicationDate(e.target.value)}
          required
        />
        <Input
          label="Próxima dose"
          type="date"
          value={nextDoseDate}
          onChange={(e) => setNextDoseDate(e.target.value)}
        />
      </div>
      <Input label="Lote" value={lotNumber} onChange={(e) => setLotNumber(e.target.value)} />
      <Textarea label="Notas" value={notes} onChange={(e) => setNotes(e.target.value)} />
      <div className="flex justify-end gap-3">
        <Button variant="secondary" type="button" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" disabled={saving}>
          {saving ? 'Salvando...' : 'Salvar'}
        </Button>
      </div>
    </form>
  );
}

// ===== Alergias =====
function AllergiesTab({ animalId }: { animalId: string }) {
  const [records, setRecords] = useState<AllergyRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const { error: toastError } = useToast();

  const fetchRecords = useCallback(() => {
    setLoading(true);
    api
      .get<AllergyRecord[]>(`/animals/${animalId}/allergies`)
      .then(setRecords)
      .catch((err: unknown) => {
        toastError(err instanceof HttpError ? err.message : 'Erro ao carregar alergias');
      })
      .finally(() => setLoading(false));
  }, [animalId, toastError]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  return (
    <TabShell title="Alergias" addLabel="Registrar Alergia" onAdd={() => setOpen(true)}>
      {loading ? (
        <Spinner />
      ) : records.length === 0 ? (
        <Card>
          <EmptyState title="Nenhuma alergia registrada" />
        </Card>
      ) : (
        <Table head={['Alergia', 'Severidade', 'Descrição', 'Registrada em']}>
          {records.map((r) => (
            <tr key={r.id} className="hover:bg-[#fbfbfc]">
              <td className="px-4 py-3 text-body font-medium">{r.allergy?.name || '—'}</td>
              <td className="px-4 py-3 text-body">{r.severity || '—'}</td>
              <td className="px-4 py-3 text-body text-ink-2">{r.description || '—'}</td>
              <td className="px-4 py-3 text-body whitespace-nowrap">{formatDate(r.registeredAt)}</td>
            </tr>
          ))}
        </Table>
      )}
      <Modal open={open} onClose={() => setOpen(false)} title="Registrar alergia">
        {open && (
          <AllergyForm
            animalId={animalId}
            onDone={() => {
              setOpen(false);
              fetchRecords();
            }}
            onCancel={() => setOpen(false)}
          />
        )}
      </Modal>
    </TabShell>
  );
}

function AllergyForm({
  animalId,
  onDone,
  onCancel,
}: {
  animalId: string;
  onDone: () => void;
  onCancel: () => void;
}) {
  const [allergies, setAllergies] = useState<CatalogItem[]>([]);
  const [allergyId, setAllergyId] = useState('');
  const [severity, setSeverity] = useState('');
  const [description, setDescription] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const { success, error: toastError } = useToast();

  useEffect(() => {
    api
      .get<CatalogItem[]>('/allergies')
      .then(setAllergies)
      .catch(() => toastError('Erro ao carregar catálogo de alergias'));
  }, [toastError]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post(
        `/animals/${animalId}/allergies`,
        compact({ allergyId, severity, description, notes })
      );
      success('Alergia registrada');
      onDone();
    } catch (err) {
      toastError(err instanceof HttpError ? err.message : 'Erro ao salvar alergia');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Select
        label="Alergia"
        value={allergyId}
        onChange={(e) => setAllergyId(e.target.value)}
        options={allergies.map((a) => ({ value: a.id, label: a.name }))}
        placeholder="Selecione..."
        required
      />
      <Select
        label="Severidade"
        value={severity}
        onChange={(e) => setSeverity(e.target.value)}
        options={[
          { value: 'LEVE', label: 'Leve' },
          { value: 'MODERADA', label: 'Moderada' },
          { value: 'GRAVE', label: 'Grave' },
        ]}
        placeholder="Selecione..."
      />
      <Textarea
        label="Descrição"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />
      <Textarea label="Notas" value={notes} onChange={(e) => setNotes(e.target.value)} />
      <div className="flex justify-end gap-3">
        <Button variant="secondary" type="button" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" disabled={saving}>
          {saving ? 'Salvando...' : 'Salvar'}
        </Button>
      </div>
    </form>
  );
}

// ===== Medicações =====
function MedicationsTab({ animalId }: { animalId: string }) {
  const [records, setRecords] = useState<MedicationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const { error: toastError } = useToast();

  const fetchRecords = useCallback(() => {
    setLoading(true);
    api
      .get<MedicationRecord[]>(`/animals/${animalId}/medications`)
      .then(setRecords)
      .catch((err: unknown) => {
        toastError(err instanceof HttpError ? err.message : 'Erro ao carregar medicações');
      })
      .finally(() => setLoading(false));
  }, [animalId, toastError]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  return (
    <TabShell title="Medicações" addLabel="Registrar Medicação" onAdd={() => setOpen(true)}>
      {loading ? (
        <Spinner />
      ) : records.length === 0 ? (
        <Card>
          <EmptyState title="Nenhuma medicação registrada" />
        </Card>
      ) : (
        <Table head={['Medicação', 'Dosagem', 'Frequência', 'Via', 'Início', 'Fim']}>
          {records.map((r) => (
            <tr key={r.id} className="hover:bg-[#fbfbfc]">
              <td className="px-4 py-3 text-body font-medium">{r.medication?.name || '—'}</td>
              <td className="px-4 py-3 text-body">{r.dosage}</td>
              <td className="px-4 py-3 text-body">{r.frequency}</td>
              <td className="px-4 py-3 text-body">{r.route || '—'}</td>
              <td className="px-4 py-3 text-body whitespace-nowrap">{formatDate(r.startDate)}</td>
              <td className="px-4 py-3 text-body whitespace-nowrap">{formatDate(r.endDate)}</td>
            </tr>
          ))}
        </Table>
      )}
      <Modal open={open} onClose={() => setOpen(false)} title="Registrar medicação">
        {open && (
          <MedicationForm
            animalId={animalId}
            onDone={() => {
              setOpen(false);
              fetchRecords();
            }}
            onCancel={() => setOpen(false)}
          />
        )}
      </Modal>
    </TabShell>
  );
}

function MedicationForm({
  animalId,
  onDone,
  onCancel,
}: {
  animalId: string;
  onDone: () => void;
  onCancel: () => void;
}) {
  const [medications, setMedications] = useState<CatalogItem[]>([]);
  const [medicationId, setMedicationId] = useState('');
  const [dosage, setDosage] = useState('');
  const [frequency, setFrequency] = useState('');
  const [route, setRoute] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const { success, error: toastError } = useToast();

  useEffect(() => {
    api
      .get<CatalogItem[]>('/medications')
      .then(setMedications)
      .catch(() => toastError('Erro ao carregar catálogo de medicações'));
  }, [toastError]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post(
        `/animals/${animalId}/medications`,
        compact({ medicationId, dosage, frequency, route, startDate, endDate, notes })
      );
      success('Medicação registrada');
      onDone();
    } catch (err) {
      toastError(err instanceof HttpError ? err.message : 'Erro ao salvar medicação');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Select
        label="Medicação"
        value={medicationId}
        onChange={(e) => setMedicationId(e.target.value)}
        options={medications.map((m) => ({ value: m.id, label: m.name }))}
        placeholder="Selecione..."
        required
      />
      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Dosagem"
          value={dosage}
          onChange={(e) => setDosage(e.target.value)}
          placeholder="ex.: 250 mg"
          required
        />
        <Input
          label="Frequência"
          value={frequency}
          onChange={(e) => setFrequency(e.target.value)}
          placeholder="ex.: a cada 12 horas"
          required
        />
      </div>
      <div className="grid grid-cols-3 gap-4">
        <Input label="Via" value={route} onChange={(e) => setRoute(e.target.value)} />
        <Input
          label="Início"
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          required
        />
        <Input label="Fim" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
      </div>
      <Textarea label="Notas" value={notes} onChange={(e) => setNotes(e.target.value)} />
      <div className="flex justify-end gap-3">
        <Button variant="secondary" type="button" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" disabled={saving}>
          {saving ? 'Salvando...' : 'Salvar'}
        </Button>
      </div>
    </form>
  );
}

// ===== Tutores =====
function TutorsTab({ animalId }: { animalId: string }) {
  const [links, setLinks] = useState<AnimalTutor[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const { error: toastError } = useToast();

  const fetchRecords = useCallback(() => {
    setLoading(true);
    api
      .get<AnimalTutor[]>(`/animals/${animalId}/tutors`)
      .then(setLinks)
      .catch((err: unknown) => {
        toastError(err instanceof HttpError ? err.message : 'Erro ao carregar tutores');
      })
      .finally(() => setLoading(false));
  }, [animalId, toastError]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  return (
    <TabShell title="Tutores" addLabel="Vincular Tutor" onAdd={() => setOpen(true)}>
      {loading ? (
        <Spinner />
      ) : links.length === 0 ? (
        <Card>
          <EmptyState title="Nenhum tutor vinculado" />
        </Card>
      ) : (
        <Table head={['Tutor', 'Documento', 'Email', 'Desde', 'Situação']}>
          {links.map((link) => (
            <tr key={link.id} className="hover:bg-[#fbfbfc]">
              <td className="px-4 py-3 font-medium">{link.tutor?.tutorIdentity?.name || '—'}</td>
              <td className="px-4 py-3 text-body text-ink-2">
                {link.tutor?.tutorIdentity
                  ? `${link.tutor.tutorIdentity.documentType} ${link.tutor.tutorIdentity.documentNumber}`
                  : '—'}
              </td>
              <td className="px-4 py-3 text-body text-ink-2">{link.tutor?.email || '—'}</td>
              <td className="px-4 py-3 text-body whitespace-nowrap">{formatDate(link.startedAt)}</td>
              <td className="px-4 py-3">
                <Badge variant={link.isActive ? 'success' : 'default'}>
                  {link.isActive ? 'Ativo' : 'Encerrado'}
                </Badge>
              </td>
            </tr>
          ))}
        </Table>
      )}
      <Modal open={open} onClose={() => setOpen(false)} title="Vincular tutor">
        {open && (
          <TutorLinkForm
            animalId={animalId}
            onDone={() => {
              setOpen(false);
              fetchRecords();
            }}
            onCancel={() => setOpen(false)}
          />
        )}
      </Modal>
    </TabShell>
  );
}

function TutorLinkForm({
  animalId,
  onDone,
  onCancel,
}: {
  animalId: string;
  onDone: () => void;
  onCancel: () => void;
}) {
  const [tutors, setTutors] = useState<Tutor[]>([]);
  const [tutorId, setTutorId] = useState('');
  const [startedAt, setStartedAt] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const { success, error: toastError } = useToast();

  useEffect(() => {
    api
      .get<Tutor[]>('/tutors')
      .then(setTutors)
      .catch(() => toastError('Erro ao carregar tutores'));
  }, [toastError]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post(`/animals/${animalId}/tutors`, compact({ tutorId, startedAt, notes }));
      success('Tutor vinculado');
      onDone();
    } catch (err) {
      toastError(err instanceof HttpError ? err.message : 'Erro ao vincular tutor');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Select
        label="Tutor"
        value={tutorId}
        onChange={(e) => setTutorId(e.target.value)}
        options={tutors.map((t) => ({
          value: t.id,
          label: `${t.tutorIdentity?.name || 'Sem nome'}${
            t.tutorIdentity?.documentNumber ? ` — ${t.tutorIdentity.documentNumber}` : ''
          }`,
        }))}
        placeholder="Selecione..."
        required
      />
      <Input
        label="Vínculo desde"
        type="date"
        value={startedAt}
        onChange={(e) => setStartedAt(e.target.value)}
      />
      <Textarea label="Notas" value={notes} onChange={(e) => setNotes(e.target.value)} />
      <div className="flex justify-end gap-3">
        <Button variant="secondary" type="button" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" disabled={saving}>
          {saving ? 'Salvando...' : 'Vincular'}
        </Button>
      </div>
    </form>
  );
}
