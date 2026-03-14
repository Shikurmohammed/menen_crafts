/* eslint-disable @typescript-eslint/no-unused-vars */
import { Module } from '@nestjs/common';
//import { AppController } from './app.controller';
//import { AppService } from './app.service';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { CraftsModule } from './crafts/crafts.module';
import { CategoriesModule } from './categories/categories.module';
import { OrdersModule } from './orders/orders.module';
import { UploadsModule } from './uploads/uploads.module';
import { ReviewsModule } from './reviews/reviews.module';
import { TypeOrmModule, TypeOrmModuleOptions } from '@nestjs/typeorm';
import { typeOrmConfig } from './config/typeorm.config';
import { ConfigService, ConfigModule } from '@nestjs/config';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { CustomThrottlerGuard } from './exceptions/CustomThrottlerGuard';
import { AnalyticsModule } from './analytics/analytics.module';
import { ArtisansModule } from './artisans/artisans.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { SearchModule } from './search/search.module';
import { EmailModule } from './email/email.module';
import { Message } from './messages/message.entity';
import { MessagesModule } from './messages/messages.module';
/**
 ** Module combines controllers, providers also other modules, TestFiles, Entity Files, configurations to form the application structure.
 ** NestJs is aware of this module as the root module to start the application.
 ** it does not know about other modules unless they are imported here.
 */
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService): TypeOrmModuleOptions => ({
        ...typeOrmConfig,
        autoLoadEntities: true,
      }),
    }),
    ThrottlerModule.forRoot({
      throttlers: [
        {
          ttl: 60,   // seconds
          limit: 10, // requests per ttl
        },
      ],
    }),
    AuthModule,
    UsersModule,
    CraftsModule,
    CategoriesModule,
    OrdersModule,
    ReviewsModule,
    UploadsModule,
    ArtisansModule,
    SearchModule,
    AnalyticsModule,
    DashboardModule,
    EmailModule,
    MessagesModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: CustomThrottlerGuard, // Use custom throttler guard for global rate limiting
    }
  ]
})
export class AppModule { }
