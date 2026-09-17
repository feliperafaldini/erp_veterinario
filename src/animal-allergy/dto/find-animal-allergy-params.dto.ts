import { IsUUID } from 'class-validator';

export class FindAnimalAllergyParams {
  @IsUUID()
  animalId!: string;

  @IsUUID()
  allergyId!: string;
}
