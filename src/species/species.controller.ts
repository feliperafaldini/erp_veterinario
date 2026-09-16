import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { IsUUID } from 'class-validator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../auth/guards/tenant.guard';
import { SpeciesService } from './species.service';

class FindOneParams {
  @IsUUID()
  id!: string;
}

@Controller('species')
@UseGuards(JwtAuthGuard, TenantGuard)
export class SpeciesController {
  constructor(private readonly speciesService: SpeciesService) {}

  @Get()
  findAll() {
    return this.speciesService.findAll();
  }

  @Get(':id')
  findOne(@Param() params: FindOneParams) {
    return this.speciesService.findOne(params.id);
  }
}
