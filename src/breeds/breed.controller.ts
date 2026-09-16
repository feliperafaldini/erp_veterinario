import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { IsOptional, IsUUID } from 'class-validator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../auth/guards/tenant.guard';
import { BreedService } from './breed.service';

class FindOneParams {
  @IsUUID()
  id!: string;
}

class ListBreedsQuery {
  @IsOptional()
  @IsUUID()
  speciesId?: string;
}

@Controller('breeds')
@UseGuards(JwtAuthGuard, TenantGuard)
export class BreedController {
  constructor(private readonly breedService: BreedService) {}

  @Get()
  findAll(@Query() query: ListBreedsQuery) {
    return this.breedService.findAll(query.speciesId);
  }

  @Get(':id')
  findOne(@Param() params: FindOneParams) {
    return this.breedService.findOne(params.id);
  }
}
