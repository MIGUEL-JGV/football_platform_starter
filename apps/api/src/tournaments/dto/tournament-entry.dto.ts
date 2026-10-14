import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

export class ConsentInputDto {
  @IsString()
  @Length(2, 150)
  guardianName!: string;

  @IsOptional()
  @IsString()
  @Length(2, 60)
  guardianRelation?: string;

  @IsOptional()
  @IsString()
  @Length(3, 120)
  guardianDocument?: string;
}

export class RosterPlayerInputDto {
  @IsUUID()
  playerId!: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(99)
  jerseyNumber?: number;

  @IsOptional()
  @IsString()
  @Length(1, 40)
  position?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => ConsentInputDto)
  consent?: ConsentInputDto;
}

export class ApplyEntryDto {
  @IsUUID()
  teamId!: string;

  @IsOptional()
  @IsString()
  @Length(10, 200)
  invitationToken?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RosterPlayerInputDto)
  @ArrayMaxSize(40)
  players?: RosterPlayerInputDto[];

  @IsOptional()
  @IsString()
  @Length(2, 150)
  representativeName?: string;

  @IsOptional()
  @IsString()
  @Length(3, 320)
  representativeEmail?: string;

  @IsOptional()
  @IsString()
  @Length(6, 40)
  representativePhone?: string;
}

export class RejectEntryDto {
  @IsOptional()
  @IsString()
  @Length(2, 500)
  reason?: string;
}