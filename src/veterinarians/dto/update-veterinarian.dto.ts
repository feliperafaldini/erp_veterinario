import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateVeterinarianDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  bio?: string;

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
