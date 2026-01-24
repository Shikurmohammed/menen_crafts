import { Injectable } from '@nestjs/common';
import { join } from 'path';

@Injectable()
export class UploadsService {
    getFileUrl(filename: string): string {
        // In production, you would return the full URL to the file
        return `/uploads/${filename}`;
    }

    getFilePath(filename: string): string {
        return join(process.cwd(), 'uploads', filename);
    }
}