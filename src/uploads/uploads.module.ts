
import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { UploadsService } from './uploads.service';
import { UploadsController } from './uploads.controller';

@Module({
    imports: [
        MulterModule.register({
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            storage: diskStorage({
                destination: './uploads',
                filename: (req, file, callback) => {
                    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
                    const ext = extname(file.originalname);
                    const filename = `${file.fieldname}-${uniqueSuffix}${ext}`;
                    callback(null, filename);
                },
            }),
            fileFilter: (req, file, callback) => {
                if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/)) {
                    return callback(new Error('Only image files are allowed!'), false);
                }
                callback(null, true);
            },
            limits: {
                fileSize: 5 * 1024 * 1024, // 5MB
            },
        }),
    ],
    controllers: [UploadsController],
    providers: [UploadsService],
})
export class UploadsModule { }