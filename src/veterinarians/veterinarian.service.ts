import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma';

const VETERINARIAN_SELECT = {
  id: true,
  name: true,
  crmv: true,
  bio: true,
  createdAt: true,
  updatedAt: true,
} as const;

const TENANT_VETERINARIAN_SELECT = {
  id: true,
  joinedAt: true,
  isActive: true,
  room: true,
  function: true,
  notes: true,
  createdAt: true,
  updatedAt: true,
  veterinarian: {
    select: {
      id: true,
      name: true,
      crmv: true,
      bio: true,
      createdAt: true,
      updatedAt: true,
      veterinarianSpecialties: {
        select: {
          specialty: {
            select: {
              id: true,
              name: true,
              description: true,
            },
          },
        },
      },
    },
  },
} as const;

@Injectable()
export class VeterinarianService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    userId: string,
    tenantId: string,
    data: {
      name: string;
      crmv: string;
      bio?: string;
      specialtyIds?: string[];
    },
  ) {
    let veterinarian = await this.prisma.veterinarian.findUnique({
      where: { userId },
    });

    if (!veterinarian) {
      const existingByCrmv = await this.prisma.veterinarian.findUnique({
        where: { crmv: data.crmv },
      });

      if (existingByCrmv) {
        throw new ConflictException(
          `A veterinarian with this CRMV already exists`,
        );
      }

      veterinarian = await this.prisma.veterinarian.create({
        data: {
          name: data.name,
          crmv: data.crmv,
          bio: data.bio,
          userId,
        },
      });
    } else {
      if (veterinarian.userId !== userId) {
        throw new ConflictException(
          `This user already has a different veterinarian profile`,
        );
      }
    }

    const existingLink = await this.prisma.tenantVeterinarian.findUnique({
      where: {
        tenantId_veterinarianId: {
          tenantId,
          veterinarianId: veterinarian.id,
        },
      },
    });

    if (existingLink) {
      throw new ConflictException(
        `Veterinarian is already associated with this clinic`,
      );
    }

    const tenantVet = await this.prisma.tenantVeterinarian.create({
      data: {
        tenantId,
        veterinarianId: veterinarian.id,
      },
    });

    if (data.specialtyIds && data.specialtyIds.length > 0) {
      await this.replaceSpecialties(veterinarian.id, data.specialtyIds);
    }

    return this.findOne(tenantId, tenantVet.id);
  }

  async findAll(tenantId: string) {
    return this.prisma.tenantVeterinarian.findMany({
      where: {
        tenantId,
        isActive: true,
      },
      orderBy: { joinedAt: 'desc' },
      select: TENANT_VETERINARIAN_SELECT,
    });
  }

  async findOne(tenantId: string, id: string) {
    const tenantVet = await this.prisma.tenantVeterinarian.findFirst({
      where: {
        id,
        tenantId,
      },
      select: TENANT_VETERINARIAN_SELECT,
    });

    if (!tenantVet) {
      throw new NotFoundException(`Veterinarian not found in this clinic`);
    }

    return tenantVet;
  }

  async update(
    tenantId: string,
    id: string,
    data: {
      name?: string;
      bio?: string;
      room?: string;
      function?: string;
      notes?: string;
    },
  ) {
    const tenantVet = await this.prisma.tenantVeterinarian.findFirst({
      where: {
        id,
        tenantId,
      },
      include: {
        veterinarian: true,
      },
    });

    if (!tenantVet) {
      throw new NotFoundException(`Veterinarian not found in this clinic`);
    }

    const vetUpdate: Record<string, unknown> = {};
    if (data.name !== undefined) vetUpdate.name = data.name;
    if (data.bio !== undefined) vetUpdate.bio = data.bio;

    if (Object.keys(vetUpdate).length > 0) {
      await this.prisma.veterinarian.update({
        where: { id: tenantVet.veterinarianId },
        data: vetUpdate,
      });
    }

    const tenantUpdate: Record<string, unknown> = {};
    if (data.room !== undefined) tenantUpdate.room = data.room;
    if (data.function !== undefined) tenantUpdate.function = data.function;
    if (data.notes !== undefined) tenantUpdate.notes = data.notes;

    if (Object.keys(tenantUpdate).length > 0) {
      await this.prisma.tenantVeterinarian.update({
        where: { id },
        data: tenantUpdate,
      });
    }

    return this.findOne(tenantId, id);
  }

  async deactivate(tenantId: string, id: string) {
    const tenantVet = await this.prisma.tenantVeterinarian.findFirst({
      where: {
        id,
        tenantId,
      },
    });

    if (!tenantVet) {
      throw new NotFoundException(`Veterinarian not found in this clinic`);
    }

    if (!tenantVet.isActive) {
      throw new BadRequestException(
        `Veterinarian association is already deactivated`,
      );
    }

    await this.prisma.tenantVeterinarian.update({
      where: { id },
      data: { isActive: false },
    });

    return this.findOne(tenantId, id);
  }

  async associateSpecialties(
    tenantId: string,
    id: string,
    specialtyIds: string[],
  ) {
    const tenantVet = await this.prisma.tenantVeterinarian.findFirst({
      where: {
        id,
        tenantId,
      },
    });

    if (!tenantVet) {
      throw new NotFoundException(`Veterinarian not found in this clinic`);
    }

    for (const specialtyId of specialtyIds) {
      const specialty = await this.prisma.specialty.findUnique({
        where: { id: specialtyId },
      });

      if (!specialty) {
        throw new NotFoundException(
          `Specialty with id "${specialtyId}" not found`,
        );
      }
    }

    await this.replaceSpecialties(tenantVet.veterinarianId, specialtyIds);

    return this.findOne(tenantId, id);
  }

  private async replaceSpecialties(
    veterinarianId: string,
    specialtyIds: string[],
  ) {
    await this.prisma.veterinarianSpecialty.deleteMany({
      where: { veterinarianId },
    });

    if (specialtyIds.length > 0) {
      await this.prisma.veterinarianSpecialty.createMany({
        data: specialtyIds.map((specialtyId) => ({
          veterinarianId,
          specialtyId,
        })),
      });
    }
  }
}
