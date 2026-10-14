import { Transform } from 'class-transformer';
import { IsEmail, IsEnum, IsOptional } from 'class-validator';
import { MembershipStatus, TournamentRole } from '@prisma/client';

const normalizeEmail = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim().toLowerCase() : value;

export class AddTournamentMemberDto {
  @Transform(normalizeEmail)
  @IsEmail()
  email!: string;

  @IsEnum(TournamentRole)
  role!: TournamentRole;
}

export class UpdateTournamentMemberDto {
  @IsOptional()
  @IsEnum(TournamentRole)
  role?: TournamentRole;

  @IsOptional()
  @IsEnum(MembershipStatus)
  status?: MembershipStatus;
}