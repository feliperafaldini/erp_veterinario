import {
  IsString,
  IsOptional,
  MaxLength,
  IsUUID,
} from 'class-validator';

export class CreateDiagnosisDto {
  @IsOptional()
  @IsUUID()
  consultationId?: string;

  @IsString()
  @MaxLength(5000)
  description!: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  notes?: string;
}

export class UpdateDiagnosisDto {
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  notes?: string;
}

export class FindDiagnosisParams {
  @IsUUID()
  id!: string;
}

export class FindDiagnosesByConsultationParams {
  @IsUUID()
  consultationId!: string;
}
