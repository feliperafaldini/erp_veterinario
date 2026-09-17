import {
  IsUUID,
  IsOptional,
  IsString,
  MaxLength,
  IsDateString,
} from 'class-validator';

export class CreateAnimalVaccinationDto {
  @IsUUID()
  vaccineId!: string;

  @IsDateString()
  applicationDate!: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  lotNumber?: string;

  @IsOptional()
  @IsDateString()
  nextDoseDate?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}
