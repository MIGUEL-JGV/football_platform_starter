import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, MaxLength, Min, MinLength } from 'class-validator';

export const NEWS_STATUSES = ['draft', 'published'] as const;
export type NewsStatus = (typeof NEWS_STATUSES)[number];

export class CreateNewsDto {
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  title!: string;

  @IsString()
  @MinLength(1)
  body!: string;

  @IsOptional()
  @IsIn(NEWS_STATUSES)
  status?: NewsStatus;
}

export class UpdateNewsDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  body?: string;

  @IsOptional()
  @IsIn(NEWS_STATUSES)
  status?: NewsStatus;
}

export class ListNewsQueryDto {
  @IsOptional()
  @IsIn(NEWS_STATUSES)
  status?: NewsStatus;

  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pageSize?: number;
}