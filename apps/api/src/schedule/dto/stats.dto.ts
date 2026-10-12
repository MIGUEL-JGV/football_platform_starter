import { IsOptional, IsUUID } from 'class-validator';

export class StatsQueryDto {
  @IsOptional()
  @IsUUID()
  phaseId?: string;
}
