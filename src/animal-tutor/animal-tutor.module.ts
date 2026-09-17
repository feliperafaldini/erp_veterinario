import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AnimalTutorController } from './animal-tutor.controller';
import { AnimalTutorService } from './animal-tutor.service';

@Module({
  imports: [AuthModule],
  controllers: [AnimalTutorController],
  providers: [AnimalTutorService],
})
export class AnimalTutorModule {}
