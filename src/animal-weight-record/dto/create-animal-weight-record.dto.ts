import {
  IsNumber,
  IsOptional,
  IsString,
  IsDate,
  Max,
  Min,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateAnimalWeightRecordDto {
  @IsNumber()
  @Min(0.01, { message: 'Weight must be greater than zero' })
  @Max(99999.99, { message: 'Weight exceeds maximum allowed value' })
  weight!: number;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  recordedAt?: Date;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}
