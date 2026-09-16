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
import { TutorService } from './tutor.service';
import { CreateTutorDto, UpdateTutorDto, FindOneParams } from './dto';

@Controller('tutors')
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
export class TutorController {
  constructor(private readonly tutorService: TutorService) {}

  @Post()
  @RequirePermissions('TUTOR_CREATE')
  create(@TenantId() tenantId: string, @Body() dto: CreateTutorDto) {
    return this.tutorService.create(tenantId, dto);
  }

  @Get()
  @RequirePermissions('TUTOR_READ')
  findAll(@TenantId() tenantId: string) {
    return this.tutorService.findAll(tenantId);
  }

  @Get(':id')
  @RequirePermissions('TUTOR_READ')
  findOne(@TenantId() tenantId: string, @Param() params: FindOneParams) {
    return this.tutorService.findOne(tenantId, params.id);
  }

  @Patch(':id')
  @RequirePermissions('TUTOR_UPDATE')
  update(
    @TenantId() tenantId: string,
    @Param() params: FindOneParams,
    @Body() dto: UpdateTutorDto,
  ) {
    return this.tutorService.update(tenantId, params.id, dto);
  }

  @Patch(':id/deactivate')
  @RequirePermissions('TUTOR_DEACTIVATE')
  deactivate(@TenantId() tenantId: string, @Param() params: FindOneParams) {
    return this.tutorService.deactivate(tenantId, params.id);
  }
}
