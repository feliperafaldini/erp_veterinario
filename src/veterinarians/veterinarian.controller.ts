import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../auth/guards/tenant.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { TenantId } from '../auth/decorators/tenant-id.decorator';
import { UserId } from '../auth/decorators/user-id.decorator';
import { VeterinarianService } from './veterinarian.service';
import {
  CreateVeterinarianDto,
  UpdateVeterinarianDto,
  UpdateOwnProfileDto,
  FindOneParams,
  AssociateSpecialtiesDto,
} from './dto';

@Controller('veterinarians')
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
export class VeterinarianController {
  constructor(private readonly veterinarianService: VeterinarianService) {}

  @Post()
  @RequirePermissions('VETERINARIAN_CREATE')
  create(
    @UserId() userId: string,
    @TenantId() tenantId: string,
    @Body() dto: CreateVeterinarianDto,
  ) {
    return this.veterinarianService.create(userId, tenantId, dto);
  }

  @Get()
  @RequirePermissions('VETERINARIAN_READ')
  findAll(@TenantId() tenantId: string) {
    return this.veterinarianService.findAll(tenantId);
  }

  @Get(':id')
  @RequirePermissions('VETERINARIAN_READ')
  findOne(@TenantId() tenantId: string, @Param() params: FindOneParams) {
    return this.veterinarianService.findOne(tenantId, params.id);
  }

  // Dados GLOBAIS do próprio Veterinarian (name/bio). A posse é resolvida
  // no serviço a partir do usuário autenticado — nenhum id de terceiro na rota.
  @Patch('me')
  updateOwnProfile(
    @UserId() userId: string,
    @Body() dto: UpdateOwnProfileDto,
  ) {
    return this.veterinarianService.updateOwnProfile(userId, dto);
  }

  @Patch(':id')
  @RequirePermissions('VETERINARIAN_UPDATE')
  update(
    @TenantId() tenantId: string,
    @Param() params: FindOneParams,
    @Body() dto: UpdateVeterinarianDto,
  ) {
    return this.veterinarianService.update(tenantId, params.id, dto);
  }

  @Patch(':id/deactivate')
  @RequirePermissions('VETERINARIAN_DEACTIVATE')
  deactivate(@TenantId() tenantId: string, @Param() params: FindOneParams) {
    return this.veterinarianService.deactivate(tenantId, params.id);
  }

  // Especialidades são globais do Veterinarian: somente o próprio
  // veterinário as altera (docs/business-rules.md, decisão de 2026-10-16).
  @Put('me/specialties')
  replaceOwnSpecialties(
    @UserId() userId: string,
    @Body() dto: AssociateSpecialtiesDto,
  ) {
    return this.veterinarianService.replaceOwnSpecialties(
      userId,
      dto.specialtyIds,
    );
  }
}
