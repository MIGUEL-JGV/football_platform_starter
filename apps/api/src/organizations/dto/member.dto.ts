import { Transform } from 'class-transformer';
import { IsEmail, IsEnum, IsOptional } from 'class-validator';
import { MembershipStatus, OrganizationRole } from '@prisma/client';

const normalizeEmail = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim().toLowerCase() : value;

export class AddMemberDto {
  @Transform(normalizeEmail)
  @IsEmail()
  email!: string;

  @IsEnum(OrganizationRole)
  role!: OrganizationRole;
}

export class UpdateMemberDto {
  @IsOptional()
  @IsEnum(OrganizationRole)
  role?: OrganizationRole;

  @IsOptional()
  @IsEnum(MembershipStatus)
  status?: MembershipStatus;
}