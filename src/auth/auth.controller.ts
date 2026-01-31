import { Controller, Post, Body, Get, HttpStatus, HttpCode, Logger } from '@nestjs/common';
import { AuthService } from './auth.service';
import { CreateUserDto } from 'src/users/dto/create-user.dto';
import { LoginDto } from './dto/login.dto';

@Controller('auth')
export class AuthController {
    private readonly logger = new Logger(AuthController.name);
    constructor(private readonly authService: AuthService) { }

    @Post('login')
    @HttpCode(HttpStatus.OK)
    async login(@Body() loginDto: LoginDto) {
        return this.authService.login(loginDto);
    }

    @Post('register')
    async register(@Body() registerDto: CreateUserDto) {
        this.logger.debug('Register DTO: ' + JSON.stringify(registerDto));
        return await this.authService.register(registerDto);
    }
    @Post('profile')
    async profile(@Body() user: { id: string; username: string; email: string }) {
        return user;
    }
    @Get('test')
    async test() {
        return { message: 'AuthController is working!' };
    }
}