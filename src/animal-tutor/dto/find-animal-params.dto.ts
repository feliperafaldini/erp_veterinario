import { IsUUID } from 'class-validator';

export class FindAnimalParams {
  @IsUUID()
  animalId!: string;
}
