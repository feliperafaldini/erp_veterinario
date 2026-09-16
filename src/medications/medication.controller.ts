import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { IsUUID } from 'class-validator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../auth/guards/tenant.guard';
import { MedicationService } from './medication.service';

class FindOneParams {
  @IsUUID()
  id!: string;
}

@Controller('medications')
@UseGuards(JwtAuthGuard, TenantGuard)
export class MedicationController {
  constructor(private readonly medicationService: MedicationService) {}

  @Get()
  findAll() {
    return this.medicationService.findAll();
  }

  @Get(':id')
  findOne(@Param() params: FindOneParams) {
    return this.medicationService.findOne(params.id);
  }
}
