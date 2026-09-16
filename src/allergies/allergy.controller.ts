import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { IsUUID } from 'class-validator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../auth/guards/tenant.guard';
import { AllergyService } from './allergy.service';

class FindOneParams {
  @IsUUID()
  id!: string;
}

@Controller('allergies')
@UseGuards(JwtAuthGuard, TenantGuard)
export class AllergyController {
  constructor(private readonly allergyService: AllergyService) {}

  @Get()
  findAll() {
    return this.allergyService.findAll();
  }

  @Get(':id')
  findOne(@Param() params: FindOneParams) {
    return this.allergyService.findOne(params.id);
  }
}
