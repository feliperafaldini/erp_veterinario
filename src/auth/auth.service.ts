import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import * as argon2 from 'argon2';
import { PrismaService } from '../prisma';
import { RegisterDto, LoginDto } from './dto';

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService) {}

  async register(dto: RegisterDto) {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existingUser) {
      throw new ConflictException('Email already registered');
    }

    const passwordHash = await argon2.hash(dto.password);

    const result = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name: dto.name,
          email: dto.email,
          passwordHash,
        },
      });

      const tenantData = {
        name: dto.tenantName,
        addressLine1: dto.tenantAddressLine1,
        city: dto.tenantCity,
        state: dto.tenantState,
        zipCode: dto.tenantZipCode,
        ...(dto.tenantDocumentType === 'CPF'
          ? { cpf: dto.tenantDocument }
          : { cnpj: dto.tenantDocument }),
      };

      const tenant = await tx.tenant.create({
        data: tenantData,
      });

      const adminRole = await tx.role.findUniqueOrThrow({
        where: { name: 'ADMIN' },
      });

      const userTenant = await tx.userTenant.create({
        data: {
          userId: user.id,
          tenantId: tenant.id,
          status: 'ACTIVE',
          acceptedAt: new Date(),
        },
      });

      await tx.userTenantRole.create({
        data: {
          userTenantId: userTenant.id,
          roleId: adminRole.id,
        },
      });

      return { user, tenant, userTenant };
    });

    return {
      user: {
        id: result.user.id,
        name: result.user.name,
        email: result.user.email,
      },
      tenant: {
        id: result.tenant.id,
        name: result.tenant.name,
      },
    };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const passwordValid = await argon2.verify(user.passwordHash, dto.password);

    if (!passwordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const userTenants = await this.prisma.userTenant.findMany({
      where: {
        userId: user.id,
        status: 'ACTIVE',
      },
      include: {
        tenant: {
          select: {
            id: true,
            name: true,
            logoUrl: true,
          },
        },
      },
    });

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
      tenants: userTenants.map((ut) => ({
        id: ut.tenant.id,
        name: ut.tenant.name,
        logoUrl: ut.tenant.logoUrl,
      })),
    };
  }
}
