import { IsOptional, IsString, IsDate, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateAnimalTutorDto {
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  startedAt?: Date;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  endedAt?: Date;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}
