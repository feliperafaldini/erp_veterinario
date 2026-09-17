import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { ConsultationStatus } from '@prisma/client';
import { PrismaService } from '../prisma';
import { CreateConsultationDto, UpdateConsultationDto } from './dto';

const CONSULTATION_SELECT = {
  id: true,
  startedAt: true,
  finishedAt: true,
  status: true,
  chiefComplaint: true,
  anamnesis: true,
  physicalExam: true,
  clinicalNotes: true,
  createdAt: true,
  updatedAt: true,
  appointment: {
    select: {
      id: true,
      scheduledAt: true,
      status: true,
    },
  },
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
export class ConsultationService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(tenantId: string) {
    return this.prisma.consultation.findMany({
      where: { tenantId },
      orderBy: { startedAt: 'desc' },
      select: CONSULTATION_SELECT,
    });
  }

  async findOne(tenantId: string, id: string) {
    const consultation = await this.prisma.consultation.findFirst({
      where: { id, tenantId },
      select: CONSULTATION_SELECT,
    });

    if (!consultation) {
      throw new NotFoundException('Consultation not found');
    }

    return consultation;
  }

  async create(tenantId: string, dto: CreateConsultationDto) {
    await this.verifyAnimalInClinic(tenantId, dto.animalId);
    await this.verifyVeterinarianInClinic(tenantId, dto.veterinarianId);

    if (dto.tutorId) {
      await this.verifyTutorInClinic(tenantId, dto.tutorId);
    }

    if (dto.appointmentId) {
      await this.verifyAppointmentInClinic(tenantId, dto.appointmentId, dto.animalId);
    }

    return this.prisma.consultation.create({
      data: {
        tenantId,
        appointmentId: dto.appointmentId,
        animalId: dto.animalId,
        veterinarianId: dto.veterinarianId,
        tutorId: dto.tutorId,
        startedAt: new Date(dto.startedAt),
        chiefComplaint: dto.chiefComplaint,
        anamnesis: dto.anamnesis,
        physicalExam: dto.physicalExam,
        clinicalNotes: dto.clinicalNotes,
      },
      select: CONSULTATION_SELECT,
    });
  }

  async update(
    tenantId: string,
    id: string,
    dto: UpdateConsultationDto,
  ) {
    const consultation = await this.verifyConsultationBelongsToTenant(tenantId, id);

    if (consultation.status !== ConsultationStatus.OPEN) {
      throw new BadRequestException(
        'Consultation can only be updated while OPEN',
      );
    }

    if (
      dto.status !== undefined &&
      dto.status !== consultation.status
    ) {
      const isValidTransition = this.isValidTransition(
        consultation.status as ConsultationStatus,
        dto.status,
      );

      if (!isValidTransition) {
        throw new BadRequestException(
          `Cannot transition from ${consultation.status} to ${dto.status}`,
        );
      }
    }

    const data: Record<string, unknown> = {};

    if (dto.status !== undefined) {
      data.status = dto.status;
    }
    if (dto.chiefComplaint !== undefined) {
      data.chiefComplaint = dto.chiefComplaint;
    }
    if (dto.anamnesis !== undefined) {
      data.anamnesis = dto.anamnesis;
    }
    if (dto.physicalExam !== undefined) {
      data.physicalExam = dto.physicalExam;
    }
    if (dto.clinicalNotes !== undefined) {
      data.clinicalNotes = dto.clinicalNotes;
    }

    if (dto.status === ConsultationStatus.COMPLETED) {
      data.finishedAt = dto.finishedAt
        ? new Date(dto.finishedAt)
        : new Date();
    }

    if (dto.finishedAt !== undefined && dto.status === undefined) {
      data.finishedAt = new Date(dto.finishedAt);
    }

    return this.prisma.consultation.update({
      where: { id },
      data,
      select: CONSULTATION_SELECT,
    });
  }

  private isValidTransition(
    from: ConsultationStatus,
    to: ConsultationStatus,
  ): boolean {
    const transitions: Record<ConsultationStatus, ConsultationStatus[]> = {
      [ConsultationStatus.OPEN]: [
        ConsultationStatus.COMPLETED,
        ConsultationStatus.CANCELLED,
      ],
      [ConsultationStatus.COMPLETED]: [],
      [ConsultationStatus.CANCELLED]: [],
    };

    return transitions[from].includes(to);
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

  private async verifyAppointmentInClinic(
    tenantId: string,
    appointmentId: string,
    animalId: string,
  ) {
    const appointment = await this.prisma.appointment.findFirst({
      where: {
        id: appointmentId,
        tenantId,
      },
    });

    if (!appointment) {
      throw new NotFoundException('Appointment not found');
    }

    if (appointment.animalId !== animalId) {
      throw new BadRequestException(
        'Appointment does not belong to the specified animal',
      );
    }
  }

  private async verifyConsultationBelongsToTenant(
    tenantId: string,
    id: string,
  ) {
    const consultation = await this.prisma.consultation.findFirst({
      where: { id, tenantId },
    });

    if (!consultation) {
      throw new NotFoundException('Consultation not found');
    }

    return consultation;
  }
}
