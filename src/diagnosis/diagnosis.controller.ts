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
import { DiagnosisService } from './diagnosis.service';
import {
  CreateDiagnosisDto,
  UpdateDiagnosisDto,
  FindDiagnosisParams,
  FindDiagnosesByConsultationParams,
} from './dto';

@Controller()
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
export class DiagnosisController {
  constructor(private readonly diagnosisService: DiagnosisService) {}

  @Get('consultations/:consultationId/diagnoses')
  @RequirePermissions('ANIMAL_READ')
  findByConsultation(
    @TenantId() tenantId: string,
    @Param() params: FindDiagnosesByConsultationParams,
  ) {
    return this.diagnosisService.findByConsultation(
      tenantId,
      params.consultationId,
    );
  }

  @Post('consultations/:consultationId/diagnoses')
  @RequirePermissions('ANIMAL_UPDATE')
  create(
    @TenantId() tenantId: string,
    @Param() params: FindDiagnosesByConsultationParams,
    @Body() dto: CreateDiagnosisDto,
  ) {
    return this.diagnosisService.create(tenantId, {
      ...dto,
      consultationId: params.consultationId,
    });
  }

  @Get('diagnoses/:id')
  @RequirePermissions('ANIMAL_READ')
  findOne(
    @TenantId() tenantId: string,
    @Param() params: FindDiagnosisParams,
  ) {
    return this.diagnosisService.findOne(tenantId, params.id);
  }

  @Patch('diagnoses/:id')
  @RequirePermissions('ANIMAL_UPDATE')
  update(
    @TenantId() tenantId: string,
    @Param() params: FindDiagnosisParams,
    @Body() dto: UpdateDiagnosisDto,
  ) {
    return this.diagnosisService.update(tenantId, params.id, dto);
  }

  @Patch('diagnoses/:id/deactivate')
  @RequirePermissions('ANIMAL_UPDATE')
  deactivate(
    @TenantId() tenantId: string,
    @Param() params: FindDiagnosisParams,
  ) {
    return this.diagnosisService.deactivate(tenantId, params.id);
  }
}
