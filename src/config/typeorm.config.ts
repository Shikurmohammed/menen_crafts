

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
    synchronize: true,//process.env.NODE_ENV !== 'production',
    logging: false,//process.env.NODE_ENV === 'development',
    migrations: [__dirname + '/../migrations/*{.ts,.js}'],
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
};

