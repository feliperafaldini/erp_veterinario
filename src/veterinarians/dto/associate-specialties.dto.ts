import { IsArray, IsUUID } from 'class-validator';

export class AssociateSpecialtiesDto {
  @IsArray()
  @IsUUID('4', { each: true })
  specialtyIds!: string[];
}
