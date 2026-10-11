import { Transform } from 'class-transformer'
import { IsEmail, IsOptional, IsString, IsUrl, MaxLength, MinLength } from 'class-validator'

const lower = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim().toLowerCase() : value)

export class SignupDto {
  @IsString() @MinLength(2) @MaxLength(80)
  name: string

  @Transform(lower) @IsEmail()
  email: string

  @IsString() @MinLength(8, { message: 'Password must be at least 8 characters' }) @MaxLength(128)
  password: string
}

export class LoginDto {
  @Transform(lower) @IsEmail()
  email: string

  @IsString() @MaxLength(128)
  password: string
}

export class ForgotPasswordDto {
  @Transform(lower) @IsEmail()
  email: string
}

export class ResetPasswordDto {
  @IsString() @MinLength(10)
  token: string

  @IsString() @MinLength(8, { message: 'Password must be at least 8 characters' }) @MaxLength(128)
  password: string
}

export class ChangePasswordDto {
  @IsString()
  currentPassword: string

  @IsString() @MinLength(8, { message: 'Password must be at least 8 characters' }) @MaxLength(128)
  newPassword: string
}

export class UpdateProfileDto {
  @IsOptional() @IsString() @MinLength(2) @MaxLength(80)
  name?: string

  @IsOptional() @IsUrl({ require_tld: false })
  avatarUrl?: string
}
