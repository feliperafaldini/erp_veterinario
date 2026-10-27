import { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Textarea } from '../ui/Textarea';
import { AnimalAvatar } from './AppointmentCard';
import { api, HttpError } from '../../lib/api';
import { useToast } from '../../context/ToastContext';
import { timeLabel } from '../../lib/agenda';
import type { Animal, Appointment, Consultation } from '../../types';

interface ConsultationModalProps {
  appointment: Appointment;
  existing: Consultation | null;
  animal?: Animal;
  onClose: () => void;
  onSaved: (appointment: Appointment, consultation: Consultation) => void;
}

interface FormState {
  chiefComplaint: string;
  anamnesis: string;
  physicalExam: string;
  clinicalNotes: string;
}

export function ConsultationModal({
  appointment,
  existing,
  animal,
  onClose,
  onSaved,
}: ConsultationModalProps) {
  const { error: toastError, success: toastSuccess } = useToast();
  const [form, setForm] = useState<FormState>({
    chiefComplaint: existing?.chiefComplaint ?? '',
    anamnesis: existing?.anamnesis ?? '',
    physicalExam: existing?.physicalExam ?? '',
    clinicalNotes: existing?.clinicalNotes ?? '',
  });
  const [saving, setSaving] = useState(false);

  const name = appointment.animal.name ?? appointment.animal.internalCode;
  const tutorName = appointment.tutor?.tutorIdentity?.name ?? 'Tutor não informado';
  const vetName = appointment.veterinarian?.veterinarian?.name ?? 'Veterinário';

  const update = (field: keyof FormState, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const save = async (complete: boolean) => {
    setSaving(true);
    try {
      let consultation = existing;
      if (consultation) {
        consultation = await api.patch<Consultation>(`/consultations/${consultation.id}`, {
          ...form,
          ...(complete
            ? { status: 'COMPLETED' as const, finishedAt: new Date().toISOString() }
            : {}),
        });
      } else {
        consultation = await api.post<Consultation>('/consultations', {
          appointmentId: appointment.id,
          animalId: appointment.animal.id,
          veterinarianId: appointment.veterinarian!.id,
          ...(appointment.tutor?.id ? { tutorId: appointment.tutor.id } : {}),
          startedAt: new Date().toISOString(),
          ...form,
        });
        if (complete) {
          consultation = await api.patch<Consultation>(`/consultations/${consultation.id}`, {
            status: 'COMPLETED' as const,
            finishedAt: new Date().toISOString(),
          });
        }
      }

      const updatedAppointment = await api.patch<Appointment>(`/appointments/${appointment.id}`, {
        status: complete ? 'COMPLETED' : 'IN_PROGRESS',
      });

      toastSuccess(complete ? 'Atendimento concluído' : 'Atendimento salvo em andamento');
      onSaved(updatedAppointment, consultation);
    } catch (err) {
      toastError(err instanceof HttpError ? err.message : 'Erro ao salvar o atendimento');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open onClose={onClose} title="Atendimento" size="lg">
      <div className="flex items-center gap-3 pb-4 border-b border-line">
        <AnimalAvatar
          animal={animal}
          name={appointment.animal.name}
          code={appointment.animal.internalCode}
          size={56}
        />
        <div className="min-w-0 flex-1">
          <h3 className="text-title font-semibold text-ink truncate">{name}</h3>
          <p className="text-meta text-ink-3 truncate">
            <span className="num">{appointment.animal.internalCode}</span> · {tutorName} · {vetName}
          </p>
        </div>
        <span className="num text-lead text-ink-2 shrink-0">
          {timeLabel(appointment.scheduledAt)}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4 py-4">
        <div className="col-span-2">
          <Textarea
            label="Queixa principal"
            value={form.chiefComplaint}
            onChange={(e) => update('chiefComplaint', e.target.value)}
            maxLength={2000}
            rows={2}
            placeholder="O que o tutor relatou na chegada"
          />
        </div>
        <Textarea
          label="Anamnese"
          value={form.anamnesis}
          onChange={(e) => update('anamnesis', e.target.value)}
          maxLength={5000}
          rows={4}
          placeholder="Histórico e evolução relatados"
        />
        <Textarea
          label="Exame físico"
          value={form.physicalExam}
          onChange={(e) => update('physicalExam', e.target.value)}
          maxLength={5000}
          rows={4}
          placeholder="Achados do exame"
        />
        <div className="col-span-2">
          <Textarea
            label="Observações"
            value={form.clinicalNotes}
            onChange={(e) => update('clinicalNotes', e.target.value)}
            maxLength={5000}
            rows={3}
            placeholder="Conduta, orientações, retorno"
          />
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 pt-4 border-t border-line">
        <Button variant="ghost" size="sm" onClick={onClose} disabled={saving}>
          Fechar
        </Button>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={() => save(false)} disabled={saving}>
            {saving ? 'Salvando…' : 'Salvar em andamento'}
          </Button>
          <Button size="sm" onClick={() => save(true)} disabled={saving}>
            {saving ? 'Salvando…' : 'Concluir atendimento'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
