import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../auth/guards/tenant.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { TenantId } from '../auth/decorators/tenant-id.decorator';
import { UserId } from '../auth/decorators/user-id.decorator';
import { AnimalWeightRecordService } from './animal-weight-record.service';
import { CreateAnimalWeightRecordDto, FindAnimalParams } from './dto';

@Controller('animals/:animalId/weight')
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
export class AnimalWeightRecordController {
  constructor(
    private readonly animalWeightRecordService: AnimalWeightRecordService,
  ) {}

  @Get()
  @RequirePermissions('ANIMAL_READ')
  findAll(
    @TenantId() tenantId: string,
    @Param() params: FindAnimalParams,
  ) {
    return this.animalWeightRecordService.findAll(tenantId, params.animalId);
  }

  @Post()
  @RequirePermissions('ANIMAL_UPDATE')
  create(
    @TenantId() tenantId: string,
    @UserId() userId: string,
    @Param() params: FindAnimalParams,
    @Body() dto: CreateAnimalWeightRecordDto,
  ) {
    return this.animalWeightRecordService.create(
      tenantId,
      params.animalId,
      userId,
      dto,
    );
  }
}
