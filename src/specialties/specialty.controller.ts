import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { IsUUID } from 'class-validator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../auth/guards/tenant.guard';
import { SpecialtyService } from './specialty.service';

class FindOneParams {
  @IsUUID()
  id!: string;
}

@Controller('specialties')
@UseGuards(JwtAuthGuard, TenantGuard)
export class SpecialtyController {
  constructor(private readonly specialtyService: SpecialtyService) {}

  @Get()
  findAll() {
    return this.specialtyService.findAll();
  }

  @Get(':id')
  findOne(@Param() params: FindOneParams) {
    return this.specialtyService.findOne(params.id);
  }
}
