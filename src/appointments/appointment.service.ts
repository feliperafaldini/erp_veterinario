import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma';
import { CreateAppointmentDto, UpdateAppointmentDto } from './dto';

const APPOINTMENT_SELECT = {
  id: true,
  scheduledAt: true,
  status: true,
  reason: true,
  notes: true,
  createdAt: true,
  updatedAt: true,
  animal: {
    select: {
      id: true,
      internalCode: true,
      name: true,
    },
  },
  veterinarian: {
    select: {
      id: true,
      veterinarian: {
        select: {
          id: true,
          name: true,
          crmv: true,
        },
      },
    },
  },
  tutor: {
    select: {
      id: true,
      email: true,
      tutorIdentity: {
        select: {
          name: true,
        },
      },
    },
  },
} as const;

@Injectable()
export class AppointmentService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(tenantId: string) {
    return this.prisma.appointment.findMany({
      where: { tenantId },
      orderBy: { scheduledAt: 'desc' },
      select: APPOINTMENT_SELECT,
    });
  }

  async findOne(tenantId: string, id: string) {
    const appointment = await this.prisma.appointment.findFirst({
      where: { id, tenantId },
      select: APPOINTMENT_SELECT,
    });

    if (!appointment) {
      throw new NotFoundException('Appointment not found');
    }

    return appointment;
  }

  async create(tenantId: string, userId: string, dto: CreateAppointmentDto) {
    await this.verifyAnimalInClinic(tenantId, dto.animalId);
    await this.verifyVeterinarianInClinic(tenantId, dto.veterinarianId);

    if (dto.tutorId) {
      await this.verifyTutorInClinic(tenantId, dto.tutorId);
    }

    return this.prisma.appointment.create({
      data: {
        tenantId,
        animalId: dto.animalId,
        veterinarianId: dto.veterinarianId,
        tutorId: dto.tutorId,
        scheduledAt: new Date(dto.scheduledAt),
        reason: dto.reason,
        notes: dto.notes,
      },
      select: APPOINTMENT_SELECT,
    });
  }

  async update(
    tenantId: string,
    id: string,
    dto: UpdateAppointmentDto,
  ) {
    await this.verifyAppointmentBelongsToTenant(tenantId, id);

    const data: Record<string, unknown> = {};

    if (dto.scheduledAt !== undefined) {
      data.scheduledAt = new Date(dto.scheduledAt);
    }
    if (dto.status !== undefined) {
      data.status = dto.status;
    }
    if (dto.reason !== undefined) {
      data.reason = dto.reason;
    }
    if (dto.notes !== undefined) {
      data.notes = dto.notes;
    }

    return this.prisma.appointment.update({
      where: { id },
      data,
      select: APPOINTMENT_SELECT,
    });
  }

  private async verifyAnimalInClinic(tenantId: string, animalId: string) {
    const tenantAnimal = await this.prisma.tenantAnimal.findUnique({
      where: {
        tenantId_animalId: { tenantId, animalId },
      },
    });

    if (!tenantAnimal) {
      throw new NotFoundException(
        'Animal is not associated with this clinic',
      );
    }
  }

  private async verifyVeterinarianInClinic(
    tenantId: string,
    veterinarianId: string,
  ) {
    const tenantVeterinarian =
      await this.prisma.tenantVeterinarian.findFirst({
        where: {
          id: veterinarianId,
          tenantId,
          isActive: true,
        },
      });

    if (!tenantVeterinarian) {
      throw new NotFoundException(
        'Veterinarian is not associated with this clinic',
      );
    }
  }

  private async verifyTutorInClinic(tenantId: string, tutorId: string) {
    const tutor = await this.prisma.tutor.findFirst({
      where: {
        id: tutorId,
        tenantId,
        isActive: true,
      },
    });

    if (!tutor) {
      throw new NotFoundException(
        'Tutor is not associated with this clinic',
      );
    }
  }

  private async verifyAppointmentBelongsToTenant(
    tenantId: string,
    id: string,
  ) {
    const appointment = await this.prisma.appointment.findFirst({
      where: { id, tenantId },
    });

    if (!appointment) {
      throw new NotFoundException('Appointment not found');
    }
  }
}
