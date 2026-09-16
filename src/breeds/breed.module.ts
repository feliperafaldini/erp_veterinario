import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { BreedController } from './breed.controller';
import { BreedService } from './breed.service';

@Module({
  imports: [AuthModule],
  controllers: [BreedController],
  providers: [BreedService],
})
export class BreedModule {}
