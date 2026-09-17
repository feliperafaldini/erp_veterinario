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
import { AnimalService } from './animal.service';
import { CreateAnimalDto, UpdateAnimalDto, FindOneParams } from './dto';

@Controller('animals')
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
export class AnimalController {
  constructor(private readonly animalService: AnimalService) {}

  @Post()
  @RequirePermissions('ANIMAL_CREATE')
  create(@TenantId() tenantId: string, @Body() dto: CreateAnimalDto) {
    return this.animalService.create(tenantId, dto);
  }

  @Get()
  @RequirePermissions('ANIMAL_READ')
  findAll(@TenantId() tenantId: string) {
    return this.animalService.findAll(tenantId);
  }

  @Get(':id')
  @RequirePermissions('ANIMAL_READ')
  findOne(@TenantId() tenantId: string, @Param() params: FindOneParams) {
    return this.animalService.findOne(tenantId, params.id);
  }

  @Patch(':id')
  @RequirePermissions('ANIMAL_UPDATE')
  update(
    @TenantId() tenantId: string,
    @Param() params: FindOneParams,
    @Body() dto: UpdateAnimalDto,
  ) {
    return this.animalService.update(tenantId, params.id, dto);
  }

  @Patch(':id/deactivate')
  @RequirePermissions('ANIMAL_DEACTIVATE')
  deactivate(@TenantId() tenantId: string, @Param() params: FindOneParams) {
    return this.animalService.deactivate(tenantId, params.id);
  }

  @Post(':id/clinic')
  @RequirePermissions('ANIMAL_CREATE')
  addToClinic(@TenantId() tenantId: string, @Param() params: FindOneParams) {
    return this.animalService.addToClinic(tenantId, params.id);
  }

  @Get(':id/clinic')
  @RequirePermissions('ANIMAL_READ')
  getClinicAssociation(
    @TenantId() tenantId: string,
    @Param() params: FindOneParams,
  ) {
    return this.animalService.getClinicAssociation(tenantId, params.id);
  }

  @Patch(':id/clinic')
  @RequirePermissions('ANIMAL_UPDATE')
  updateClinicAssociation(
    @TenantId() tenantId: string,
    @Param() params: FindOneParams,
    @Body() dto: { notes?: string },
  ) {
    return this.animalService.updateClinicAssociation(tenantId, params.id, dto);
  }

  @Patch(':id/clinic/deactivate')
  @RequirePermissions('ANIMAL_DEACTIVATE')
  deactivateClinicAssociation(
    @TenantId() tenantId: string,
    @Param() params: FindOneParams,
  ) {
    return this.animalService.deactivateClinicAssociation(tenantId, params.id);
  }
}
