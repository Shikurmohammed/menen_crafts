
import {
    Controller,
    Post,
    UseInterceptors,
    UploadedFile,
    ParseFilePipe,
    MaxFileSizeValidator,
    FileTypeValidator,
    Get,
    Param,
    Res,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UploadsService } from './uploads.service';
import type { Response } from 'express';
import { existsSync } from 'fs';

@Controller('uploads')
export class UploadsController {
    constructor(private readonly uploadsService: UploadsService) { }

    @Post('image')
    @UseInterceptors(FileInterceptor('image'))
    uploadImage(
        @UploadedFile(
            new ParseFilePipe({
                validators: [
                    new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }), // 5MB
                    new FileTypeValidator({ fileType: 'image/jpeg' }),
                ],
            }),
        )
        file: Express.Multer.File,
    ) {
        const fileUrl = this.uploadsService.getFileUrl(file.filename);
        return {
            message: 'File uploaded successfully',
            filename: file.filename,
            url: fileUrl,
        };
    }

    @Get(':filename')
    serveImage(@Param('filename') filename: string, @Res() res: Response) {
        const filePath = this.uploadsService.getFilePath(filename);
        if (existsSync(filePath)) {
            return res.sendFile(filePath);
        }
        return res.status(404).json({ message: 'File not found' });
    }
}