import {
  IsBoolean,
  IsDate,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { AnimalSex, AnimalSize } from '@prisma/client';
import { Type } from 'class-transformer';

export class UpdateAnimalDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  name?: string;

  @IsOptional()
  @IsUUID()
  speciesId?: string;

  @IsOptional()
  @IsUUID()
  breedId?: string;

  @IsOptional()
  @IsEnum(AnimalSex)
  sex?: AnimalSex;

  @IsOptional()
  @IsBoolean()
  isCastrated?: boolean;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  castrationDate?: Date;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  dateOfBirth?: Date;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  approximateAge?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  microchip?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  photoUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  color?: string;

  @IsOptional()
  @IsEnum(AnimalSize)
  size?: AnimalSize;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}
