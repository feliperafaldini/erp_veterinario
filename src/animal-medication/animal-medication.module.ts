import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AnimalMedicationService } from './animal-medication.service';
import { AnimalMedicationController } from './animal-medication.controller';

@Module({
  imports: [AuthModule],
  controllers: [AnimalMedicationController],
  providers: [AnimalMedicationService],
})
export class AnimalMedicationModule {}
