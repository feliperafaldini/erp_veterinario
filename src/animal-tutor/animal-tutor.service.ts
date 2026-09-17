import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma';
import { CreateAnimalTutorDto, UpdateAnimalTutorDto } from './dto';

const ANIMAL_TUTOR_SELECT = {
  id: true,
  startedAt: true,
  endedAt: true,
  isActive: true,
  notes: true,
  createdAt: true,
  tutor: {
    select: {
      id: true,
      email: true,
      additionalInfo: true,
      isActive: true,
      tutorIdentity: {
        select: {
          id: true,
          name: true,
          documentType: true,
          documentNumber: true,
        },
      },
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
export class AnimalTutorService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(tenantId: string, animalId: string) {
    await this.verifyAnimalInClinic(tenantId, animalId);

    return this.prisma.animalTutor.findMany({
      where: {
        tenantId,
        animalId,
      },
      orderBy: { createdAt: 'desc' },
      select: ANIMAL_TUTOR_SELECT,
    });
  }

  async create(
    tenantId: string,
    animalId: string,
    dto: CreateAnimalTutorDto,
  ) {
    await this.verifyAnimalInClinic(tenantId, animalId);
    await this.verifyTutorInClinic(tenantId, dto.tutorId);

    const existingActive = await this.prisma.animalTutor.findFirst({
      where: {
        tenantId,
        animalId,
        tutorId: dto.tutorId,
        isActive: true,
      },
    });

    if (existingActive) {
      throw new ConflictException(
        `An active association between this animal and tutor already exists`,
      );
    }

    try {
      return await this.prisma.animalTutor.create({
        data: {
          tenantId,
          animalId,
          tutorId: dto.tutorId,
          startedAt: dto.startedAt ?? new Date(),
          notes: dto.notes,
        },
        select: ANIMAL_TUTOR_SELECT,
      });
    } catch (error: unknown) {
      if (
        error instanceof Error &&
        error.message.includes('Unique constraint')
      ) {
        throw new ConflictException(
          `An active association between this animal and tutor already exists`,
        );
      }
      throw error;
    }
  }

  async update(
    tenantId: string,
    animalId: string,
    tutorId: string,
    dto: UpdateAnimalTutorDto,
  ) {
    const animalTutor = await this.findAssociation(
      tenantId,
      animalId,
      tutorId,
    );

    if (dto.startedAt && dto.endedAt && dto.startedAt > dto.endedAt) {
      throw new BadRequestException(
        `startedAt cannot be after endedAt`,
      );
    }

    if (dto.endedAt && animalTutor.isActive) {
      throw new BadRequestException(
        `Cannot set endedAt on an active association. Deactivate it first.`,
      );
    }

    const updateData: Record<string, unknown> = {};
    if (dto.startedAt !== undefined) updateData.startedAt = dto.startedAt;
    if (dto.endedAt !== undefined) updateData.endedAt = dto.endedAt;
    if (dto.notes !== undefined) updateData.notes = dto.notes;

    if (Object.keys(updateData).length === 0) {
      return this.prisma.animalTutor.findUnique({
        where: {
          id: animalTutor.id,
        },
        select: ANIMAL_TUTOR_SELECT,
      });
    }

    return this.prisma.animalTutor.update({
      where: { id: animalTutor.id },
      data: updateData,
      select: ANIMAL_TUTOR_SELECT,
    });
  }

  async deactivate(
    tenantId: string,
    animalId: string,
    tutorId: string,
  ) {
    const animalTutor = await this.findAssociation(
      tenantId,
      animalId,
      tutorId,
    );

    if (!animalTutor.isActive) {
      throw new BadRequestException(
        `AnimalTutor association is already deactivated`,
      );
    }

    return this.prisma.animalTutor.update({
      where: { id: animalTutor.id },
      data: {
        isActive: false,
        endedAt: new Date(),
      },
      select: ANIMAL_TUTOR_SELECT,
    });
  }

  private async findAssociation(
    tenantId: string,
    animalId: string,
    tutorId: string,
  ) {
    const animalTutor = await this.prisma.animalTutor.findFirst({
      where: {
        tenantId,
        animalId,
        tutorId,
      },
    });

    if (!animalTutor) {
      throw new NotFoundException(
        `AnimalTutor association not found in this clinic`,
      );
    }

    return animalTutor;
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

  private async verifyTutorInClinic(tenantId: string, tutorId: string) {
    const tutor = await this.prisma.tutor.findFirst({
      where: {
        id: tutorId,
        tenantId,
      },
    });

    if (!tutor) {
      throw new NotFoundException(
        `Tutor not found in this clinic`,
      );
    }
  }
}
