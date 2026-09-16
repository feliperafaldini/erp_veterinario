import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../prisma';
import { HealthModule } from '../health/health.module';
import { AuthModule } from '../auth/auth.module';
import { TestModule } from '../test/test.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    HealthModule,
    AuthModule,
    TestModule,
  ],
})
export class AppModule {}
