import {
  ConflictException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma';
import { RegisterDto, LoginDto, SelectTenantDto } from './dto';
import { SessionService } from './session.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sessionService: SessionService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

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

  async selectTenant(
    userId: string,
    dto: SelectTenantDto,
    userAgent?: string,
    ipAddress?: string,
  ) {
    const userTenant = await this.prisma.userTenant.findUnique({
      where: {
        userId_tenantId: {
          userId,
          tenantId: dto.tenantId,
        },
      },
    });

    if (!userTenant || userTenant.status !== 'ACTIVE') {
      throw new ForbiddenException('Access to this tenant is denied');
    }

    const refreshToken = this.sessionService.generateRefreshToken();
    const refreshExpirationDays = this.configService.get<number>(
      'REFRESH_TOKEN_EXPIRATION_DAYS',
      7,
    );
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + refreshExpirationDays);

    await this.sessionService.createSession({
      userId,
      tenantId: dto.tenantId,
      refreshToken,
      userAgent,
      ipAddress,
      expiresAt,
    });

    const accessToken = this.jwtService.sign(
      {
        sub: userId,
        tenantId: dto.tenantId,
      },
      {
        expiresIn: Number(this.configService.get('JWT_EXPIRATION', 900)),
      },
    );

    return {
      accessToken,
      refreshToken,
    };
  }

  async refresh(refreshToken: string) {
    const session = await this.sessionService.findSessionByRefreshToken(
      refreshToken,
    );

    if (!session) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (session.revokedAt) {
      throw new UnauthorizedException('Refresh token has been revoked');
    }

    if (session.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token has expired');
    }

    if (!session.user.isActive) {
      throw new UnauthorizedException('User account is disabled');
    }

    const accessToken = this.jwtService.sign({
      sub: session.userId,
      tenantId: session.tenantId,
    });

    await this.sessionService.updateLastAccess(session.id);

    return {
      accessToken,
    };
  }

  async logout(refreshToken: string) {
    await this.sessionService.revokeSession(refreshToken);
  }
}
