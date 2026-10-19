import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
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
import { DiagnosisModule } from '../diagnosis';
import { UsersModule } from '../users';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        errorMessage: 'Too many requests',
        throttlers: [
          {
            name: 'auth',
            ttl: Number(config.get('AUTH_THROTTLE_TTL_MS', 60000)),
            limit: Number(config.get('AUTH_THROTTLE_LIMIT', 60)),
          },
        ],
      }),
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
    DiagnosisModule,
    UsersModule,
  ],
})
export class AppModule {}
