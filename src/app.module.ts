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
    AuthModule,
    UsersModule,
    CraftsModule,
    CategoriesModule,
    OrdersModule,
    ReviewsModule,
    UploadsModule,
  ],
})
export class AppModule { }
