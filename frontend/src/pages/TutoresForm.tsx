import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api, HttpError } from '../lib/api';
import { useToast } from '../context/ToastContext';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Textarea } from '../components/ui/Textarea';
import { Select } from '../components/ui/Select';
import { Card, CardBody } from '../components/ui/Card';
import { Spinner } from '../components/ui/Spinner';
import type { CreateTutorBody, DocumentType, Tutor, UpdateTutorBody } from '../types';

export function TutorFormPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<CreateTutorBody>({
    name: '',
    documentType: 'CPF',
    documentNumber: '',
    email: '',
    additionalInfo: '',
    notes: '',
  });
  const { success, error: toastError } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (id) {
      api
        .get<Tutor>(`/tutors/${id}`)
        .then((tutor) => {
          // o nome/documento vivem em tutorIdentity
          setForm({
            name: tutor.tutorIdentity?.name || '',
            documentType: tutor.tutorIdentity?.documentType || 'CPF',
            documentNumber: tutor.tutorIdentity?.documentNumber || '',
            email: tutor.email || '',
            additionalInfo: tutor.additionalInfo || '',
            notes: tutor.notes || '',
          });
        })
        .catch((err: unknown) => {
          toastError(err instanceof HttpError ? err.message : 'Erro ao carregar tutor');
        })
        .finally(() => setLoading(false));
    }
  }, [id, toastError]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (id) {
        const body: UpdateTutorBody = {
          email: form.email || undefined,
          additionalInfo: form.additionalInfo || undefined,
          notes: form.notes || undefined,
        };
        await api.patch(`/tutors/${id}`, body);
        success('Tutor atualizado');
      } else {
        // POST /tutors cria o Tutor e a TutorIdentity (name/documentType/documentNumber).
        const body: CreateTutorBody = {
          name: form.name.trim(),
          documentType: form.documentType,
          documentNumber: form.documentNumber.trim(),
        };
        if (form.email?.trim()) body.email = form.email.trim();
        if (form.additionalInfo?.trim()) body.additionalInfo = form.additionalInfo.trim();
        if (form.notes?.trim()) body.notes = form.notes.trim();
        await api.post('/tutors', body);
        success('Tutor criado');
      }
      navigate('/tutores');
    } catch (err) {
      toastError(err instanceof HttpError ? err.message : 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  const update = (field: keyof CreateTutorBody, value: string) =>
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
        {isEdit ? 'Editar Tutor' : 'Novo Tutor'}
      </h1>
      <Card>
        <CardBody>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Nome"
              value={form.name}
              onChange={(e) => update('name', e.target.value)}
              disabled={isEdit}
              required
            />
            {isEdit && (
              <p className="text-meta text-ink-3 -mt-2">
                Nome e documento não podem ser alterados por aqui (fazem parte da identidade do tutor).
              </p>
            )}
            <div className="grid grid-cols-2 gap-4">
              <Select
                label="Tipo de Documento"
                value={form.documentType}
                disabled={isEdit}
                onChange={(e) => update('documentType', e.target.value as DocumentType)}
                options={[
                  { value: 'CPF', label: 'CPF' },
                  { value: 'CNPJ', label: 'CNPJ' },
                ]}
              />
              <Input
                label="Número do Documento"
                value={form.documentNumber}
                onChange={(e) => update('documentNumber', e.target.value)}
                disabled={isEdit}
                required
              />
            </div>
            <Input
              label="Email"
              type="email"
              value={form.email}
              onChange={(e) => update('email', e.target.value)}
            />
            <Textarea
              label="Informações Adicionais"
              value={form.additionalInfo}
              onChange={(e) => update('additionalInfo', e.target.value)}
            />
            <Textarea
              label="Notas"
              value={form.notes}
              onChange={(e) => update('notes', e.target.value)}
            />
            <div className="flex justify-end gap-3 pt-4">
              <Button variant="secondary" type="button" onClick={() => navigate('/tutores')}>
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
