import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma';

@Injectable()
export class AllergyService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.allergy.findMany({
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        description: true,
        createdAt: true,
      },
    });
  }

  async findOne(id: string) {
    const allergy = await this.prisma.allergy.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        description: true,
        createdAt: true,
      },
    });

    if (!allergy) {
      throw new NotFoundException(`Allergy with id "${id}" not found`);
    }

    return allergy;
  }
}
