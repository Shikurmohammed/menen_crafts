/* eslint-disable @typescript-eslint/no-explicit-any */
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, Between, In } from 'typeorm';
import { Craft } from './craft.entity';
import { CreateCraftDto } from './dto/create-craft.dto';
import { UpdateCraftDto } from './dto/update-craft.dto';
import { Category } from '../categories/category.entity';
import { User } from '../users/user.entity';

@Injectable()
export class CraftsService {
    constructor(
        @InjectRepository(Craft)
        private craftsRepository: Repository<Craft>,
        @InjectRepository(Category)
        private categoriesRepository: Repository<Category>,
    ) { }

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
            throw new BadRequestException('You are not the owner of this craft');
        }

        if (updateCraftDto.categoryIds) {
            const categories = await this.categoriesRepository.findBy({
                id: In(updateCraftDto.categoryIds),
            });
            craft.categories = categories;
            delete updateCraftDto.categoryIds;
        }

        Object.assign(craft, updateCraftDto);

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
}