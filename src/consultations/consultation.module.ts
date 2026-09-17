import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ConsultationService } from './consultation.service';
import { ConsultationController } from './consultation.controller';

@Module({
  imports: [AuthModule],
  controllers: [ConsultationController],
  providers: [ConsultationService],
})
export class ConsultationModule {}
