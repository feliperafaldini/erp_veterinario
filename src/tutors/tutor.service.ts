import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { Prisma, DocumentType } from '@prisma/client';
import { PrismaService } from '../prisma';
import { normalizeDocument } from '../common/normalize-document';

/**
 * Violação de unicidade do Postgres (P2002).
 *
 * Preferido ao teste por mensagem (usado em `animal-tutor.service.ts`): o
 * código de erro é contrato estável do Prisma, enquanto a mensagem varia
 * com o formato e o idioma do erro reportado.
 */
function isUniqueViolation(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2002'
  );
}

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
    /**
     * Normalização defensiva: o DTO já normaliza via `@Transform`, mas este
     * service também é chamável fora do caminho HTTP. Usar sempre o valor
     * normalizado no lookup e na escrita, senão a identidade se fragmenta.
     */
    const documentNumber = normalizeDocument(data.documentNumber);

    let tutorIdentity = await this.prisma.tutorIdentity.findUnique({
      where: {
        documentType_documentNumber: {
          documentType: data.documentType,
          documentNumber,
        },
      },
    });

    if (!tutorIdentity) {
      // Outra identidade pode ter sido criada entre o `findUnique` e o
      // `create` (mesmo documento sob outro tipo, ou mesmo par). O banco é a
      // autoridade; em vez de deixar o P2002 virar 500, tenta localizar a
      // identidade que venceu e reutiliza.
      try {
        tutorIdentity = await this.prisma.tutorIdentity.create({
          data: {
            name: data.name,
            documentType: data.documentType,
            documentNumber,
          },
        });
      } catch (error: unknown) {
        if (!isUniqueViolation(error)) {
          throw error;
        }

        tutorIdentity = await this.prisma.tutorIdentity.findUnique({
          where: {
            documentType_documentNumber: {
              documentType: data.documentType,
              documentNumber,
            },
          },
        });

        if (!tutorIdentity) {
          // Violação em `documentNumber` isolado (mesmo CPF cadastrado sob
          // tipos diferentes): a constraint global venceu e não há identidade
          // recuperável por este par. Conflito explícito, nunca 500.
          throw new ConflictException(
            `A TutorIdentity with this document already exists`,
          );
        }
      }
    }

    if (tutorIdentity.name !== data.name) {
      throw new ConflictException(
        `A TutorIdentity with this document already exists with a different name`,
      );
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

    /**
     * As duas unicidades de `Tutor` (`tenantId_tutorIdentityId` e
     * `tenantId_email`) já são pré-verificadas acima, mas a verificação e a
     * escrita não são atômicas: duas requisições simultâneas podem passar
     * pelas duas leituras e ambas tentar inserir. O banco decide — e a
     * violação vira 409 com a mensagem correspondente, nunca 500.
     */
    try {
      return await this.prisma.tutor.create({
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
    } catch (error: unknown) {
      if (!isUniqueViolation(error)) {
        throw error;
      }

      const target = (error as { meta?: { target?: unknown } }).meta?.target;
      const columns = Array.isArray(target) ? target.map(String) : [];

      if (columns.includes('email')) {
        throw new ConflictException(
          `A tutor with this email already exists in this clinic`,
        );
      }

      throw new ConflictException(
        `Tutor with this document is already registered in this clinic`,
      );
    }
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
