import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { UploadsService } from './uploads.service';
import { UploadsController } from './uploads.controller';
import cloudinaryConfig from '../config/cloudinary.config';

@Module({
    imports: [
        ConfigModule.forFeature(cloudinaryConfig),
        MulterModule.registerAsync({
            imports: [ConfigModule],
            useFactory: async (configService: ConfigService) => {
                const uploadDir = join(process.cwd(), 'uploads');
                
                // Ensure upload directory exists
                if (!existsSync(uploadDir)) {
                    mkdirSync(uploadDir, { recursive: true });
                }

                return {
                    storage: diskStorage({
                        destination: (req, file, cb) => {
                            cb(null, uploadDir);
                        },
                        filename: (req, file, cb) => {
                            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
                            const ext = extname(file.originalname);
                            const filename = `${file.fieldname}-${uniqueSuffix}${ext}`;
                            cb(null, filename);
                        },
                    }),
                    fileFilter: (req, file, cb) => {
                        const allowedMimes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
                        if (allowedMimes.includes(file.mimetype)) {
                            cb(null, true);
                        } else {
                            cb(new Error('Only image files are allowed!'), false);
                        }
                    },
                    limits: {
                        fileSize: configService.get('MAX_FILE_SIZE', 5 * 1024 * 1024),
                    },
                };
            },
            inject: [ConfigService],
        }),
    ],
    controllers: [UploadsController],
    providers: [UploadsService],
    exports: [UploadsService],
})
export class UploadsModule { }