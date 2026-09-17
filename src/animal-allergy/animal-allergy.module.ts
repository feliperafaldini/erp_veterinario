import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AnimalAllergyController } from './animal-allergy.controller';
import { AnimalAllergyService } from './animal-allergy.service';

@Module({
  imports: [AuthModule],
  controllers: [AnimalAllergyController],
  providers: [AnimalAllergyService],
})
export class AnimalAllergyModule {}
