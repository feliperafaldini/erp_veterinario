import {
  IsUUID,
  IsOptional,
  IsString,
  MaxLength,
  IsDateString,
} from 'class-validator';

export class CreateAnimalMedicationDto {
  @IsUUID()
  medicationId!: string;

  @IsString()
  @MaxLength(200)
  dosage!: string;

  @IsString()
  @MaxLength(200)
  frequency!: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  route?: string;

  @IsDateString()
  startDate!: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}
