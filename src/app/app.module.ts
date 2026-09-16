import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../prisma';
import { HealthModule } from '../health/health.module';
import { AuthModule } from '../auth/auth.module';
import { SpeciesModule } from '../species';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    HealthModule,
    AuthModule,
    SpeciesModule,
  ],
})
export class AppModule {}
