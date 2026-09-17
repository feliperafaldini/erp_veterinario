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
import { VeterinarianModule } from '../veterinarians';
import { AnimalModule } from '../animals';
import { AnimalTutorModule } from '../animal-tutor';
import { AnimalWeightRecordModule } from '../animal-weight-record';
import { AnimalAllergyModule } from '../animal-allergy';
import { AnimalMedicationModule } from '../animal-medication';
import { AnimalVaccinationModule } from '../animal-vaccination';
import { AppointmentModule } from '../appointments';
import { ConsultationModule } from '../consultations';

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
    VeterinarianModule,
    AnimalModule,
    AnimalTutorModule,
    AnimalWeightRecordModule,
    AnimalAllergyModule,
    AnimalMedicationModule,
    AnimalVaccinationModule,
    AppointmentModule,
    ConsultationModule,
  ],
})
export class AppModule {}
