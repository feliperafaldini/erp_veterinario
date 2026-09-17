import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AnimalVaccinationService } from './animal-vaccination.service';
import { AnimalVaccinationController } from './animal-vaccination.controller';

@Module({
  imports: [AuthModule],
  controllers: [AnimalVaccinationController],
  providers: [AnimalVaccinationService],
})
export class AnimalVaccinationModule {}
