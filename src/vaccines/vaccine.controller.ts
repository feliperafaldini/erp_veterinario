import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { IsUUID } from 'class-validator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../auth/guards/tenant.guard';
import { VaccineService } from './vaccine.service';

class FindOneParams {
  @IsUUID()
  id!: string;
}

@Controller('vaccines')
@UseGuards(JwtAuthGuard, TenantGuard)
export class VaccineController {
  constructor(private readonly vaccineService: VaccineService) {}

  @Get()
  findAll() {
    return this.vaccineService.findAll();
  }

  @Get(':id')
  findOne(@Param() params: FindOneParams) {
    return this.vaccineService.findOne(params.id);
  }
}
