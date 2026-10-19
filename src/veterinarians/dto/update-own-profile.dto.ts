import { IsOptional, IsString, MaxLength } from 'class-validator';

// Dados GLOBAIS do Veterinarian: somente o próprio veterinário (o User
// vinculado, Veterinarian.userId) pode alterá-los — regra decidida em
// 2026-10-16 (docs/business-rules.md).
export class UpdateOwnProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  bio?: string;
}
