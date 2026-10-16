import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException('Access token required');
    }

    try {
      const payload = await this.jwtService.verifyAsync(token);

      // Access token é sempre { sub, tenantId }. Tokens com `purpose`
      // (token de seleção de tenant) ou sem tenantId não autorizam rotas.
      if (
        payload.purpose ||
        typeof payload.tenantId !== 'string' ||
        !payload.tenantId
      ) {
        throw new Error('Not an access token');
      }

      const req = request as any;
      req.userId = payload.sub;
      req.tenantId = payload.tenantId;
    } catch {
      throw new UnauthorizedException('Invalid or expired access token');
    }

    return true;
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
