import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { AuthenticatedRequest } from '../types';

/**
 * Protege `POST /api/auth/select-tenant`.
 *
 * A identidade não vem do corpo da requisição: o cliente envia o token de
 * seleção emitido por `POST /api/auth/register` ou `POST /api/auth/login`
 * (`{ sub, purpose: 'tenant-selection' }`), e daqui sai o `userId`.
 */
@Injectable()
export class SelectionTokenGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const [type, token] = request.headers.authorization?.split(' ') ?? [];

    if (type !== 'Bearer' || !token) {
      throw new UnauthorizedException('Selection token required');
    }

    let payload: { sub?: string; purpose?: string };
    try {
      payload = await this.jwtService.verifyAsync(token);
    } catch {
      throw new UnauthorizedException('Invalid or expired selection token');
    }

    if (payload.purpose !== 'tenant-selection' || !payload.sub) {
      throw new UnauthorizedException('Invalid or expired selection token');
    }

    const req = request as AuthenticatedRequest;
    req.userId = payload.sub;

    return true;
  }
}
