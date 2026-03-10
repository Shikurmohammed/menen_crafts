
import {
    Controller,
    Post,
    Body,
    HttpCode,
    HttpStatus,
    Res,
    Req,
    UseGuards,
    Get,
    UnauthorizedException,
    Logger,
    Param,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { CreateUserDto } from '../users/dto/create-user.dto';
import { Request, Response } from 'express';
import { JwtService } from '@nestjs/jwt';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RegisterDto } from './dto/register.dto';
import { ForgotPasswordDto } from './dto/forgot-passowrd.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
/**
 * Author: Dawud Mohammed,
 * Description: This controller handles all authentication-related endpoints, including login, registration, token refresh, logout, and password reset. It uses JWT for authentication and sets tokens in HTTP-only cookies for security. The controller also includes rate limiting on sensitive endpoints to prevent abuse.
 * Created: 2026-01-15
 * Last Updated: 2026-03-10
 * Future Improvements: Implement email verification during registration, add multi-factor authentication, and enhance error handling with more specific messages.
 * Note: Ensure that environment variables for JWT secrets and frontend URL are properly configured for the application to function correctly.
 */

@Controller('auth')
export class AuthController {
    private readonly logger = new Logger(AuthController.name);

    constructor(
        private readonly authService: AuthService,
        private readonly jwtService: JwtService,
    ) { }

    @Post('login')
    @HttpCode(HttpStatus.OK)
    @Throttle({ default: { limit: 5, ttl: 60000 } })
    async login(
        @Body() loginDto: LoginDto,
        @Res({ passthrough: true }) res: Response,
    ) {
        const result = await this.authService.login(loginDto);

        // Set access token as HTTP-only cookie
        res.cookie('access_token', result.access_token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 15 * 60 * 1000, // 15 minutes
            path: '/',
        });

        // Set refresh token as HTTP-only cookie
        res.cookie('refresh_token', result.refresh_token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: loginDto.rememberMe
                ? 30 * 24 * 60 * 60 * 1000  // 30 days
                : 7 * 24 * 60 * 60 * 1000,  // 7 days
            path: '/',
        });

        // Return ONLY user data, NO tokens in response body
        return {
            user: {
                id: result.user.id,
                email: result.user.email,
                firstName: result.user.firstName,
                lastName: result.user.lastName,
                role: result.user.role,
                avatar: result.user.avatar,
            },
        };
    }

    @Post('register')
    async register(@Body() registerDto: RegisterDto) {
        this.logger.debug('Register DTO: ' + JSON.stringify(registerDto));
        const result = await this.authService.register(registerDto);
        // Return user without password
        const { password, ...userWithoutPassword } = result;
        return {
            user: userWithoutPassword
        };
    }
    @Post('refresh')
    @HttpCode(HttpStatus.OK)
    async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
        const refreshToken = req.cookies?.refresh_token;

        // 1. Check for cookie without throwing a Log-Level Error
        if (!refreshToken) {
            res.status(HttpStatus.UNAUTHORIZED); // Sets 401 status
            return { message: 'No refresh token' }; // Returns JSON instead of throwing Error
        }

        try {
            const result = await this.authService.refreshTokens(refreshToken);

            res.cookie('access_token', result.access_token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                maxAge: 15 * 60 * 1000,
                path: '/',
            });

            if (result.refresh_token) {
                res.cookie('refresh_token', result.refresh_token, {
                    httpOnly: true,
                    secure: process.env.NODE_ENV === 'production',
                    sameSite: 'lax',
                    maxAge: 7 * 24 * 60 * 60 * 1000,
                    path: '/',
                });
            }

            return { message: 'Token refreshed successfully' };
        } catch (error) {
            // 2. Only throw here if the token was PRESENT but INVALID
            res.clearCookie('access_token');
            res.clearCookie('refresh_token');
            throw new UnauthorizedException('Invalid refresh token');
        }
    }

    @Post('refresh')
    @HttpCode(HttpStatus.OK)
    async refreshv0(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
        // Get refresh token from cookie
        const refreshToken = req.cookies?.refresh_token;

        if (!refreshToken) {
            throw new UnauthorizedException('No refresh token');
        }

        try {
            const result = await this.authService.refreshTokens(refreshToken);

            // Set new access token cookie
            res.cookie('access_token', result.access_token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                maxAge: 15 * 60 * 1000, // 15 minutes
                path: '/',
            });

            // Optionally rotate refresh token
            if (result.refresh_token) {
                res.cookie('refresh_token', result.refresh_token, {
                    httpOnly: true,
                    secure: process.env.NODE_ENV === 'production',
                    sameSite: 'lax',
                    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
                    path: '/',
                });
            }

            return { message: 'Token refreshed successfully' };
        } catch (error) {
            // Clear cookies on error
            res.clearCookie('access_token');
            res.clearCookie('refresh_token');
            throw new UnauthorizedException('Invalid refresh token');
        }
    }

    @Post('logout')
    @HttpCode(HttpStatus.OK)
    async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
        const refreshToken = req.cookies?.refresh_token;

        if (refreshToken) {
            try {
                await this.authService.logout(refreshToken);
            } catch (error) {
                this.logger.error('Logout error:', error);
            }
        }

        // Clear both cookies
        res.clearCookie('access_token', { path: '/' });
        res.clearCookie('refresh_token', { path: '/' });

        return { message: 'Logged out successfully' };
    }

    @Get('profile')
    @UseGuards(JwtAuthGuard)
    async getProfile(@Req() req: Request) {
        // User is attached by JwtAuthGuard from the access_token cookie
        const user = req.user;

        if (!user) {
            throw new UnauthorizedException('Not authenticated');
        }

        // Return user without sensitive data
        const { password, currentHashedRefreshToken, ...userData } = user as any;
        return userData;
    }

    @Get('check')
    @UseGuards(JwtAuthGuard)
    async checkAuth(@Req() req: Request) {
        // Simple endpoint to check if user is authenticated
        // Used by frontend to verify token validity
        return {
            authenticated: true,
            user: req.user
        };
    }

    //Reset password and forgot password endpoints will be added here in the future
    @Post('forgot-password')
    @HttpCode(HttpStatus.OK)
    @Throttle({ default: { limit: 3, ttl: 60000 } })//Limit to 3 requests per minute per IP
    async fortgotPassword(@Body() forgotPassword: ForgotPasswordDto) {
        return await this.authService.forgotPassword(forgotPassword.email);
    }
    @Post('reset-password')
    @HttpCode(HttpStatus.OK)
    async ResetPasswordDto(@Body() resetPasswordDto: ResetPasswordDto) {

        return await this.authService.
            resetPassword(
                resetPasswordDto.token,
                resetPasswordDto.newPassword,
                resetPasswordDto.confirmPassword
            );
    }

    @Get('validate-reset-token/:token')
    @HttpCode(HttpStatus.OK)
    async validateResetToken(@Param('token') token:string){
        return await this.authService.validateResetToken(token);
    }
}

