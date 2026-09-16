import { Controller, Get, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../auth/guards/tenant.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { AuthenticatedRequest } from '../auth/types';

@Controller('test')
export class TestController {
  @Get('protected')
  @UseGuards(JwtAuthGuard, TenantGuard)
  protectedEndpoint(@Req() req: AuthenticatedRequest) {
    return {
      message: 'Access granted',
      userId: req.userId,
      tenantId: req.tenantId,
    };
  }

  @Get('with-permission')
  @UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
  @RequirePermissions('ANIMAL_READ')
  withPermission(@Req() req: AuthenticatedRequest) {
    return {
      message: 'Access granted with permission',
      userId: req.userId,
      tenantId: req.tenantId,
    };
  }

  @Get('without-permission')
  @UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
  @RequirePermissions('NONEXISTENT_PERMISSION')
  withoutPermission(@Req() req: AuthenticatedRequest) {
    return {
      message: 'This should not be reached',
    };
  }
}
