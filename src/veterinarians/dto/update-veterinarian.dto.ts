import { IsOptional, IsString, MaxLength } from 'class-validator';

// Dados do vínculo TenantVeterinarian. name/bio são dados GLOBAIS do
// Veterinarian e são alterados apenas por PATCH /veterinarians/me
// (regra decidida em 2026-10-16, docs/business-rules.md).
export class UpdateVeterinarianDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  room?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  function?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}
