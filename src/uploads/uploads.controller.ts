import {
    Controller,
    Post,
    UseInterceptors,
    UploadedFile,
    UploadedFiles,
    ParseFilePipe,
    MaxFileSizeValidator,
    FileTypeValidator,
    Get,
    Param,
    Res,
    Delete,
    Body,
    UseGuards,
    BadRequestException,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { UploadsService } from './uploads.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../enums/UserRole.enum';
import type { Response } from 'express';
import { existsSync } from 'fs';
import { basename } from 'path';
import { ApiTags, ApiConsumes, ApiBody, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('uploads')
@Controller('uploads')
export class UploadsController {
    constructor(private readonly uploadsService: UploadsService) { }

    @Post('image')
    @UseGuards(JwtAuthGuard)
    @UseInterceptors(FileInterceptor('image'))
    @ApiBearerAuth()
    @ApiConsumes('multipart/form-data')
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                images: {
                    type: 'array',
                    items: { type: 'string', format: 'binary' },
                },
                folder: { type: 'string' },
            },
            required: ['images'],
        },
    })
    async uploadImage(
        @UploadedFile(
            new ParseFilePipe({
                validators: [
                    new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }),
                    new FileTypeValidator({ fileType: /(jpg|jpeg|png|gif|webp)$/ }),
                ],
            }),
        )
        file: Express.Multer.File,
        @Body('folder') folder?: string,
    ) {
        const result = await this.uploadsService.uploadFile(file, folder || 'images');
        return {
            message: 'File uploaded successfully',
            ...result,
        };
    }

    @Post('multiple')
    @UseGuards(JwtAuthGuard)
    @UseInterceptors(FilesInterceptor('images', 10))
    @ApiBearerAuth()
    @ApiConsumes('multipart/form-data')
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                image: {
                    type: 'string',
                    format: 'binary'
                },
                folder: {
                    type: 'string',
                    description: 'Optional folder name in Cloudinary',
                },
            },
            required: ['image'], // List only the fields that MUST be present
        },
    })
    async uploadMultiple(
        @UploadedFiles(
            new ParseFilePipe({
                validators: [
                    new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }),
                    new FileTypeValidator({ fileType: /(jpg|jpeg|png|gif|webp)$/ }),
                ],
            }),
        )
        files: Express.Multer.File[],
        @Body('folder') folder?: string,
    ) {
        const results = await this.uploadsService.uploadMultiple(files, folder || 'images');
        return {
            message: 'Files uploaded successfully',
            files: results,
            count: results.length,
        };
    }

    @Delete()
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.ADMIN)
    @ApiBearerAuth()
    async deleteFile(
        @Body('url') url: string,
        @Body('publicId') publicId?: string,
    ) {
        await this.uploadsService.deleteFile(url, publicId);
        return { message: 'File deleted successfully' };
    }

    @Delete('multiple')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.ADMIN)
    @ApiBearerAuth()
    async deleteMultiple(
        @Body() body: { files: Array<{ url: string; publicId?: string }> },
    ) {
        await this.uploadsService.deleteMultiple(body.files);
        return { message: 'Files deleted successfully' };
    }

    @Get(':filename')
    async serveImage(@Param('filename') filename: string, @Res() res: Response) {
        const safeFilename = basename(filename);
        const filePath = this.uploadsService.getFilePath(safeFilename);
        if (existsSync(filePath)) {
            return res.sendFile(filePath);
        }
        return res.status(404).json({ message: 'File not found' });
    }

    @Get('info/:filename')
    async getFileInfo(@Param('filename') filename: string) {
        const safeFilename = basename(filename);
        const filePath = this.uploadsService.getFilePath(safeFilename);
        if (!existsSync(filePath)) {
            throw new BadRequestException('File not found');
        }
        return {
            filename: safeFilename,
            url: this.uploadsService.getFileUrl(safeFilename),
            exists: true,
        };
    }
}