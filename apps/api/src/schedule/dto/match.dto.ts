import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsUUID,
} from 'class-validator';
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