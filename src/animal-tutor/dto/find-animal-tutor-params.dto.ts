import { IsUUID } from 'class-validator';

export class FindAnimalTutorParams {
  @IsUUID()
  animalId!: string;

  @IsUUID()
  tutorId!: string;
}
