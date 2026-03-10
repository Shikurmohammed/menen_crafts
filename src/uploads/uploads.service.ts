import { Injectable, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary } from 'cloudinary';
import { join } from 'path';
import { existsSync, unlinkSync } from 'fs';
import { Readable } from 'stream';

@Injectable()
export class UploadsService {
    private readonly uploadProvider: string;
    private readonly maxSize: number;
    private readonly allowedTypes: string[];

    constructor(private configService: ConfigService) {
        this.uploadProvider = this.configService.get('UPLOAD_PROVIDER', 'local');
        this.maxSize = this.configService.get('MAX_FILE_SIZE', 5 * 1024 * 1024);
        this.allowedTypes = this.configService.get('ALLOWED_FILE_TYPES', 'image/jpeg,image/png,image/gif,image/webp').split(',');

        // Initialize Cloudinary if configured
        if (this.uploadProvider === 'cloudinary') {
            cloudinary.config({
                cloud_name: this.configService.get('CLOUDINARY_CLOUD_NAME'),
                api_key: this.configService.get('CLOUDINARY_API_KEY'),
                api_secret: this.configService.get('CLOUDINARY_API_SECRET'),
            });
        }
    }

    /**
     * Upload a single file
     */
    async uploadFile(file: Express.Multer.File, folder = 'general'): Promise<{ url: string; publicId?: string }> {
        // Validate file
        this.validateFile(file);

        if (this.uploadProvider === 'cloudinary') {
            return this.uploadToCloudinary(file, folder);
        } else {
            return this.uploadToLocal(file);
        }
    }

    /**
     * Upload multiple files
     */
    async uploadMultiple(files: Express.Multer.File[], folder = 'general'): Promise<Array<{ url: string; publicId?: string }>> {
        const uploadPromises = files.map(file => this.uploadFile(file, folder));
        return Promise.all(uploadPromises);
    }

    /**
     * Delete a file by URL or public ID
     */
    async deleteFile(fileUrl: string, publicId?: string): Promise<void> {
        if (this.uploadProvider === 'cloudinary' && publicId) {
            await this.deleteFromCloudinary(publicId);
        } else {
            await this.deleteFromLocal(fileUrl);
        }
    }

    /**
     * Delete multiple files
     */
    async deleteMultiple(files: Array<{ url: string; publicId?: string }>): Promise<void> {
        const deletePromises = files.map(file => this.deleteFile(file.url, file.publicId));
        await Promise.all(deletePromises);
    }

    /**
     * Get file URL
     */
    getFileUrl(filename: string): string {
        if (this.uploadProvider === 'cloudinary') {
            // For Cloudinary, URLs are returned directly from upload
            return filename;
        }
        // For local storage
        return `/uploads/${filename}`;
    }

    /**
     * Get file path for local storage
     */
    getFilePath(filename: string): string {
        return join(process.cwd(), 'uploads', filename);
    }

    /**
     * Extract public ID from Cloudinary URL
     */
    extractPublicIdFromUrl(url: string): string | null {
        const matches = url.match(/\/v\d+\/(.+?)\./);
        return matches ? matches[1] : null;
    }

    // ==================== Private Methods ====================

    private validateFile(file: Express.Multer.File): void {
        if (!file) {
            throw new BadRequestException('No file provided');
        }

        if (file.size > this.maxSize) {
            throw new BadRequestException(`File too large. Max size is ${this.maxSize / (1024 * 1024)}MB`);
        }

        if (!this.allowedTypes.includes(file.mimetype)) {
            throw new BadRequestException(`File type ${file.mimetype} not allowed. Allowed types: ${this.allowedTypes.join(', ')}`);
        }
    }

    private async uploadToCloudinary(file: Express.Multer.File, folder: string): Promise<{ url: string; publicId: string }> {
        return new Promise((resolve, reject) => {
            const uploadStream = cloudinary.uploader.upload_stream(
                {
                    folder,
                    resource_type: 'auto',
                    allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
                    transformation: [
                        { quality: 'auto' },
                        { fetch_format: 'auto' }
                    ],
                },
                (error, result) => {
                    if (error) {
                        reject(new InternalServerErrorException(`Cloudinary upload failed: ${error.message}`));
                    } else {
                        resolve({
                            url: result.secure_url,
                            publicId: result.public_id,
                        });
                    }
                }
            );

            const bufferStream = new Readable();
            bufferStream.push(file.buffer);
            bufferStream.push(null);
            bufferStream.pipe(uploadStream);
        });
    }

    private async uploadToLocal(file: Express.Multer.File): Promise<{ url: string }> {
        // The file is already saved by Multer's diskStorage
        // We just need to return the URL
        return {
            url: this.getFileUrl(file.filename),
        };
    }

    private async deleteFromCloudinary(publicId: string): Promise<void> {
        return new Promise((resolve, reject) => {
            cloudinary.uploader.destroy(publicId, (error, result) => {
                if (error) {
                    reject(new InternalServerErrorException(`Cloudinary delete failed: ${error.message}`));
                } else {
                    resolve();
                }
            });
        });
    }

    private async deleteFromLocal(fileUrl: string): Promise<void> {
        try {
            const filename = fileUrl.split('/').pop();
            if (!filename) return;

            const filePath = this.getFilePath(filename);
            if (existsSync(filePath)) {
                unlinkSync(filePath);
            }
        } catch (error) {
            throw new InternalServerErrorException(`Failed to delete local file: ${error.message}`);
        }
    }

    //
    debugSignature(params: Record<string, any>) {
    const apiSecret = this.configService.get('CLOUDINARY_API_SECRET');
    const sortedParams = Object.keys(params)
        .sort()
        .map(key => `${key}=${params[key]}`)
        .join('&');
    
    const stringToSign = sortedParams + apiSecret;
    const signature = require('crypto')
        .createHash('sha256')
        .update(stringToSign)
        .digest('hex');
    
    console.log('=== CLOUDINARY DEBUG ===');
    console.log('Params:', params);
    console.log('String to sign:', stringToSign);
    console.log('Generated signature:', signature);
    console.log('=======================');
    
    return signature;
}
}