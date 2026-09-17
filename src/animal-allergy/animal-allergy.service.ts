import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma';
import { CreateAnimalAllergyDto } from './dto';

const ANIMAL_ALLERGY_SELECT = {
  id: true,
  severity: true,
  description: true,
  notes: true,
  registeredAt: true,
  registeredByTenantId: true,
  registeredByUserId: true,
  createdAt: true,
  allergy: {
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
export class AnimalAllergyService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(tenantId: string, animalId: string) {
    await this.verifyAnimalInClinic(tenantId, animalId);

    return this.prisma.animalAllergy.findMany({
      where: { animalId },
      orderBy: { registeredAt: 'desc' },
      select: ANIMAL_ALLERGY_SELECT,
    });
  }

  async create(
    tenantId: string,
    animalId: string,
    userId: string,
    dto: CreateAnimalAllergyDto,
  ) {
    await this.verifyAnimalInClinic(tenantId, animalId);
    await this.verifyAllergyExists(dto.allergyId);

    try {
      return await this.prisma.animalAllergy.create({
        data: {
          animalId,
          allergyId: dto.allergyId,
          severity: dto.severity,
          description: dto.description,
          notes: dto.notes,
          registeredAt: new Date(),
          registeredByTenantId: tenantId,
          registeredByUserId: userId,
        },
        select: ANIMAL_ALLERGY_SELECT,
      });
    } catch (error: unknown) {
      if (
        error instanceof Error &&
        error.message.includes('Unique constraint')
      ) {
        throw new ConflictException(
          `This allergy is already registered for this animal`,
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

  private async verifyAllergyExists(allergyId: string) {
    const allergy = await this.prisma.allergy.findUnique({
      where: { id: allergyId },
    });

    if (!allergy) {
      throw new NotFoundException(`Allergy not found`);
    }
  }
}
