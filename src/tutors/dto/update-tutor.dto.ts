import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateTutorDto {
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
