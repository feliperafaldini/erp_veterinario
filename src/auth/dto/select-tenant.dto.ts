import { IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class SelectTenantDto {
  @IsUUID()
  @IsNotEmpty()
  userId!: string;

  @IsUUID()
  @IsNotEmpty()
  tenantId!: string;
}
