import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AnimalController } from './animal.controller';
import { AnimalService } from './animal.service';

@Module({
  imports: [AuthModule],
  controllers: [AnimalController],
  providers: [AnimalService],
})
export class AnimalModule {}
