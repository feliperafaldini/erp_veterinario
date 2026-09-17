import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../auth/guards/tenant.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { TenantId } from '../auth/decorators/tenant-id.decorator';
import { ConsultationService } from './consultation.service';
import {
  CreateConsultationDto,
  UpdateConsultationDto,
  FindConsultationParams,
} from './dto';

@Controller('consultations')
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
export class ConsultationController {
  constructor(private readonly consultationService: ConsultationService) {}

  @Get()
  @RequirePermissions('ANIMAL_READ')
  findAll(@TenantId() tenantId: string) {
    return this.consultationService.findAll(tenantId);
  }

  @Get(':id')
  @RequirePermissions('ANIMAL_READ')
  findOne(
    @TenantId() tenantId: string,
    @Param() params: FindConsultationParams,
  ) {
    return this.consultationService.findOne(tenantId, params.id);
  }

  @Post()
  @RequirePermissions('ANIMAL_UPDATE')
  create(
    @TenantId() tenantId: string,
    @Body() dto: CreateConsultationDto,
  ) {
    return this.consultationService.create(tenantId, dto);
  }

  @Patch(':id')
  @RequirePermissions('ANIMAL_UPDATE')
  update(
    @TenantId() tenantId: string,
    @Param() params: FindConsultationParams,
    @Body() dto: UpdateConsultationDto,
  ) {
    return this.consultationService.update(tenantId, params.id, dto);
  }
}
