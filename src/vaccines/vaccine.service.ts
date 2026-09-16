import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma';

@Injectable()
export class VaccineService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.vaccine.findMany({
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
    const vaccine = await this.prisma.vaccine.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        description: true,
        createdAt: true,
      },
    });

    if (!vaccine) {
      throw new NotFoundException(`Vaccine with id "${id}" not found`);
    }

    return vaccine;
  }
}
