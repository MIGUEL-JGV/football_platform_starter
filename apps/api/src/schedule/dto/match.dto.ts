import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsUUID,
  Max,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { MatchStatus } from '@prisma/client';

export class CreateMatchDto {
  @IsUUID()
  phaseId!: string;

  @IsOptional()
  @IsUUID()
  matchdayId?: string;

  @IsOptional()
  @IsUUID()
  groupId?: string;

  @IsUUID()
  homeTournamentTeamId!: string;

  @IsUUID()
  awayTournamentTeamId!: string;

  @IsOptional()
  @IsUUID()
  venueId?: string;

  @IsOptional()
  @IsDateString()
  scheduledAt?: string;

  @IsOptional()
  @IsEnum(MatchStatus)
  status?: MatchStatus;
}

export class UpdateMatchDto {
  @IsOptional()
  @IsUUID()
  phaseId?: string;

  @IsOptional()
  @IsUUID()
  matchdayId?: string;

  @IsOptional()
  @IsUUID()
  groupId?: string;

  @IsOptional()
  @IsUUID()
  homeTournamentTeamId?: string;

  @IsOptional()
  @IsUUID()
  awayTournamentTeamId?: string;

  @IsOptional()
  @IsUUID()
  venueId?: string;

  @IsOptional()
  @IsDateString()
  scheduledAt?: string;

  @IsOptional()
  @IsEnum(MatchStatus)
  status?: MatchStatus;
}

export class ListMatchesQueryDto {
  @IsOptional()
  @IsUUID()
  phaseId?: string;

  @IsOptional()
  @IsUUID()
  matchdayId?: string;

  @IsOptional()
  @IsEnum(MatchStatus)
  status?: MatchStatus;
}

export class RecordResultDto {
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(99)
  homeScore!: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(99)
  awayScore!: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(99)
  homePenaltyScore?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(99)
  awayPenaltyScore?: number;
}

export class StandingsQueryDto {
  @IsUUID()
  phaseId!: string;
}