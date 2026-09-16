import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma';

@Injectable()
export class BreedService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(speciesId?: string) {
    const where = speciesId ? { speciesId } : {};

    return this.prisma.breed.findMany({
      where,
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        speciesId: true,
        createdAt: true,
        species: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  }

  async findOne(id: string) {
    const breed = await this.prisma.breed.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        speciesId: true,
        createdAt: true,
        species: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!breed) {
      throw new NotFoundException(`Breed with id "${id}" not found`);
    }

    return breed;
  }
}
