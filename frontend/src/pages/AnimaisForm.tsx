import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api, HttpError } from '../lib/api';
import { useToast } from '../context/ToastContext';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Textarea } from '../components/ui/Textarea';
import { Card, CardBody } from '../components/ui/Card';
import { Spinner } from '../components/ui/Spinner';
import type {
  AnimalSex,
  AnimalSize,
  Breed,
  CreateAnimalBody,
  Species,
  TenantAnimalItem,
} from '../types';

const toDateInput = (value: string | null | undefined) => (value ? value.slice(0, 10) : '');

export function AnimalFormPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [species, setSpecies] = useState<Species[]>([]);
  const [breeds, setBreeds] = useState<Breed[]>([]);
  const [form, setForm] = useState<CreateAnimalBody>({
    name: '',
    speciesId: '',
    breedId: '',
    sex: 'UNKNOWN',
    isCastrated: false,
    color: '',
    size: undefined,
    dateOfBirth: '',
    castrationDate: '',
    approximateAge: '',
    microchip: '',
    photoUrl: '',
    notes: '',
  });
  const { success, error: toastError } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    Promise.all([api.get<Species[]>('/species'), api.get<Breed[]>('/breeds')])
      .then(([s, b]) => {
        setSpecies(s);
        setBreeds(b);
      })
      .catch(() => toastError('Erro ao carregar catálogos'));
  }, [toastError]);

  useEffect(() => {
    if (!id) return;
    // GET /animals/:id devolve o vínculo (TenantAnimal); os dados do animal
    // ficam em .animal.
    api
      .get<TenantAnimalItem>(`/animals/${id}`)
      .then((link) => {
        const animal = link.animal;
        setForm({
          name: animal.name || '',
          speciesId: animal.species?.id || '',
          breedId: animal.breed?.id || '',
          sex: animal.sex,
          isCastrated: animal.isCastrated,
          castrationDate: toDateInput(animal.castrationDate),
          dateOfBirth: toDateInput(animal.dateOfBirth),
          approximateAge: animal.approximateAge || '',
          microchip: animal.microchip || '',
          photoUrl: animal.photoUrl || '',
          color: animal.color || '',
          size: animal.size || undefined,
          notes: animal.notes || '',
        });
      })
      .catch((err: unknown) => {
        toastError(err instanceof HttpError ? err.message : 'Erro ao carregar animal');
      })
      .finally(() => setLoading(false));
  }, [id, toastError]);

  const breedOptions = useMemo(
    () => breeds.filter((b) => !form.speciesId || !b.speciesId || b.speciesId === form.speciesId),
    [breeds, form.speciesId]
  );

  /** Remove campos vazios: o ValidationPipe da API roda com forbidNonWhitelisted
   *  e valida UUID/data — string vazia derrubaria o request com 400. */
  const buildPayload = (): CreateAnimalBody => {
    const payload: CreateAnimalBody = {
      speciesId: form.speciesId,
      sex: form.sex,
      isCastrated: Boolean(form.isCastrated),
    };
    if (form.name?.trim()) payload.name = form.name.trim();
    if (form.breedId) payload.breedId = form.breedId;
    if (form.size) payload.size = form.size;
    if (form.color?.trim()) payload.color = form.color.trim();
    if (form.microchip?.trim()) payload.microchip = form.microchip.trim();
    if (form.photoUrl?.trim()) payload.photoUrl = form.photoUrl.trim();
    if (form.approximateAge?.trim()) payload.approximateAge = form.approximateAge.trim();
    if (form.notes?.trim()) payload.notes = form.notes.trim();
    if (form.dateOfBirth) payload.dateOfBirth = form.dateOfBirth;
    if (form.isCastrated && form.castrationDate) payload.castrationDate = form.castrationDate;
    return payload;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (id) {
        await api.patch(`/animals/${id}`, buildPayload());
        success('Animal atualizado');
        navigate(`/animais/${id}`);
      } else {
        // POST /animals já cria o vínculo com a clínica e devolve o TenantAnimal.
        const created = await api.post<TenantAnimalItem>('/animals', buildPayload());
        success('Animal criado');
        navigate(`/animais/${created.animal.id}`);
      }
    } catch (err) {
      toastError(err instanceof HttpError ? err.message : 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  const update = (field: keyof CreateAnimalBody, value: string | boolean | undefined) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-page font-semibold text-ink mb-6">
        {isEdit ? 'Editar Animal' : 'Novo Animal'}
      </h1>
      <Card>
        <CardBody>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Nome"
              value={form.name}
              onChange={(e) => update('name', e.target.value)}
            />
            <div className="grid grid-cols-2 gap-4">
              <Select
                label="Espécie"
                value={form.speciesId}
                onChange={(e) => {
                  update('speciesId', e.target.value);
                  update('breedId', '');
                }}
                options={species.map((s) => ({ value: s.id, label: s.name }))}
                placeholder="Selecione..."
                required
              />
              <Select
                label="Raça"
                value={form.breedId || ''}
                onChange={(e) => update('breedId', e.target.value)}
                options={breedOptions.map((b) => ({ value: b.id, label: b.name }))}
                placeholder="Sem raça definida"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Select
                label="Sexo"
                value={form.sex}
                onChange={(e) => update('sex', e.target.value as AnimalSex)}
                options={[
                  { value: 'MALE', label: 'Macho' },
                  { value: 'FEMALE', label: 'Fêmea' },
                  { value: 'UNKNOWN', label: 'Indefinido' },
                ]}
                required
              />
              <Select
                label="Porte"
                value={form.size || ''}
                onChange={(e) => update('size', (e.target.value || undefined) as AnimalSize | undefined)}
                options={[
                  { value: 'SMALL', label: 'Pequeno' },
                  { value: 'MEDIUM', label: 'Médio' },
                  { value: 'LARGE', label: 'Grande' },
                ]}
                placeholder="Selecione..."
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Data de Nascimento"
                type="date"
                value={form.dateOfBirth || ''}
                onChange={(e) => update('dateOfBirth', e.target.value)}
              />
              <Input
                label="Idade Aproximada"
                value={form.approximateAge || ''}
                onChange={(e) => update('approximateAge', e.target.value)}
                placeholder="ex.: 3 anos"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Cor"
                value={form.color || ''}
                onChange={(e) => update('color', e.target.value)}
              />
              <Input
                label="Microchip"
                value={form.microchip || ''}
                onChange={(e) => update('microchip', e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-4 items-end">
              <label className="flex items-center gap-2 text-body text-ink-2 pb-2">
                <input
                  type="checkbox"
                  checked={Boolean(form.isCastrated)}
                  onChange={(e) => update('isCastrated', e.target.checked)}
                  className="rounded border-line-strong"
                />
                Castrado
              </label>
              <Input
                label="Data da Castração"
                type="date"
                value={form.castrationDate || ''}
                onChange={(e) => update('castrationDate', e.target.value)}
                disabled={!form.isCastrated}
              />
            </div>
            <Input
              label="Foto (URL)"
              value={form.photoUrl || ''}
              onChange={(e) => update('photoUrl', e.target.value)}
            />
            <Textarea
              label="Observações"
              value={form.notes || ''}
              onChange={(e) => update('notes', e.target.value)}
            />
            <div className="flex justify-end gap-3 pt-4">
              <Button variant="secondary" type="button" onClick={() => navigate('/animais')}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? 'Salvando...' : 'Salvar'}
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}
