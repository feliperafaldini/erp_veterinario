import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { VeterinarianController } from './veterinarian.controller';
import { VeterinarianService } from './veterinarian.service';

@Module({
  imports: [AuthModule],
  controllers: [VeterinarianController],
  providers: [VeterinarianService],
})
export class VeterinarianModule {}
