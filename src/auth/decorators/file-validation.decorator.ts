import { createParamDecorator, ExecutionContext, BadRequestException } from '@nestjs/common';
import { Request } from 'express';

export interface UploadedFileOptions {
    required?: boolean;
    maxSize?: number;
    allowedTypes?: string[];
}

export const ValidatedFile = createParamDecorator(
    (options: UploadedFileOptions = {}, ctx: ExecutionContext) => {
        const request = ctx.switchToHttp().getRequest<Request>();
        const file = request.file as Express.Multer.File;

        if (options.required && !file) {
            throw new BadRequestException('File is required');
        }

        if (file) {
            // Validate file size
            if (options.maxSize && file.size > options.maxSize) {
                throw new BadRequestException(`File too large. Max size is ${options.maxSize / (1024 * 1024)}MB`);
            }

            // Validate file type
            if (options.allowedTypes && !options.allowedTypes.includes(file.mimetype)) {
                throw new BadRequestException(`File type ${file.mimetype} not allowed`);
            }
        }

        return file;
    },
);