import { IsEmail, IsOptional, IsString, Length } from 'class-validator';

export class RegisterDto {
  @IsEmail()
  email!: string;

  @IsString()
  @Length(8, 64)
  password!: string;

  @IsString()
  @Length(3, 32)
  displayName!: string;

  @IsOptional()
  @IsString()
  locale?: string;
}
