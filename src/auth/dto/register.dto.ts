import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsString,
  MinLength,
} from 'class-validator';

export class RegisterDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @IsString()
  @IsNotEmpty()
  tenantName!: string;

  @IsString()
  @IsNotEmpty()
  tenantAddressLine1!: string;

  @IsString()
  @IsNotEmpty()
  tenantCity!: string;

  @IsString()
  @IsNotEmpty()
  tenantState!: string;

  @IsString()
  @IsNotEmpty()
  tenantZipCode!: string;

  @IsEnum(['CPF', 'CNPJ'] as const)
  tenantDocumentType!: 'CPF' | 'CNPJ';

  @IsString()
  @IsNotEmpty()
  tenantDocument!: string;
}
