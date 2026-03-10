import { IsString, IsOptional, IsEmail, IsObject, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class SocialLinksDto {
    @IsString()
    @IsOptional()
    facebook?: string;

    @IsString()
    @IsOptional()
    twitter?: string;

    @IsString()
    @IsOptional()
    instagram?: string;

    @IsString()
    @IsOptional()
    linkedin?: string;

    @IsString()
    @IsOptional()
    github?: string;

    @IsString()
    @IsOptional()
    website?: string;
}

export class UpdateProfileDto {
    @IsString()
    @IsOptional()
    firstName?: string;

    @IsString()
    @IsOptional()
    lastName?: string;

    @IsEmail()
    @IsOptional()
    email?: string;

    @IsString()
    @IsOptional()
    phone?: string;

    @IsString()
    @IsOptional()
    bio?: string;

    @IsString()
    @IsOptional()
    address?: string;

    @IsString()
    @IsOptional()
    city?: string;

    @IsString()
    @IsOptional()
    state?: string;

    @IsString()
    @IsOptional()
    zipCode?: string;

    @IsString()
    @IsOptional()
    country?: string;

    @IsObject()
    @IsOptional()
    @ValidateNested()
    @Type(() => SocialLinksDto)
    socialLinks?: SocialLinksDto;
}