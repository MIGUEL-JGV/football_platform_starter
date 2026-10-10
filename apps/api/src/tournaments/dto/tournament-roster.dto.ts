import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export const ROSTER_STATUSES = ['active', 'inactive'] as const;
export type RosterStatus = (typeof ROSTER_STATUSES)[number];

export class AddRosterPlayerDto {
  @IsUUID()
  playerId!: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(99)
  jerseyNumber?: number;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  position?: string;
}

export class UpdateRosterPlayerDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(99)
  jerseyNumber?: number;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  position?: string;

  @IsOptional()
  @IsIn(ROSTER_STATUSES)
  status?: RosterStatus;
}