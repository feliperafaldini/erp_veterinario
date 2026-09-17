import { IsUUID, IsOptional, IsString, IsDate, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateAnimalTutorDto {
  @IsUUID()
  tutorId!: string;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  startedAt?: Date;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}
