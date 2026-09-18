import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma';
import { CreateDiagnosisDto, UpdateDiagnosisDto } from './dto';

const DIAGNOSIS_SELECT = {
  id: true,
  description: true,
  notes: true,
  isActive: true,
  registeredAt: true,
  createdAt: true,
  updatedAt: true,
  consultation: {
    select: {
      id: true,
      startedAt: true,
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
} as const;

@Injectable()
export class DiagnosisService {
  constructor(private readonly prisma: PrismaService) {}

  async findByConsultation(tenantId: string, consultationId: string) {
    await this.verifyConsultationBelongsToTenant(tenantId, consultationId);

    return this.prisma.diagnosis.findMany({
      where: { tenantId, consultationId },
      orderBy: { registeredAt: 'desc' },
      select: DIAGNOSIS_SELECT,
    });
  }

  async findOne(tenantId: string, id: string) {
    const diagnosis = await this.prisma.diagnosis.findFirst({
      where: { id, tenantId },
      select: DIAGNOSIS_SELECT,
    });

    if (!diagnosis) {
      throw new NotFoundException('Diagnosis not found');
    }

    return diagnosis;
  }

  async create(tenantId: string, dto: CreateDiagnosisDto) {
    if (!dto.consultationId) {
      throw new BadRequestException('consultationId is required');
    }

    const consultationId = dto.consultationId;

    const consultation = await this.verifyConsultationBelongsToTenant(
      tenantId,
      consultationId,
    );

    return this.prisma.diagnosis.create({
      data: {
        tenantId,
        consultationId,
        animalId: consultation.animalId,
        veterinarianId: consultation.veterinarianId,
        description: dto.description,
        notes: dto.notes,
      },
      select: DIAGNOSIS_SELECT,
    });
  }

  async update(tenantId: string, id: string, dto: UpdateDiagnosisDto) {
    const diagnosis = await this.verifyDiagnosisBelongsToTenant(tenantId, id);

    if (!diagnosis.isActive) {
      throw new BadRequestException(
        'Inactive diagnosis cannot be updated',
      );
    }

    const data: Record<string, unknown> = {};

    if (dto.description !== undefined) {
      data.description = dto.description;
    }
    if (dto.notes !== undefined) {
      data.notes = dto.notes;
    }

    return this.prisma.diagnosis.update({
      where: { id },
      data,
      select: DIAGNOSIS_SELECT,
    });
  }

  async deactivate(tenantId: string, id: string) {
    const diagnosis = await this.verifyDiagnosisBelongsToTenant(tenantId, id);

    if (!diagnosis.isActive) {
      throw new BadRequestException('Diagnosis is already inactive');
    }

    return this.prisma.diagnosis.update({
      where: { id },
      data: { isActive: false },
      select: DIAGNOSIS_SELECT,
    });
  }

  private async verifyConsultationBelongsToTenant(
    tenantId: string,
    consultationId: string,
  ) {
    const consultation = await this.prisma.consultation.findFirst({
      where: { id: consultationId, tenantId },
      select: {
        id: true,
        animalId: true,
        veterinarianId: true,
      },
    });

    if (!consultation) {
      throw new NotFoundException('Consultation not found');
    }

    return consultation;
  }

  private async verifyDiagnosisBelongsToTenant(
    tenantId: string,
    id: string,
  ) {
    const diagnosis = await this.prisma.diagnosis.findFirst({
      where: { id, tenantId },
      select: {
        id: true,
        isActive: true,
      },
    });

    if (!diagnosis) {
      throw new NotFoundException('Diagnosis not found');
    }

    return diagnosis;
  }
}
