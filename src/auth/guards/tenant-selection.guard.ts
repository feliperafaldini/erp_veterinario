import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';

@Injectable()
export class TenantSelectionGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException('Tenant selection token required');
    }

    try {
      const payload = await this.jwtService.verifyAsync(token);

      if (payload.scope !== 'tenant-selection') {
        throw new UnauthorizedException('Invalid tenant selection token');
      }

      if ('tenantId' in payload) {
        throw new UnauthorizedException('Invalid tenant selection token');
      }

      const req = request as any;
      req.userId = payload.sub;
    } catch {
      throw new UnauthorizedException('Invalid or expired tenant selection token');
    }

    return true;
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
