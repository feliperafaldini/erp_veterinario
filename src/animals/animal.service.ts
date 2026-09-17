import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma';
import { CreateAnimalDto, UpdateAnimalDto } from './dto';

const ANIMAL_SELECT = {
  id: true,
  internalCode: true,
  name: true,
  sex: true,
  isCastrated: true,
  castrationDate: true,
  dateOfBirth: true,
  approximateAge: true,
  microchip: true,
  photoUrl: true,
  color: true,
  size: true,
  dateOfDeath: true,
  status: true,
  notes: true,
  createdAt: true,
  updatedAt: true,
  species: {
    select: {
      id: true,
      name: true,
      scientificName: true,
    },
  },
  breed: {
    select: {
      id: true,
      name: true,
    },
  },
} as const;

const TENANT_ANIMAL_SELECT = {
  id: true,
  status: true,
  notes: true,
  createdAt: true,
  updatedAt: true,
  animal: {
    select: ANIMAL_SELECT,
  },
} as const;

@Injectable()
export class AnimalService {
  constructor(private readonly prisma: PrismaService) {}

  async create(tenantId: string, dto: CreateAnimalDto) {
    const species = await this.prisma.species.findUnique({
      where: { id: dto.speciesId },
    });

    if (!species) {
      throw new NotFoundException(
        `Species with id "${dto.speciesId}" not found`,
      );
    }

    let breedId = dto.breedId;

    if (!breedId) {
      const defaultBreed = await this.prisma.breed.findUnique({
        where: {
          speciesId_name: {
            speciesId: dto.speciesId,
            name: 'Sem raça definida',
          },
        },
      });

      if (!defaultBreed) {
        throw new NotFoundException(
          `No default breed found for species "${dto.speciesId}"`,
        );
      }

      breedId = defaultBreed.id;
    } else {
      const breed = await this.prisma.breed.findUnique({
        where: { id: breedId },
      });

      if (!breed) {
        throw new NotFoundException(`Breed with id "${breedId}" not found`);
      }

      if (breed.speciesId !== dto.speciesId) {
        throw new ConflictException(
          `Breed "${breedId}" does not belong to species "${dto.speciesId}"`,
        );
      }
    }

    if (dto.microchip) {
      const existingByMicrochip = await this.prisma.animal.findUnique({
        where: { microchip: dto.microchip },
      });

      if (existingByMicrochip) {
        throw new ConflictException(
          `An animal with this microchip already exists`,
        );
      }
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const animal = await tx.animal.create({
        data: {
          name: dto.name,
          speciesId: dto.speciesId,
          breedId: breedId,
          sex: dto.sex,
          isCastrated: dto.isCastrated ?? false,
          castrationDate: dto.castrationDate,
          dateOfBirth: dto.dateOfBirth,
          approximateAge: dto.approximateAge,
          microchip: dto.microchip,
          photoUrl: dto.photoUrl,
          color: dto.color,
          size: dto.size,
          notes: dto.notes,
        },
        select: ANIMAL_SELECT,
      });

      const tenantAnimal = await tx.tenantAnimal.create({
        data: {
          tenantId,
          animalId: animal.id,
        },
        select: TENANT_ANIMAL_SELECT,
      });

      return tenantAnimal;
    });

    return result;
  }

  async findAll(tenantId: string) {
    return this.prisma.tenantAnimal.findMany({
      where: {
        tenantId,
        status: 'ACTIVE',
      },
      orderBy: { createdAt: 'desc' },
      select: TENANT_ANIMAL_SELECT,
    });
  }

  async findOne(tenantId: string, animalId: string) {
    const tenantAnimal = await this.prisma.tenantAnimal.findUnique({
      where: {
        tenantId_animalId: {
          tenantId,
          animalId,
        },
      },
      select: TENANT_ANIMAL_SELECT,
    });

    if (!tenantAnimal) {
      throw new NotFoundException(`Animal not found in this clinic`);
    }

    return tenantAnimal;
  }

  async update(tenantId: string, animalId: string, dto: UpdateAnimalDto) {
    const tenantAnimal = await this.prisma.tenantAnimal.findUnique({
      where: {
        tenantId_animalId: {
          tenantId,
          animalId,
        },
      },
      include: {
        animal: true,
      },
    });

    if (!tenantAnimal) {
      throw new NotFoundException(`Animal not found in this clinic`);
    }

    if (dto.speciesId || dto.breedId) {
      const speciesId = dto.speciesId ?? tenantAnimal.animal.speciesId;
      const breedId = dto.breedId ?? tenantAnimal.animal.breedId;

      const species = await this.prisma.species.findUnique({
        where: { id: speciesId },
      });

      if (!species) {
        throw new NotFoundException(`Species with id "${speciesId}" not found`);
      }

      const breed = await this.prisma.breed.findUnique({
        where: { id: breedId },
      });

      if (!breed) {
        throw new NotFoundException(`Breed with id "${breedId}" not found`);
      }

      if (breed.speciesId !== speciesId) {
        throw new ConflictException(
          `Breed "${breedId}" does not belong to species "${speciesId}"`,
        );
      }
    }

    if (dto.microchip && dto.microchip !== tenantAnimal.animal.microchip) {
      const existingByMicrochip = await this.prisma.animal.findUnique({
        where: { microchip: dto.microchip },
      });

      if (existingByMicrochip) {
        throw new ConflictException(
          `An animal with this microchip already exists`,
        );
      }
    }

    const animalUpdate: Record<string, unknown> = {};
    if (dto.name !== undefined) animalUpdate.name = dto.name;
    if (dto.speciesId !== undefined) animalUpdate.speciesId = dto.speciesId;
    if (dto.breedId !== undefined) animalUpdate.breedId = dto.breedId;
    if (dto.sex !== undefined) animalUpdate.sex = dto.sex;
    if (dto.isCastrated !== undefined)
      animalUpdate.isCastrated = dto.isCastrated;
    if (dto.castrationDate !== undefined)
      animalUpdate.castrationDate = dto.castrationDate;
    if (dto.dateOfBirth !== undefined)
      animalUpdate.dateOfBirth = dto.dateOfBirth;
    if (dto.approximateAge !== undefined)
      animalUpdate.approximateAge = dto.approximateAge;
    if (dto.microchip !== undefined) animalUpdate.microchip = dto.microchip;
    if (dto.photoUrl !== undefined) animalUpdate.photoUrl = dto.photoUrl;
    if (dto.color !== undefined) animalUpdate.color = dto.color;
    if (dto.size !== undefined) animalUpdate.size = dto.size;
    if (dto.notes !== undefined) animalUpdate.notes = dto.notes;

    if (Object.keys(animalUpdate).length > 0) {
      await this.prisma.animal.update({
        where: { id: tenantAnimal.animalId },
        data: animalUpdate,
      });
    }

    return this.findOne(tenantId, animalId);
  }

  async deactivate(tenantId: string, animalId: string) {
    const tenantAnimal = await this.prisma.tenantAnimal.findUnique({
      where: {
        tenantId_animalId: {
          tenantId,
          animalId,
        },
      },
    });

    if (!tenantAnimal) {
      throw new NotFoundException(`Animal not found in this clinic`);
    }

    if (tenantAnimal.status === 'INACTIVE') {
      throw new BadRequestException(
        `Animal association is already deactivated`,
      );
    }

    await this.prisma.tenantAnimal.update({
      where: {
        tenantId_animalId: {
          tenantId,
          animalId,
        },
      },
      data: { status: 'INACTIVE' },
    });

    return this.findOne(tenantId, animalId);
  }

  async addToClinic(tenantId: string, animalId: string) {
    const animal = await this.prisma.animal.findUnique({
      where: { id: animalId },
    });

    if (!animal) {
      throw new NotFoundException(`Animal with id "${animalId}" not found`);
    }

    const existingLink = await this.prisma.tenantAnimal.findUnique({
      where: {
        tenantId_animalId: {
          tenantId,
          animalId,
        },
      },
    });

    if (existingLink) {
      throw new ConflictException(
        `Animal is already associated with this clinic`,
      );
    }

    return this.prisma.tenantAnimal.create({
      data: {
        tenantId,
        animalId,
      },
      select: TENANT_ANIMAL_SELECT,
    });
  }

  async getClinicAssociation(tenantId: string, animalId: string) {
    const tenantAnimal = await this.prisma.tenantAnimal.findUnique({
      where: {
        tenantId_animalId: {
          tenantId,
          animalId,
        },
      },
      select: TENANT_ANIMAL_SELECT,
    });

    if (!tenantAnimal) {
      throw new NotFoundException(
        `Animal is not associated with this clinic`,
      );
    }

    return tenantAnimal;
  }

  async updateClinicAssociation(
    tenantId: string,
    animalId: string,
    dto: { notes?: string },
  ) {
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

    return this.prisma.tenantAnimal.update({
      where: {
        tenantId_animalId: {
          tenantId,
          animalId,
        },
      },
      data: {
        notes: dto.notes,
      },
      select: TENANT_ANIMAL_SELECT,
    });
  }

  async deactivateClinicAssociation(tenantId: string, animalId: string) {
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

    if (tenantAnimal.status === 'INACTIVE') {
      throw new BadRequestException(
        `Animal association is already deactivated`,
      );
    }

    return this.prisma.tenantAnimal.update({
      where: {
        tenantId_animalId: {
          tenantId,
          animalId,
        },
      },
      data: {
        status: 'INACTIVE',
      },
      select: TENANT_ANIMAL_SELECT,
    });
  }
}
