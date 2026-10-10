import { IsUUID } from 'class-validator';

export class ApplyEntryDto {
  @IsUUID()
  teamId!: string;
}