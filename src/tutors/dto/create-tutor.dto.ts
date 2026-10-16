import { Transform } from 'class-transformer';
import { IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { DocumentType } from '@prisma/client';
import { normalizeDocument } from '../../common/normalize-document';

export class CreateTutorDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name!: string;

  @IsEnum(DocumentType)
  documentType!: DocumentType;

  /**
   * Normalizado para somente dígitos antes da validação: `@Transform`
   * executa em `plainToInstance`, que o `ValidationPipe` executa antes de
   * `validate`, portanto `@MaxLength(14)` avalia o valor já normalizado e
   * um CNPJ mascarado (18 caracteres) é aceito.
   *
   * Entrada não-string NÃO é coagida — continua rejeitada por `@IsString()`.
   */
  @Transform(({ value }) => normalizeDocument(value))
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
