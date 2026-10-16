import { IsNotEmpty, IsUUID } from 'class-validator';

export class SelectTenantDto {
  @IsUUID()
  @IsNotEmpty()
  tenantId!: string;
}
