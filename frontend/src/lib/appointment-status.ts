import type { AppointmentStatus } from '../types';

export const APPOINTMENT_STATUS_LABEL: Record<AppointmentStatus, string> = {
  SCHEDULED: 'Agendado',
  IN_PROGRESS: 'Em atendimento',
  COMPLETED: 'Concluído',
  CANCELLED: 'Cancelado',
};

export const APPOINTMENT_STATUS_VARIANT: Record<
  AppointmentStatus,
  'default' | 'warning' | 'success' | 'danger'
> = {
  SCHEDULED: 'default',
  IN_PROGRESS: 'warning',
  COMPLETED: 'success',
  CANCELLED: 'danger',
};
