import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsIn,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Length,
  Min,
} from 'class-validator';
import { PhaseType } from '@prisma/client';

export const PHASE_STATUSES = ['pending', 'active', 'finished', 'cancelled'] as const;
export type PhaseStatus = (typeof PHASE_STATUSES)[number];

export class CreatePhaseDto {
  @IsString()
  @Length(2, 120)
  name!: string;

  @IsEnum(PhaseType)
  phaseType!: PhaseType;

  @IsOptional()
  @IsIn(PHASE_STATUSES)
  status?: PhaseStatus;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsObject()
  rulesOverride?: object;
}

export class UpdatePhaseDto {
  @IsOptional()
  @IsString()
  @Length(2, 120)
  name?: string;

  @IsOptional()
  @IsEnum(PhaseType)
  phaseType?: PhaseType;

  @IsOptional()
  @IsIn(PHASE_STATUSES)
  status?: PhaseStatus;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  sequence?: number;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsObject()
  rulesOverride?: object;
}

export class CreateMatchdayDto {
  @IsString()
  @Length(2, 100)
  name!: string;

  @IsOptional()
  @IsDateString()
  scheduledDate?: string;
}

export class UpdateMatchdayDto {
  @IsOptional()
  @IsString()
  @Length(2, 100)
  name?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  sequence?: number;

  @IsOptional()
  @IsDateString()
  scheduledDate?: string;
}