import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma';
import { CreateAnimalVaccinationDto } from './dto';

const ANIMAL_VACCINATION_SELECT = {
  id: true,
  applicationDate: true,
  lotNumber: true,
  nextDoseDate: true,
  notes: true,
  registeredAt: true,
  registeredByTenantId: true,
  registeredByUserId: true,
  createdAt: true,
  vaccine: {
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
export class AnimalVaccinationService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(tenantId: string, animalId: string) {
    await this.verifyAnimalInClinic(tenantId, animalId);

    return this.prisma.animalVaccination.findMany({
      where: { animalId },
      orderBy: { applicationDate: 'desc' },
      select: ANIMAL_VACCINATION_SELECT,
    });
  }

  async create(
    tenantId: string,
    animalId: string,
    userId: string,
    dto: CreateAnimalVaccinationDto,
  ) {
    await this.verifyAnimalInClinic(tenantId, animalId);
    await this.verifyVaccineExists(dto.vaccineId);

    try {
      return await this.prisma.animalVaccination.create({
        data: {
          animalId,
          vaccineId: dto.vaccineId,
          applicationDate: new Date(dto.applicationDate),
          lotNumber: dto.lotNumber,
          nextDoseDate: dto.nextDoseDate
            ? new Date(dto.nextDoseDate)
            : null,
          notes: dto.notes,
          registeredAt: new Date(),
          registeredByTenantId: tenantId,
          registeredByUserId: userId,
        },
        select: ANIMAL_VACCINATION_SELECT,
      });
    } catch (error: unknown) {
      if (
        error instanceof Error &&
        error.message.includes('Unique constraint')
      ) {
        throw new ConflictException(
          `This vaccine has already been registered for this animal on this date`,
        );
      }
      throw error;
    }
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

  private async verifyVaccineExists(vaccineId: string) {
    const vaccine = await this.prisma.vaccine.findUnique({
      where: { id: vaccineId },
    });

    if (!vaccine) {
      throw new NotFoundException(`Vaccine not found`);
    }
  }
}
