import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class LoginDto {
    @IsString()
    @IsEmail()
    email: string;


    @IsNotEmpty()
    @IsString()
    password: string;
}