import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma';
import { CreateAnimalWeightRecordDto } from './dto';

const ANIMAL_WEIGHT_RECORD_SELECT = {
  id: true,
  weight: true,
  recordedAt: true,
  notes: true,
  createdAt: true,
  tenantId: true,
  recordedBy: true,
  animal: {
    select: {
      id: true,
      internalCode: true,
      name: true,
    },
  },
} as const;

@Injectable()
export class AnimalWeightRecordService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(tenantId: string, animalId: string) {
    await this.verifyAnimalInClinic(tenantId, animalId);

    return this.prisma.animalWeightRecord.findMany({
      where: { animalId },
      orderBy: { recordedAt: 'desc' },
      select: ANIMAL_WEIGHT_RECORD_SELECT,
    });
  }

  async create(
    tenantId: string,
    animalId: string,
    userId: string,
    dto: CreateAnimalWeightRecordDto,
  ) {
    await this.verifyAnimalInClinic(tenantId, animalId);

    return this.prisma.animalWeightRecord.create({
      data: {
        animalId,
        tenantId,
        weight: dto.weight,
        recordedAt: dto.recordedAt ?? new Date(),
        recordedBy: userId,
        notes: dto.notes,
      },
      select: ANIMAL_WEIGHT_RECORD_SELECT,
    });
  }

  private async verifyAnimalInClinic(tenantId: string, animalId: string) {
    const tenantAnimal = await this.prisma.tenantAnimal.findUnique({
      where: {
        tenantId_animalId: {
          tenantId,
          animalId,
        },
      },
    });

    if (!tenantAnimal) {
      throw new NotFoundException(
        `Animal is not associated with this clinic`,
      );
    }
  }
}
