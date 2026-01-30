

import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import * as dotenv from 'dotenv';

dotenv.config();

export const typeOrmConfig: TypeOrmModuleOptions = {
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 5432,
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
    database: process.env.DB_NAME || 'crafts_db',
    entities: [__dirname + '/../**/*.entity{.ts,.js}'],
    synchronize: false,//process.env.NODE_ENV !== 'production',
    logging: ['error', 'warn'],//process.env.NODE_ENV === 'development',
    migrations: [__dirname + '/../migrations/*{.ts,.js}'],
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
};

// import { TypeOrmModuleOptions } from '@nestjs/typeorm';
// import * as dotenv from 'dotenv';
// dotenv.config();
// export const typeOrmConfig: TypeOrmModuleOptions = {
//     type: 'postgres' as const,
//     host: process.env.DB_HOST || 'localhost',
//     port: parseInt(process.env.DB_PORT || '5432'),
//     username: process.env.DB_USERNAME || 'postgres',
//     password: process.env.DB_PASSWORD || 'Your DB Password',
//     database: process.env.DB_NAME || 'Your DB Name',
//     entities: [__dirname + '/../**/*.entity.{js,ts}'],
//     synchronize: process.env.NODE_ENV !== 'production',
//     logging: true,
//     migrations: [__dirname + '/../migrations/*{.ts,.js}'],
//     ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,

// }