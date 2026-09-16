import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma';

@Injectable()
export class MedicationService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.medication.findMany({
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
    const medication = await this.prisma.medication.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        description: true,
        createdAt: true,
      },
    });

    if (!medication) {
      throw new NotFoundException(`Medication with id "${id}" not found`);
    }

    return medication;
  }
}
