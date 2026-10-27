import { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { AnimalAvatar } from './AppointmentCard';
import { ageLabel, sexLabel, timeLabel } from '../../lib/agenda';
import type { Animal, Appointment, AppointmentStatus } from '../../types';

const STATUS_LABEL: Record<AppointmentStatus, string> = {
  SCHEDULED: 'Agendado',
  IN_PROGRESS: 'Em atendimento',
  COMPLETED: 'Concluído',
  CANCELLED: 'Cancelado',
};

const STATUS_VARIANT: Record<AppointmentStatus, 'default' | 'warning' | 'success' | 'danger'> = {
  SCHEDULED: 'default',
  IN_PROGRESS: 'warning',
  COMPLETED: 'success',
  CANCELLED: 'danger',
};

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="micro-label">{label}</dt>
      <dd className="text-body text-ink mt-0.5">{value}</dd>
    </div>
  );
}

interface AppointmentDetailModalProps {
  appointment: Appointment | null;
  animal?: Animal;
  onClose: () => void;
  onOpenRecord: (animalId: string) => void;
  onStatusChange: (appointment: Appointment, status: AppointmentStatus) => Promise<void>;
}

export function AppointmentDetailModal({
  appointment,
  animal,
  onClose,
  onOpenRecord,
  onStatusChange,
}: AppointmentDetailModalProps) {
  const [saving, setSaving] = useState(false);

  if (!appointment) return null;

  const name = appointment.animal.name ?? appointment.animal.internalCode;
  const tutorName = appointment.tutor?.tutorIdentity?.name ?? 'Não informado';

  const runStatus = async (status: AppointmentStatus) => {
    setSaving(true);
    try {
      await onStatusChange(appointment, status);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open onClose={onClose} title="Atendimento">
      <div className="flex items-center gap-3 pb-4 border-b border-line">
        <AnimalAvatar
          animal={animal}
          name={appointment.animal.name}
          code={appointment.animal.internalCode}
          size={52}
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-title font-semibold text-ink truncate">{name}</h3>
            <Badge variant={STATUS_VARIANT[appointment.status]}>
              {STATUS_LABEL[appointment.status]}
            </Badge>
          </div>
          <p className="text-meta text-ink-3">
            <span className="num">{appointment.animal.internalCode}</span>
            {animal?.species?.name ? ` · ${animal.species.name}` : ''}
            {animal?.breed?.name ? ` · ${animal.breed.name}` : ''}
          </p>
        </div>
        <span className="num text-title font-medium text-ink shrink-0">
          {timeLabel(appointment.scheduledAt)}
        </span>
      </div>

      <dl className="grid grid-cols-2 gap-x-6 gap-y-4 py-4">
        <Field label="Tutor" value={tutorName} />
        <Field label="Contato" value={appointment.tutor?.email || '—'} />
        <Field
          label="Espécie / Raça"
          value={[animal?.species?.name, animal?.breed?.name].filter(Boolean).join(' · ') || '—'}
        />
        <Field label="Sexo" value={sexLabel(animal?.sex)} />
        <Field label="Idade" value={ageLabel(animal?.dateOfBirth, animal?.approximateAge)} />
        <Field label="Veterinário" value={appointment.veterinarian?.veterinarian?.name ?? '—'} />
        <div className="col-span-2">
          <Field label="Motivo" value={appointment.reason || 'Não informado'} />
        </div>
        {appointment.notes && (
          <div className="col-span-2">
            <Field label="Notas do agendamento" value={appointment.notes} />
          </div>
        )}
      </dl>

      <div className="flex items-center justify-between gap-2 pt-4 border-t border-line">
        <div className="flex gap-2">
          {appointment.status === 'SCHEDULED' && (
            <Button
              variant="ghost"
              size="sm"
              disabled={saving}
              onClick={() => runStatus('CANCELLED')}
            >
              Cancelar agendamento
            </Button>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={() => onOpenRecord(appointment.animal.id)}>
            Abrir prontuário
          </Button>
          {appointment.status === 'SCHEDULED' && (
            <Button size="sm" disabled={saving} onClick={() => runStatus('IN_PROGRESS')}>
              {saving ? 'Salvando…' : 'Iniciar atendimento'}
            </Button>
          )}
          {appointment.status === 'IN_PROGRESS' && (
            <Button size="sm" disabled={saving} onClick={() => runStatus('COMPLETED')}>
              {saving ? 'Salvando…' : 'Concluir atendimento'}
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
}
