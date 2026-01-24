import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { UserRole } from 'src/enums/UserRole.enum';

export class CreateUserDto {
    @IsEmail()
    email: string;

    @IsString()
    @IsNotEmpty()
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
}