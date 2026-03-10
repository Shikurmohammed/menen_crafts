/* eslint-disable @typescript-eslint/no-explicit-any */
import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, Between, In } from 'typeorm';
import { Craft } from './craft.entity';
import { CreateCraftDto } from './dto/create-craft.dto';
import { UpdateCraftDto } from './dto/update-craft.dto';
import { Category } from '../categories/category.entity';
import { User } from '../users/user.entity';
import * as path from 'path';

import { promisify } from 'util';
import * as fs from 'fs';
import { v4 as uuidv4 } from 'uuid';


const writeFileAsync = promisify(fs.writeFile);
const mkdirAsync = promisify(fs.mkdir);

@Injectable()
export class CraftsService {
   
    constructor(
        @InjectRepository(Craft)
        private craftsRepository: Repository<Craft>,
        @InjectRepository(Category)
        private categoriesRepository: Repository<Category>,
    ) { }

    /**
    * Save uploaded images to disk and return URLs
    */
    async saveImages(files: Express.Multer.File[]): Promise<string[]> {
        if (!files || files.length === 0) {
            return [];
        }

        const uploadDir = path.join(process.cwd(), 'uploads', 'crafts');

        // Create directory if it doesn't exist
        try {
            await mkdirAsync(uploadDir, { recursive: true });
        } catch (error) {
            console.error('Error creating upload directory:', error);
            throw new BadRequestException('Could not create upload directory');
        }

        const imageUrls: string[] = [];

        for (const file of files) {
            // Add null check for file
            if (!file) continue;

            // Generate unique filename
            const fileExtension = file.originalname ? path.extname(file.originalname) : '.jpg';
            const fileName = `${uuidv4()}${fileExtension}`;
            const filePath = path.join(uploadDir, fileName);

            // Validate file type
            const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
            if (file.mimetype && !allowedMimeTypes.includes(file.mimetype)) {
                throw new BadRequestException(`Invalid file type: ${file.mimetype}. Only JPEG, PNG, WebP, and GIF are allowed.`);
            }

            // Validate file size (5MB max)
            const maxSize = 5 * 1024 * 1024; // 5MB
            if (file.size > maxSize) {
                throw new BadRequestException(`File too large: ${file.originalname}. Maximum size is 5MB.`);
            }

            try {
                // Save file to disk
                await writeFileAsync(filePath, file.buffer);

                // Generate URL for the image
                const imageUrl = `/uploads/crafts/${fileName}`;
                imageUrls.push(imageUrl);
            } catch (error) {
                console.error(`Error saving file ${file.originalname}:`, error);
                throw new BadRequestException(`Failed to save file: ${file.originalname}`);
            }
        }

        return imageUrls;
    }

    /**
     * Delete images from disk
     */
    async deleteImages(imageUrls: string[]): Promise<void> {
        if (!imageUrls || imageUrls.length === 0) {
            return;
        }

        for (const imageUrl of imageUrls) {
            try {
                // Extract filename from URL
                const fileName = path.basename(imageUrl);
                const filePath = path.join(process.cwd(), 'uploads', 'crafts', fileName);

                // Check if file exists before deleting
                if (fs.existsSync(filePath)) {
                    await promisify(fs.unlink)(filePath);
                }
            } catch (error) {
                console.error(`Error deleting file ${imageUrl}:`, error);
                // Don't throw - just log the error
            }
        }
    }


    async create(createCraftDto: CreateCraftDto, artisan: User): Promise<Craft> {
        const categories = await this.categoriesRepository.findBy({
            id: In(createCraftDto.categoryIds || []),
        });

        const craft = this.craftsRepository.create({
            ...createCraftDto,
            artisan,
            categories,
        });

        return await this.craftsRepository.save(craft);
    }
    async findAll(query: any): Promise<{ data: Craft[]; total: number }> {
        const page = Number(query.page) || 1;
        const limit = Number(query.limit) || 12;
        const skip = (page - 1) * limit;

        const sortFieldMap: Record<string, string> = {
            createdAt: 'craft.createdAt',
            price: 'craft.price',
            views: 'craft.views',
            averageRating: 'craft.averageRating',
        };

        const sortBy = sortFieldMap[query.sortBy] || 'craft.createdAt';
        const sortOrder =
            query.sortOrder?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

        const qb = this.craftsRepository
            .createQueryBuilder('craft')
            .leftJoinAndSelect('craft.artisan', 'artisan')
            .leftJoinAndSelect('craft.categories', 'category')
            .where('craft.isAvailable = true');

        if (query.search) {
            qb.andWhere('craft.title ILIKE :search', {
                search: `%${query.search}%`,
            });
        }

        if (query.category) {
            qb.andWhere('category.name = :category', {
                category: query.category,
            });
        }

        if (query.minPrice || query.maxPrice) {
            qb.andWhere('craft.price BETWEEN :min AND :max', {
                min: Number(query.minPrice) || 0,
                max: Number(query.maxPrice) || 999999,
            });
        }

        qb.orderBy(sortBy, sortOrder)
            .skip(skip)
            .take(limit);

        const [data, total] = await qb.getManyAndCount();
        return { data, total };
    }


    async findAllV1(query: any): Promise<{ data: Craft[]; total: number }> {
        const {
            page = 1,
            limit = 12,
            search,
            category,
            minPrice,
            maxPrice,
            sortBy = 'createdAt',
            sortOrder = 'DESC'
        } = query;

        const skip = (page - 1) * limit;
        const where: any = { isAvailable: true };

        if (search) {
            where.title = Like(`%${search}%`);
        }

        if (category) {
            where.categories = { id: category };
        }

        if (minPrice !== undefined || maxPrice !== undefined) {
            where.price = Between(
                minPrice || 0,
                maxPrice || 999999
            );
        }

        const [data, total] = await this.craftsRepository.findAndCount({
            where,
            relations: ['artisan', 'categories'],
            order: { [sortBy]: sortOrder },
            skip,
            take: limit,
        });
        if (!data) {
            throw new NotFoundException("No crafts found")
        }
        return { data, total };
    }

    async findOne(id: number): Promise<Craft> {
        const craft = await this.craftsRepository.findOne({
            where: { id },
            relations: ['artisan', 'categories', 'reviews', 'reviews.user'],
        });

        if (!craft) {
            throw new NotFoundException('Craft not found');
        }

        // Increment view count
        craft.views += 1;
        await this.craftsRepository.save(craft);

        return craft;
    }

    async update(id: number, updateCraftDto: UpdateCraftDto, artisan?: User): Promise<Craft> {
        const craft = await this.findOne(id);

        // Check if the artisan is the owner of the craft (if artisan is provided)
        if (artisan && craft.artisan.id !== artisan.id) {
            throw new ForbiddenException('You can only modify your own crafts');
        }

        if (updateCraftDto.categoryIds) {
            const categories = await this.categoriesRepository.findBy({
                id: In(updateCraftDto.categoryIds),
            });
            craft.categories = categories;// Update categories relation
            delete updateCraftDto.categoryIds;// Remove categoryIds from updateCraftDto to avoid issues with Object.assign
        }

        Object.assign(craft, updateCraftDto);//Copy properties from updateCraftDto to craft entity

        return await this.craftsRepository.save(craft);
    }

    async remove(id: number, artisan?: User): Promise<void> {
        const craft = await this.findOne(id);

        if (artisan && craft.artisan.id !== artisan.id) {
            throw new BadRequestException('You are not the owner of this craft');
        }

        await this.craftsRepository.remove(craft);
    }

    async findByArtisan(artisanId: number): Promise<Craft[]> {
        return await this.craftsRepository.find({
            where: { artisan: { id: artisanId } },
            relations: ['categories'],
        });
    }

    async updateAverageRating(craftId: number): Promise<void> {
        const craft = await this.craftsRepository.findOne({
            where: { id: craftId },
            relations: ['reviews'],
        });

        if (!craft) {
            throw new NotFoundException('Craft not found');
        }

        if (craft.reviews.length === 0) {
            craft.averageRating = 0;
        } else {
            const total = craft.reviews.reduce((sum, review) => sum + review.rating, 0);
            craft.averageRating = total / craft.reviews.length;
        }

        await this.craftsRepository.save(craft);
    }

    /**
     * Get marketplace statistics for crafts
     * Note: Ensure the route @Get('stats') in your Controller is ABOVE @Get(':id')
     */
    async getStats(): Promise<any> {
        // 1. Get total number of crafts
        const total = await this.craftsRepository.count();

        // 2. Get available vs unavailable
        const available = await this.craftsRepository.count({ where: { isAvailable: true } });
        
        // 3. Get total views across all crafts
        const { totalViews } = await this.craftsRepository
            .createQueryBuilder('craft')
            .select('SUM(craft.views)', 'totalViews')
            .getRawOne();

        // 4. Get average rating across the platform
        const { globalAvgRating } = await this.craftsRepository
            .createQueryBuilder('craft')
            .select('AVG(craft.averageRating)', 'globalAvgRating')
            .where('craft.averageRating > 0')
            .getRawOne();

        // 5. Get count by category (Optional but very useful for dashboards)
        const categoryDistribution = await this.craftsRepository
            .createQueryBuilder('craft')
            .leftJoin('craft.categories', 'category')
            .select('category.name', 'category')
            .addSelect('COUNT(craft.id)', 'count')
            .groupBy('category.name')
            .getRawMany();

        return {
            totalCrafts: total,
            availableCrafts: available,
            outOfStock: total - available,
            platformTotalViews: Number(totalViews || 0),
            platformAverageRating: Number(globalAvgRating || 0).toFixed(1),
            categoryDistribution
        };
    }

     async findFeatured() {
        return this.craftsRepository.find({
            where: { isAvailable: true },
            order: { views: 'DESC' },
            take: 5,
            relations: ['artisan', 'categories'],
        });
    }


    /**
     * Update craft stock and handle availability automatically
     */
    async updateStock(id: number, stock: number, user: User): Promise<Craft> {
        const craft = await this.findOne(id);

        // Security check: Only the owner (artisan) or an ADMIN can update
        if (user.role !== 'ADMIN' && craft.artisan.id !== user.id) {
            throw new ForbiddenException('You can only update stock for your own crafts');
        }

        craft.stock = stock;
        // Automatically set availability based on stock level
        craft.isAvailable = stock > 0;

        return await this.craftsRepository.save(craft);
    }

}