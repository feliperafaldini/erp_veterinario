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
  @RequirePermissions('CONSULTATION_READ')
  findAll(@TenantId() tenantId: string) {
    return this.consultationService.findAll(tenantId);
  }

  @Get(':id')
  @RequirePermissions('CONSULTATION_READ')
  findOne(
    @TenantId() tenantId: string,
    @Param() params: FindConsultationParams,
  ) {
    return this.consultationService.findOne(tenantId, params.id);
  }

  @Post()
  @RequirePermissions('CONSULTATION_CREATE')
  create(
    @TenantId() tenantId: string,
    @Body() dto: CreateConsultationDto,
  ) {
    return this.consultationService.create(tenantId, dto);
  }

  @Patch(':id')
  @RequirePermissions('CONSULTATION_UPDATE')
  update(
    @TenantId() tenantId: string,
    @Param() params: FindConsultationParams,
    @Body() dto: UpdateConsultationDto,
  ) {
    return this.consultationService.update(tenantId, params.id, dto);
  }
}
