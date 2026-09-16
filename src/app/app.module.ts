import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../prisma';
import { HealthModule } from '../health/health.module';
import { AuthModule } from '../auth/auth.module';
import { SpeciesModule } from '../species';
import { BreedModule } from '../breeds';
import { SpecialtyModule } from '../specialties';
import { TutorModule } from '../tutors';
import { AllergyModule } from '../allergies';
import { VaccineModule } from '../vaccines';
import { MedicationModule } from '../medications';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    HealthModule,
    AuthModule,
    SpeciesModule,
    BreedModule,
    SpecialtyModule,
    TutorModule,
    AllergyModule,
    VaccineModule,
    MedicationModule,
  ],
})
export class AppModule {}
