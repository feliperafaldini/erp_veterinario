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
import { AnimalTutorService } from './animal-tutor.service';
import {
  CreateAnimalTutorDto,
  UpdateAnimalTutorDto,
  FindAnimalParams,
  FindAnimalTutorParams,
} from './dto';

@Controller('animals/:animalId/tutors')
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
export class AnimalTutorController {
  constructor(private readonly animalTutorService: AnimalTutorService) {}

  @Get()
  @RequirePermissions('ANIMAL_READ')
  findAll(
    @TenantId() tenantId: string,
    @Param() params: FindAnimalParams,
  ) {
    return this.animalTutorService.findAll(tenantId, params.animalId);
  }

  @Post()
  @RequirePermissions('ANIMAL_UPDATE')
  create(
    @TenantId() tenantId: string,
    @Param() params: FindAnimalParams,
    @Body() dto: CreateAnimalTutorDto,
  ) {
    return this.animalTutorService.create(tenantId, params.animalId, dto);
  }

  @Patch(':tutorId')
  @RequirePermissions('ANIMAL_UPDATE')
  update(
    @TenantId() tenantId: string,
    @Param() params: FindAnimalTutorParams,
    @Body() dto: UpdateAnimalTutorDto,
  ) {
    return this.animalTutorService.update(
      tenantId,
      params.animalId,
      params.tutorId,
      dto,
    );
  }

  @Patch(':tutorId/deactivate')
  @RequirePermissions('ANIMAL_UPDATE')
  deactivate(
    @TenantId() tenantId: string,
    @Param() params: FindAnimalTutorParams,
  ) {
    return this.animalTutorService.deactivate(
      tenantId,
      params.animalId,
      params.tutorId,
    );
  }
}
