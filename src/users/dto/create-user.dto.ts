import { IsBoolean, IsEmail, IsEnum, IsNotEmpty, IsOptional, IsPhoneNumber, IsString, Matches, ValidateIf } from 'class-validator';
import { UserRole } from 'src/enums/UserRole.enum';

export class CreateUserDto {
  @IsEmail()
  email: string;

  @IsString()
  //@IsNotEmpty()
  password: string;

  @IsString()
  @IsNotEmpty()
  firstName: string;

  @IsString()
  @IsNotEmpty()
  lastName: string;

  @IsEnum(UserRole)
  @IsOptional()
  role?: UserRole;

  @IsString()
  @IsOptional()
  displayTitle?: string;
  
  @IsString()
  @IsOptional()
  displayTitleEn?: string;

  @IsBoolean()
  @IsOptional()
  isVerified?: boolean

  @IsBoolean()
  isActive?: boolean

  @IsString()
  @IsOptional()
  country?: string;

  @IsString()
  @IsOptional()
  state?: string;

  @IsString()
  @IsOptional()
  city?: string;

  @IsString()
  @IsOptional()
  zipCode?: string;

  @IsString()
  @IsOptional()
  address?: string;

  @IsOptional()
  // This allows null, undefined, or an empty string to skip validation
  @ValidateIf((obj, value) => value !== null && value !== undefined && value !== '')
  // Regex Breakdown:
  // ^(\+?\d{1,3})? -> Optional + and 1-3 digit country code
  // \d{9,10}$      -> Followed by 9 or 10 digits
  @Matches(/^(\+?\d{1,3})?\d{9,10}$/, {
    message: 'Phone must be a valid local (011...) or international (+251...) number',
  })
  phone?: string | null;


  @IsString()
  @IsOptional()
  bio?: string;

  @IsString()
  @IsOptional()
  avatar?: string;

  // For the JSON objects in your Entity
  @IsOptional()
  socialLinks?: any;

  @IsOptional()
  notificationSettings?: any;

  @IsOptional()
  appearanceSettings?: any;

  @IsOptional()
  preferences?: any;

  @IsOptional()
  securitySettings?: any;

  //For Reset Password
  @IsString()
  @IsOptional()
  resetPasswordToken?: string;

  @IsOptional()
  resetPasswordExpires?: Date;

}