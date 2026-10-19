import { Type } from 'class-transformer'
import {
  ArrayMaxSize, IsArray, IsBoolean, IsDateString, IsEnum, IsHexColor, IsIn, IsInt, IsObject, IsOptional,
  IsString, IsUrl, Max, MaxLength, Min, MinLength, ValidateNested,
} from 'class-validator'
import { PlayerOrder } from '../generated/prisma/enums'

const CURRENCIES = ['INR', 'USD', 'GBP', 'AUD', 'AED', 'PKR', 'LKR', 'BDT', 'NPR', 'ZAR', 'NZD', 'CAD', 'EUR', 'PTS']

export class IncrementTierDto {
  @IsInt() @Min(0)
  from: number

  @IsInt() @Min(1)
  step: number
}

export class CreateTournamentDto {
  @IsString() @MinLength(2) @MaxLength(100)
  name: string

  @IsOptional() @IsString() @MaxLength(500)
  description?: string

  @IsOptional() @IsString() @MaxLength(120)
  venue?: string

  @IsDateString({}, { message: 'Pick the auction date' })
  auctionDate: string

  @IsOptional() @IsIn(CURRENCIES)
  currency?: string

  @IsOptional() @IsString() @MaxLength(1000)
  logoUrl?: string

  /** Players are grouped into categories (A, B, C…) */
  @IsOptional() @IsBoolean()
  useCategories?: boolean

  @IsOptional() @IsArray() @ArrayMaxSize(20) @IsString({ each: true }) @MaxLength(30, { each: true })
  categoryList?: string[]
}

export class UpdateTournamentDto {
  @IsOptional() @IsString() @MinLength(2) @MaxLength(100)
  name?: string

  @IsOptional() @IsString() @MaxLength(500)
  description?: string

  @IsOptional() @IsString() @MaxLength(120)
  venue?: string

  @IsOptional() @IsDateString()
  auctionDate?: string | null

  @IsOptional() @IsIn(CURRENCIES)
  currency?: string

  @IsOptional() @IsString() @MaxLength(1000)
  logoUrl?: string | null

  @IsOptional() @IsInt() @Min(1) @Max(2_000_000_000)
  teamPurse?: number

  @IsOptional() @IsInt() @Min(1) @Max(2_000_000_000)
  basePrice?: number

  @IsOptional() @IsArray() @ArrayMaxSize(10) @ValidateNested({ each: true }) @Type(() => IncrementTierDto)
  bidIncrements?: IncrementTierDto[]

  @IsOptional() @IsObject()
  categoryBasePrices?: Record<string, number> | null

  /** Players are grouped into categories (A, B, C…) */
  @IsOptional() @IsBoolean()
  useCategories?: boolean

  @IsOptional() @IsArray() @ArrayMaxSize(20) @IsString({ each: true }) @MaxLength(30, { each: true })
  categoryList?: string[]

  @IsOptional() @IsInt() @Min(1) @Max(50)
  minSquad?: number

  @IsOptional() @IsInt() @Min(1) @Max(60)
  maxSquad?: number

  @IsOptional() @IsEnum(PlayerOrder)
  playerOrder?: PlayerOrder

  @IsOptional() @IsInt() @Min(0) @Max(300)
  bidTimerSec?: number

  @IsOptional() @IsBoolean()
  setupComplete?: boolean

  @IsOptional() @IsBoolean()
  registrationOpen?: boolean

  @IsOptional() @IsArray() @ArrayMaxSize(40)
  registrationFields?: unknown[]

  @IsOptional() @IsBoolean()
  requireApproval?: boolean

  @IsOptional() @IsBoolean()
  remoteBidding?: boolean

  @IsOptional() @IsObject()
  theme?: Record<string, unknown>
}

export class RetainDto {
  @IsString() playerId: string

  @IsInt() @Min(0) @Max(2_000_000_000)
  price: number

  @IsBoolean()
  deductFromPurse: boolean
}

export class RotateTokenDto {
  @IsIn(['live', 'registration'])
  kind: 'live' | 'registration'
}

export class TeamDto {
  @IsString() @MinLength(1) @MaxLength(60)
  name: string

  @IsOptional() @IsString() @MaxLength(5)
  shortName?: string

  @IsOptional() @IsHexColor()
  color?: string

  @IsOptional() @IsString() @MaxLength(1000)
  logoUrl?: string | null

  @IsOptional() @IsString() @MaxLength(80)
  ownerName?: string | null
}

export class UpdateTeamDto {
  @IsOptional() @IsString() @MinLength(1) @MaxLength(60)
  name?: string

  @IsOptional() @IsString() @MaxLength(5)
  shortName?: string

  @IsOptional() @IsHexColor()
  color?: string

  @IsOptional() @IsString() @MaxLength(1000)
  logoUrl?: string | null

  @IsOptional() @IsString() @MaxLength(80)
  ownerName?: string | null
}

export class TeamCountDto {
  @IsInt() @Min(2) @Max(16)
  count: number
}

export class PlayerInputDto {
  @IsString() @MinLength(1) @MaxLength(80)
  name: string

  @IsOptional() @IsString() @MaxLength(40)
  role?: string

  @IsOptional() @IsString() @MaxLength(30)
  category?: string | null

  @IsOptional() @IsString() @MaxLength(60)
  battingStyle?: string

  @IsOptional() @IsString() @MaxLength(60)
  bowlingStyle?: string

  @IsOptional() @IsString() @MaxLength(30)
  phone?: string

  @IsOptional() @IsString() @MaxLength(120)
  email?: string

  @IsOptional() @IsString() @MaxLength(80)
  city?: string

  @IsOptional() @IsInt() @Min(5) @Max(90)
  age?: number

  @IsOptional() @IsString() @MaxLength(1000)
  photoUrl?: string | null

  @IsOptional() @IsInt() @Min(0)
  basePrice?: number | null

  @IsOptional() @IsObject()
  extra?: Record<string, string>
}

export class UpdatePlayerDto extends PlayerInputDto {
  @IsOptional() @IsString() @MinLength(1) @MaxLength(80)
  declare name: string

  @IsOptional() @IsBoolean()
  approved?: boolean
}

export class ImportPlayersDto {
  @IsArray() @ArrayMaxSize(3000) @ValidateNested({ each: true }) @Type(() => PlayerInputDto)
  players: PlayerInputDto[]

  @IsOptional() @IsIn(['append', 'replace'])
  mode?: 'append' | 'replace'
}

export class BulkApproveDto {
  @IsArray() @ArrayMaxSize(3000) @IsString({ each: true })
  ids: string[]

  @IsBoolean()
  approved: boolean
}

export class BulkCategoryDto {
  @IsArray() @ArrayMaxSize(3000) @IsString({ each: true })
  ids: string[]

  @IsOptional() @IsString() @MaxLength(30)
  category: string | null
}
