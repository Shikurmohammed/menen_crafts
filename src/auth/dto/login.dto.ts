import { IsBoolean, IsEmail, IsNotEmpty, IsString, Matches, MinLength } from 'class-validator';

export class LoginDto {
    @IsString()
    @IsEmail({},{message:"Please provide a valid Email Address!"})
    email: string;


    @IsNotEmpty()
    @IsString()

     @IsNotEmpty()
    @MinLength(8, { message: 'Password must be at least 8 characters long' })
    // Custom regex: at least one uppercase, one lowercase, and one number
    @Matches(/((?=.*\d)|(?=.*\W+))(?![.\n])(?=.*[A-Z])(?=.*[a-z]).*$/, {
        message: 'Password is too weak: add uppercase, lowercase, and a number',
    })
    password: string;
    
    @IsBoolean()
    rememberMe?: boolean;
}