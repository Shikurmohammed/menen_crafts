import { Global, Module, Logger } from '@nestjs/common';
import { MailerModule } from '@nestjs-modules/mailer';
import { HandlebarsAdapter } from '@nestjs-modules/mailer/dist/adapters/handlebars.adapter';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { EmailService } from './email.service';
import { join } from 'path';

@Global()
@Module({
    imports: [
        MailerModule.forRootAsync({
            imports: [ConfigModule],
            useFactory: async (configService: ConfigService) => {
                const logger = new Logger('MailerModule');

                // Log SMTP configuration (without password)
                logger.log(`Configuring SMTP: ${configService.get('SMTP_HOST')}:${configService.get('SMTP_PORT')}`);

                return {
                    transport: {
                        host: configService.get('SMTP_HOST', 'smtp.gmail.com'),
                        port: 465, // Force 465
                        // Force 'true' for port 465, or it will time out
                        secure: true,
                        auth: {
                            user: configService.get('SMTP_USER'),
                            pass: configService.get('SMTP_PASS'),
                        },
                        tls: {
                            rejectUnauthorized: false,
                            // REMOVE 'SSLv3' - it is deprecated and blocked by Gmail
                            minVersion: 'TLSv1.2',
                        },
                        // Keep your IPv4 lookup hack if you're on a restricted network
                        lookup: (hostname, options, callback) => {
                            require('dns').lookup(hostname, { family: 4 }, callback);
                        },
                        connectionTimeout: 15000,
                    },

                    defaults: {
                        from: `"Menen Crafts" <${configService.get('SMTP_FROM', 'noreply@menencrafts.com')}>`,
                    },
                    template: {
                        dir: join(__dirname, 'templates'),
                        adapter: new HandlebarsAdapter(),
                        options: {
                            strict: true,
                        },
                    },
                };
            },
            inject: [ConfigService],
        }),
    ],
    providers: [EmailService],
    exports: [EmailService],
})
export class EmailModule { }