import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma';
import { DocumentType } from '@prisma/client';

@Injectable()
export class TutorService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    tenantId: string,
    data: {
      name: string;
      documentType: DocumentType;
      documentNumber: string;
      email?: string;
      additionalInfo?: string;
      notes?: string;
    },
  ) {
    let tutorIdentity = await this.prisma.tutorIdentity.findUnique({
      where: {
        documentType_documentNumber: {
          documentType: data.documentType,
          documentNumber: data.documentNumber,
        },
      },
    });

    if (tutorIdentity) {
      if (tutorIdentity.name !== data.name) {
        throw new ConflictException(
          `A TutorIdentity with this document already exists with a different name`,
        );
      }
    } else {
      tutorIdentity = await this.prisma.tutorIdentity.create({
        data: {
          name: data.name,
          documentType: data.documentType,
          documentNumber: data.documentNumber,
        },
      });
    }

    const existingInTenant = await this.prisma.tutor.findUnique({
      where: {
        tenantId_tutorIdentityId: {
          tenantId,
          tutorIdentityId: tutorIdentity.id,
        },
      },
    });

    if (existingInTenant) {
      throw new ConflictException(
        `Tutor with this document is already registered in this clinic`,
      );
    }

    if (data.email) {
      const existingEmail = await this.prisma.tutor.findUnique({
        where: {
          tenantId_email: {
            tenantId,
            email: data.email,
          },
        },
      });

      if (existingEmail) {
        throw new ConflictException(
          `A tutor with this email already exists in this clinic`,
        );
      }
    }

    return this.prisma.tutor.create({
      data: {
        tenantId,
        tutorIdentityId: tutorIdentity.id,
        email: data.email,
        additionalInfo: data.additionalInfo,
        notes: data.notes,
      },
      select: {
        id: true,
        tenantId: true,
        email: true,
        additionalInfo: true,
        isActive: true,
        notes: true,
        createdAt: true,
        updatedAt: true,
        tutorIdentity: {
          select: {
            id: true,
            name: true,
            documentType: true,
            documentNumber: true,
          },
        },
      },
    });
  }

  async findAll(tenantId: string) {
    return this.prisma.tutor.findMany({
      where: {
        tenantId,
        isActive: true,
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        tenantId: true,
        email: true,
        additionalInfo: true,
        isActive: true,
        notes: true,
        createdAt: true,
        updatedAt: true,
        tutorIdentity: {
          select: {
            id: true,
            name: true,
            documentType: true,
            documentNumber: true,
          },
        },
      },
    });
  }

  async findOne(tenantId: string, id: string) {
    const tutor = await this.prisma.tutor.findFirst({
      where: {
        id,
        tenantId,
      },
      select: {
        id: true,
        tenantId: true,
        email: true,
        additionalInfo: true,
        isActive: true,
        notes: true,
        createdAt: true,
        updatedAt: true,
        tutorIdentity: {
          select: {
            id: true,
            name: true,
            documentType: true,
            documentNumber: true,
          },
        },
      },
    });

    if (!tutor) {
      throw new NotFoundException(`Tutor with id "${id}" not found`);
    }

    return tutor;
  }

  async update(
    tenantId: string,
    id: string,
    data: {
      email?: string;
      additionalInfo?: string;
      notes?: string;
    },
  ) {
    const tutor = await this.prisma.tutor.findFirst({
      where: {
        id,
        tenantId,
      },
    });

    if (!tutor) {
      throw new NotFoundException(`Tutor with id "${id}" not found`);
    }

    if (data.email && data.email !== tutor.email) {
      const existingEmail = await this.prisma.tutor.findUnique({
        where: {
          tenantId_email: {
            tenantId,
            email: data.email,
          },
        },
      });

      if (existingEmail) {
        throw new ConflictException(
          `A tutor with this email already exists in this clinic`,
        );
      }
    }

    return this.prisma.tutor.update({
      where: { id },
      data: {
        email: data.email,
        additionalInfo: data.additionalInfo,
        notes: data.notes,
      },
      select: {
        id: true,
        tenantId: true,
        email: true,
        additionalInfo: true,
        isActive: true,
        notes: true,
        createdAt: true,
        updatedAt: true,
        tutorIdentity: {
          select: {
            id: true,
            name: true,
            documentType: true,
            documentNumber: true,
          },
        },
      },
    });
  }

  async deactivate(tenantId: string, id: string) {
    const tutor = await this.prisma.tutor.findFirst({
      where: {
        id,
        tenantId,
      },
    });

    if (!tutor) {
      throw new NotFoundException(`Tutor with id "${id}" not found`);
    }

    if (!tutor.isActive) {
      throw new BadRequestException(`Tutor is already deactivated`);
    }

    return this.prisma.tutor.update({
      where: { id },
      data: { isActive: false },
      select: {
        id: true,
        tenantId: true,
        email: true,
        additionalInfo: true,
        isActive: true,
        notes: true,
        createdAt: true,
        updatedAt: true,
        tutorIdentity: {
          select: {
            id: true,
            name: true,
            documentType: true,
            documentNumber: true,
          },
        },
      },
    });
  }
}
