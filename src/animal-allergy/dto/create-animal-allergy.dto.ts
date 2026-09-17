import { IsUUID, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateAnimalAllergyDto {
  @IsUUID()
  allergyId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  severity?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}
