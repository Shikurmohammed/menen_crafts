import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import * as bcrypt from 'bcrypt';
import { LoginDto } from './dto/login.dto';
import { EmailService } from 'src/email/email.service';
import { CreateUserDto } from 'src/users/dto/create-user.dto';
import { randomBytes } from 'crypto';
import { addHours } from 'date-fns';

@Injectable()
export class AuthService {
    constructor(
        private usersService: UsersService,
        private jwtService: JwtService,
        private emailService: EmailService
    ) { }

    async validateUser(email: string, password: string): Promise<any> {
        const user = await this.usersService.findByEmail(email);
        if (user && await bcrypt.compare(password, user.password)) {
            const { password, ...result } = user;
            return result;
        }
        return null;
    }

    async login(loginDto: LoginDto) {
        const user = await this.validateUser(loginDto.email, loginDto.password);

        if (!user) {
            throw new UnauthorizedException('Invalid credentials');
        }

        const payload = {
            sub: user.id,
            email: user.email,
            role: user.role
        };

        const access_token = this.jwtService.sign(payload, {
            expiresIn: '15m', // Short-lived access token
        });

        const refresh_token = this.jwtService.sign(payload, {
            expiresIn: loginDto.rememberMe ? '30d' : '7d',
            secret: process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
        });

        // Store refresh token hash in database
        await this.usersService.setCurrentRefreshToken(user.id, refresh_token);

        return {
            access_token,
            refresh_token,
            user,
        };
    }

    async register(createUserDto: CreateUserDto) {
        // 1. Create the user in the database first
        const user = await this.usersService.create(createUserDto);

        // 2. Send emails in the background (Notice: no 'await')
        console.log(`User registered: ${user.email} (ID: ${user.id}, Role: ${user.role})`);
        if (user.role === 'ARTISAN') {
            console.log(`Sending artisan welcome email to ${user.email}`);
            this.emailService.sendArtisanWelcomeEmail(user.email, user.firstName)
                .catch(err => console.log(`Artisan Email failed: ${err.message}`));
            console.log(`Artisan welcome email sent to ${user.email}`);
        } else {
            // Only send standard welcome if they are NOT an artisan
            this.emailService.sendWelcomeEmail(user.email, user.firstName)
                .catch(err => console.log(`Welcome Email failed: ${err.message}`));
            console.log(`Welcome email sent to ${user.email}`);
        }

        // 3. Return the user immediately so the frontend redirects
        return user;
    }


    async refreshTokens(refreshToken: string) {
        try {
            // Verify refresh token
            const payload = await this.jwtService.verifyAsync(refreshToken, {
                secret: process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
            });

            // Get user from database
            const user = await this.usersService.findOne(payload.sub);

            // Verify refresh token matches stored hash
            const isRefreshTokenMatching = await bcrypt.compare(
                refreshToken,
                user.currentHashedRefreshToken,
            );

            if (!isRefreshTokenMatching) {
                throw new UnauthorizedException('Invalid refresh token');
            }

            // Generate new tokens
            const newPayload = {
                sub: user.id,
                email: user.email,
                role: user.role
            };

            const access_token = this.jwtService.sign(newPayload, {
                expiresIn: '15m',
            });

            const new_refresh_token = this.jwtService.sign(newPayload, {
                expiresIn: '7d',
                secret: process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
            });

            // Store new refresh token hash
            await this.usersService.setCurrentRefreshToken(user.id, new_refresh_token);

            return {
                access_token,
                refresh_token: new_refresh_token,
            };
        } catch (error) {
            throw new UnauthorizedException('Invalid refresh token');
        }
    }

    async logout(refreshToken: string) {
        try {
            const payload = await this.jwtService.verifyAsync(refreshToken, {
                secret: process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
            });

            // Remove refresh token from database
            await this.usersService.removeRefreshToken(payload.sub);
        } catch (error) {
            // Even if token verification fails, we still want to clear cookies
            // Just log the error and continue
            console.error('Logout error:', error);
        }
    }

    // Additional methods for forgot password and reset password can be added here
    async forgotPassword(email: string) :Promise<{ message: string }> {
        const user = await this.usersService.findByEmail(email);
        if (!user) {
            //For security, we don't reveal if the email exists or not.
            return {
                message:'If an account exists with this email, you will receive a password reset instruction email shortly.'
            };
        }
        //Generate reset token
        const resetToken = randomBytes(32).toString('hex');//will generate a random 32 byte token and convert to hex string
        const restTokenExpires = addHours(new Date(), 1);//Token expires in 1 hour

        //Save token and expiration to user record
        await this.usersService.update(user.id,{
            resetPasswordToken:resetToken,
            resetPasswordExpires:restTokenExpires,
        });

        //Send reset email
        await this.emailService.sendPasswordResetEmail(user,resetToken);
        return {
            message:'If an account exists with this email, you will receive a password rest instruction email shortly.'
        }
        
    }

    async resetPassword(token:string, newPassword:string,confirmPassword:string):Promise<{message:string}>{
        if(newPassword!==confirmPassword){
            throw new BadRequestException('Password do not match');
        }
        const user = await this.usersService.findByResetToken(token);

        if(!user ){
            throw new BadRequestException('Invalid or expired reset token');
        }
        //Check if token is expired
        if(user.resetPasswordExpires <new Date()){
         throw new BadRequestException('Request token has expired');
        }

        //Update password and clear reset token
        await this.usersService.updatePassword(user.id, newPassword);
      
        return {
            message:'Password reset successful. You can now log in with your new password.'
        }
    }

    async validateResetToken(token:string):Promise<{valid:boolean}>{
        const user = await this.usersService.findByResetToken(token);

        if(!user || user.resetPasswordExpires <new Date()){
            return { valid:false};
        }
        return { valid:true};
    }
}