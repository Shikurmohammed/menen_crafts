import { forwardRef, Global, Module } from '@nestjs/common';
import { UsersModule } from '../users/users.module';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtStrategy } from './jwt.strategy';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
@Global()
@Module({
    imports: [
        forwardRef(() => UsersModule),
        JwtModule.registerAsync({
            imports: [ConfigModule],
            useFactory: async (configService: ConfigService) => ({
                secret: configService.get('JWT_SECRET'),
                signOptions: {
                    expiresIn: configService.get('JWT_EXPIRATION'),
                },
            }),
            inject: [ConfigService],
        }),
    ],
    controllers: [AuthController],
    providers: [AuthService, JwtStrategy, JwtAuthGuard],
    exports: [AuthService, JwtModule, JwtAuthGuard],
})
export class AuthModule { }