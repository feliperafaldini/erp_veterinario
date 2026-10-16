import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { PrismaService } from '../../prisma';

interface AccessTokenPayload {
  sub?: string;
  tenantId?: string;
  sid?: string;
  scope?: string;
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException('Access token required');
    }

    let payload: AccessTokenPayload;

    try {
      payload = await this.jwtService.verifyAsync<AccessTokenPayload>(token);
    } catch {
      throw new UnauthorizedException('Invalid or expired access token');
    }

    if (payload.scope) {
      throw new UnauthorizedException('Invalid or expired access token');
    }

    if (!payload.sid) {
      throw new UnauthorizedException('Invalid or expired access token');
    }

    const session = await this.loadActiveSession(payload.sid);

    if (!session) {
      throw new UnauthorizedException('Invalid or expired access token');
    }

    const req = request as any;
    req.userId = session.userId;
    req.tenantId = session.tenantId;
    req.sessionId = session.id;

    return true;
  }

  /**
   * O access token só vale enquanto a sessão que o originou continuar válida.
   * A sessão é a fonte de verdade: logout, expiração, usuário ou tenant
   * desativado revogam o acesso imediatamente, sem esperar a expiração do JWT.
   */
  private async loadActiveSession(sessionId: string) {
    let session;

    try {
      session = await this.prisma.session.findUnique({
        where: { id: sessionId },
        include: {
          user: { select: { isActive: true } },
          tenant: { select: { isActive: true } },
        },
      });
    } catch {
      return null;
    }

    if (
      !session ||
      session.revokedAt !== null ||
      session.expiresAt <= new Date() ||
      !session.user.isActive ||
      !session.tenant.isActive
    ) {
      return null;
    }

    return session;
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
