import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { VaccineController } from './vaccine.controller';
import { VaccineService } from './vaccine.service';

@Module({
  imports: [AuthModule],
  controllers: [VaccineController],
  providers: [VaccineService],
})
export class VaccineModule {}
