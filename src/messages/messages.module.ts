import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MessagesController } from './messages.controller';
import { MessagesService } from './messages.service';
import { MessagesGateway } from './messages.gateway';
import { Conversation } from './conversation.entity';
import { Message } from './message.entity';
import { UsersModule } from '../users/users.module';
import { CraftsModule } from '../crafts/crafts.module';
import { EmailModule } from '../email/email.module';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { User } from 'src/users/user.entity';
import { Craft } from 'src/crafts/craft.entity';

@Module({
    imports: [
        TypeOrmModule.forFeature([Conversation, Message,User,Craft]),
        forwardRef(() => UsersModule),
        forwardRef(() => CraftsModule),
        EmailModule,
        JwtModule.registerAsync({
            imports: [ConfigModule],
            useFactory: async (configService: ConfigService) => ({
                secret: configService.get('JWT_SECRET'),
                signOptions: { expiresIn: '15m' },
            }),
            inject: [ConfigService],
        }),
    ],
    controllers: [MessagesController],
    providers: [MessagesService, MessagesGateway],
    exports: [MessagesService],
})
export class MessagesModule {}