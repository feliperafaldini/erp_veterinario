import {
  IsUUID,
  IsOptional,
  IsString,
  MaxLength,
  IsDateString,
  IsEnum,
} from 'class-validator';

export enum ConsultationStatus {
  OPEN = 'OPEN',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export class CreateConsultationDto {
  @IsOptional()
  @IsUUID()
  appointmentId?: string;

  @IsUUID()
  animalId!: string;

  @IsUUID()
  veterinarianId!: string;

  @IsOptional()
  @IsUUID()
  tutorId?: string;

  @IsDateString()
  startedAt!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  chiefComplaint?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  anamnesis?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  physicalExam?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  clinicalNotes?: string;
}

export class UpdateConsultationDto {
  @IsOptional()
  @IsDateString()
  finishedAt?: string;

  @IsOptional()
  @IsEnum(ConsultationStatus)
  status?: ConsultationStatus;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  chiefComplaint?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  anamnesis?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  physicalExam?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  clinicalNotes?: string;
}

export class FindConsultationParams {
  @IsUUID()
  id!: string;
}
