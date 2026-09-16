import { Injectable } from '@nestjs/common';
import { createHash, randomBytes } from 'crypto';
import { PrismaService } from '../prisma';

const REFRESH_TOKEN_BYTES = 32;

@Injectable()
export class SessionService {
  constructor(private readonly prisma: PrismaService) {}

  generateRefreshToken(): string {
    return randomBytes(REFRESH_TOKEN_BYTES).toString('base64url');
  }

  hashRefreshToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  async createSession(params: {
    userId: string;
    tenantId: string;
    refreshToken: string;
    userAgent?: string;
    ipAddress?: string;
    expiresAt: Date;
  }) {
    const refreshTokenHash = this.hashRefreshToken(params.refreshToken);

    return this.prisma.session.create({
      data: {
        userId: params.userId,
        tenantId: params.tenantId,
        refreshTokenHash,
        userAgent: params.userAgent,
        ipAddress: params.ipAddress,
        expiresAt: params.expiresAt,
      },
    });
  }

  async findSessionByRefreshToken(refreshToken: string) {
    const refreshTokenHash = this.hashRefreshToken(refreshToken);

    return this.prisma.session.findFirst({
      where: { refreshTokenHash },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            isActive: true,
          },
        },
        tenant: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  }

  async revokeSession(refreshToken: string) {
    const refreshTokenHash = this.hashRefreshToken(refreshToken);

    return this.prisma.session.updateMany({
      where: {
        refreshTokenHash,
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
      },
    });
  }

  async updateLastAccess(sessionId: string) {
    return this.prisma.session.update({
      where: { id: sessionId },
      data: { lastAccessAt: new Date() },
    });
  }
}
