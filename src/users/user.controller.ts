import { Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../auth/guards/tenant.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { TenantId } from '../auth/decorators/tenant-id.decorator';
import { UserId } from '../auth/decorators/user-id.decorator';
import { UserService } from './user.service';
import { FindOneParams } from './dto';

// Gestão de usuários e vínculos (decisões de 2026-10-19):
// - Rotas de vínculo exigem USER_MANAGE e operam só no tenant da sessão.
// - deactivate/activate operam no User GLOBAL e exigem Platform Admin —
//   a checagem é feita no service sobre o usuário autenticado; a rota não
//   aceita id de quem executa, apenas o do alvo.
@Controller('users')
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get()
  @RequirePermissions('USER_MANAGE')
  findAll(@TenantId() tenantId: string) {
    return this.userService.findAll(tenantId);
  }

  @Patch(':id/suspend')
  @RequirePermissions('USER_MANAGE')
  suspend(@TenantId() tenantId: string, @Param() params: FindOneParams) {
    return this.userService.setLinkStatus(tenantId, params.id, 'SUSPENDED');
  }

  @Patch(':id/revoke')
  @RequirePermissions('USER_MANAGE')
  revoke(@TenantId() tenantId: string, @Param() params: FindOneParams) {
    return this.userService.setLinkStatus(tenantId, params.id, 'REVOKED');
  }

  @Patch(':id/restore')
  @RequirePermissions('USER_MANAGE')
  restore(@TenantId() tenantId: string, @Param() params: FindOneParams) {
    return this.userService.setLinkStatus(tenantId, params.id, 'ACTIVE');
  }

  // Sem @RequirePermissions: o guard sem metadata deixa passar e o
  // service valida isPlatformAdmin (efeito global, corte em todos os
  // tenants — decisão de 2026-10-19).
  @Patch(':id/deactivate')
  deactivate(@UserId() userId: string, @Param() params: FindOneParams) {
    return this.userService.deactivate(params.id, userId);
  }

  @Patch(':id/activate')
  activate(@UserId() userId: string, @Param() params: FindOneParams) {
    return this.userService.activate(params.id, userId);
  }
}
