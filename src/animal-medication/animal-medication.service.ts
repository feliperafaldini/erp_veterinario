import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma';
import { CreateAnimalMedicationDto } from './dto';

const ANIMAL_MEDICATION_SELECT = {
  id: true,
  dosage: true,
  frequency: true,
  route: true,
  startDate: true,
  endDate: true,
  notes: true,
  registeredAt: true,
  registeredByTenantId: true,
  registeredByUserId: true,
  createdAt: true,
  updatedAt: true,
  medication: {
    select: {
      id: true,
      name: true,
      description: true,
    },
  },
  animal: {
    select: {
      id: true,
      internalCode: true,
      name: true,
    },
  },
} as const;

@Injectable()
export class AnimalMedicationService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(tenantId: string, animalId: string) {
    await this.verifyAnimalInClinic(tenantId, animalId);

    return this.prisma.animalMedication.findMany({
      where: { animalId },
      orderBy: { registeredAt: 'desc' },
      select: ANIMAL_MEDICATION_SELECT,
    });
  }

  async create(
    tenantId: string,
    animalId: string,
    userId: string,
    dto: CreateAnimalMedicationDto,
  ) {
    await this.verifyAnimalInClinic(tenantId, animalId);
    await this.verifyMedicationExists(dto.medicationId);

    return this.prisma.animalMedication.create({
      data: {
        animalId,
        medicationId: dto.medicationId,
        dosage: dto.dosage,
        frequency: dto.frequency,
        route: dto.route,
        startDate: new Date(dto.startDate),
        endDate: dto.endDate ? new Date(dto.endDate) : null,
        notes: dto.notes,
        registeredAt: new Date(),
        registeredByTenantId: tenantId,
        registeredByUserId: userId,
      },
      select: ANIMAL_MEDICATION_SELECT,
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

  private async verifyMedicationExists(medicationId: string) {
    const medication = await this.prisma.medication.findUnique({
      where: { id: medicationId },
    });

    if (!medication) {
      throw new NotFoundException(`Medication not found`);
    }
  }
}
