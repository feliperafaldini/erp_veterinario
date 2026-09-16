import { IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { DocumentType } from '@prisma/client';

export class CreateTutorDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name!: string;

  @IsEnum(DocumentType)
  documentType!: DocumentType;

  @IsString()
  @IsNotEmpty()
  @MaxLength(14)
  documentNumber!: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  additionalInfo?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}
