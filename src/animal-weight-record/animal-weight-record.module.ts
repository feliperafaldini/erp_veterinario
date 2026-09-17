import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AnimalWeightRecordController } from './animal-weight-record.controller';
import { AnimalWeightRecordService } from './animal-weight-record.service';

@Module({
  imports: [AuthModule],
  controllers: [AnimalWeightRecordController],
  providers: [AnimalWeightRecordService],
})
export class AnimalWeightRecordModule {}
