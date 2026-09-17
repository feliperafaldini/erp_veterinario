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
import { UserId } from '../auth/decorators/user-id.decorator';
import { AppointmentService } from './appointment.service';
import {
  CreateAppointmentDto,
  UpdateAppointmentDto,
  FindAppointmentParams,
} from './dto';

@Controller('appointments')
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
export class AppointmentController {
  constructor(private readonly appointmentService: AppointmentService) {}

  @Get()
  @RequirePermissions('ANIMAL_READ')
  findAll(@TenantId() tenantId: string) {
    return this.appointmentService.findAll(tenantId);
  }

  @Get(':id')
  @RequirePermissions('ANIMAL_READ')
  findOne(
    @TenantId() tenantId: string,
    @Param() params: FindAppointmentParams,
  ) {
    return this.appointmentService.findOne(tenantId, params.id);
  }

  @Post()
  @RequirePermissions('ANIMAL_UPDATE')
  create(
    @TenantId() tenantId: string,
    @UserId() userId: string,
    @Body() dto: CreateAppointmentDto,
  ) {
    return this.appointmentService.create(tenantId, userId, dto);
  }

  @Patch(':id')
  @RequirePermissions('ANIMAL_UPDATE')
  update(
    @TenantId() tenantId: string,
    @Param() params: FindAppointmentParams,
    @Body() dto: UpdateAppointmentDto,
  ) {
    return this.appointmentService.update(tenantId, params.id, dto);
  }

}
