import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';

export const EVENT_TYPES = [
  'goal',
  'own_goal',
  'penalty_goal',
  'penalty_missed',
  'penalty_conceded',
  'penalty_saved',
  'yellow_card',
  'second_yellow',
  'red_card',
  'substitution',
  'assist',
  'foul',
  'save',
] as const;
export type EventType = (typeof EVENT_TYPES)[number];

export const EVENT_PERIODS = ['regular', 'first_half', 'second_half', 'extra_time', 'penalties'] as const;
export type EventPeriod = (typeof EVENT_PERIODS)[number];

export const EVENT_STATUSES = ['valid', 'voided'] as const;
export type EventStatus = (typeof EVENT_STATUSES)[number];

export class CreateMatchEventDto {
  @IsIn(EVENT_TYPES)
  eventType!: EventType;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(130)
  minute?: number;

  @IsOptional()
  @IsIn(EVENT_PERIODS)
  period?: EventPeriod;

  @IsOptional()
  @IsIn(EVENT_STATUSES)
  status?: EventStatus;

  @IsOptional()
  @IsUUID()
  teamRosterId?: string;

  @IsOptional()
  @IsUUID()
  secondaryTeamRosterId?: string;
}

export class UpdateMatchEventDto {
  @IsOptional()
  @IsIn(EVENT_TYPES)
  eventType?: EventType;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(130)
  minute?: number;

  @IsOptional()
  @IsIn(EVENT_PERIODS)
  period?: EventPeriod;

  @IsOptional()
  @IsIn(EVENT_STATUSES)
  status?: EventStatus;

  @IsOptional()
  @IsUUID()
  teamRosterId?: string;

  @IsOptional()
  @IsUUID()
  secondaryTeamRosterId?: string;
}