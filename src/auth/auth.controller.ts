import { Controller, Post, Body, UseGuards, Get, HttpStatus, HttpCode } from '@nestjs/common';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { AuthService } from './auth.service';
import { CreateUserDto } from 'src/users/dto/create-user.dto';
import { LoginDto } from './dto/login.dto';

@Controller('auth')
export class AuthController {
    constructor(private readonly authService: AuthService) { }

    @Post('login')
    @HttpCode(HttpStatus.OK)
    async login(@Body() loginDto: LoginDto) {
        return this.authService.login(loginDto);
    }

    @Post('register')
    async register(@Body() registerDto: CreateUserDto) {
        console.log('Register DTO:', registerDto);
        return await this.authService.register(registerDto);
    }
    @UseGuards(JwtAuthGuard)
    @Post('profile')
    @UseGuards(JwtAuthGuard)
    async profile(@Body() user: { id: string; username: string; email: string }) {
        return user;
    }
    @Get('test')
    async test() {
        return { message: 'AuthController is working!' };
    }
}