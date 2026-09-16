import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AllergyController } from './allergy.controller';
import { AllergyService } from './allergy.service';

@Module({
  imports: [AuthModule],
  controllers: [AllergyController],
  providers: [AllergyService],
})
export class AllergyModule {}
