import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma';

@Injectable()
export class SpeciesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.species.findMany({
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        scientificName: true,
        createdAt: true,
      },
    });
  }

  async findOne(id: string) {
    const species = await this.prisma.species.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        scientificName: true,
        createdAt: true,
      },
    });

    if (!species) {
      throw new NotFoundException(`Species with id "${id}" not found`);
    }

    return species;
  }
}
