import { IsNotEmpty, IsUUID } from 'class-validator';

/**
 * A identidade (`userId`) não vem do corpo: é lida do token de seleção
 * enviado no header `Authorization` pelo `SelectionTokenGuard`.
 */
export class SelectTenantDto {
  @IsUUID()
  @IsNotEmpty()
  tenantId!: string;
}
