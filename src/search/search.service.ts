import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Brackets } from 'typeorm';
import { Craft } from '../crafts/craft.entity';
import { User } from '../users/user.entity';
import { Category } from '../categories/category.entity';
import { UserRole } from '../enums/UserRole.enum';

@Injectable()
export class SearchService {
    constructor(
        @InjectRepository(Craft)
        private craftsRepository: Repository<Craft>,
        @InjectRepository(User)
        private usersRepository: Repository<User>,
        @InjectRepository(Category)
        private categoriesRepository: Repository<Category>,
    ) {}

    async globalSearch(query: string, limit = 10): Promise<any> {
        const searchTerm = `%${query}%`;

        // Search crafts
        const crafts = await this.craftsRepository
            .createQueryBuilder('craft')
            .leftJoinAndSelect('craft.artisan', 'artisan')
            .leftJoinAndSelect('craft.categories', 'categories')
            .where('craft.isAvailable = :isAvailable', { isAvailable: true })
            .andWhere(
                new Brackets(qb => {
                    qb.where('craft.title ILIKE :search', { search: searchTerm })
                      .orWhere('craft.description ILIKE :search', { search: searchTerm });
                })
            )
            .limit(limit)
            .getMany();

        // Search artisans
        const artisans = await this.usersRepository
            .createQueryBuilder('user')
            .where('user.role = :role', { role: UserRole.ARTISAN })
            .andWhere('user.isActive = :isActive', { isActive: true })
            .andWhere(
                new Brackets(qb => {
                    qb.where('user.firstName ILIKE :search', { search: searchTerm })
                      .orWhere('user.lastName ILIKE :search', { search: searchTerm })
                      .orWhere('user.email ILIKE :search', { search: searchTerm })
                      .orWhere('user.bio ILIKE :search', { search: searchTerm });
                })
            )
            .limit(limit)
            .getMany();

        // Search categories
        const categories = await this.categoriesRepository
            .createQueryBuilder('category')
            .where('category.name ILIKE :search', { search: searchTerm })
            .orWhere('category.description ILIKE :search', { search: searchTerm })
            .limit(limit)
            .getMany();

        return {
            crafts: crafts.map(c => ({
                id: c.id,
                title: c.title,
                description: c.description.substring(0, 150) + '...',
                price: c.price,
                image: c.images?.[0],
                artisan: `${c.artisan?.firstName} ${c.artisan?.lastName}`,
                type: 'craft',
            })),
            artisans: artisans.map(a => ({
                id: a.id,
                name: `${a.firstName} ${a.lastName}`,
                avatar: a.avatar,
                craftsCount: a.crafts?.length || 0,
                location: `${a.city || ''} ${a.country || ''}`.trim(),
                type: 'artisan',
            })),
            categories: categories.map(c => ({
                id: c.id,
                name: c.name,
                image: c.image,
                type: 'category',
            })),
        };
    }

    async autocomplete(query: string, limit = 5): Promise<any[]> {
        const searchTerm = `%${query}%`;

        const crafts = await this.craftsRepository
            .createQueryBuilder('craft')
            .select(['craft.id', 'craft.title', 'craft.price', 'craft.images'])
            .where('craft.title ILIKE :search', { search: searchTerm })
            .andWhere('craft.isAvailable = :isAvailable', { isAvailable: true })
            .limit(limit)
            .getMany();

        const artisans = await this.usersRepository
            .createQueryBuilder('user')
            .select(['user.id', 'user.firstName', 'user.lastName', 'user.avatar'])
            .where('user.role = :role', { role: UserRole.ARTISAN })
            .andWhere(
                new Brackets(qb => {
                    qb.where('user.firstName ILIKE :search', { search: searchTerm })
                      .orWhere('user.lastName ILIKE :search', { search: searchTerm });
                })
            )
            .limit(limit)
            .getMany();

        const suggestions = [
            ...crafts.map(c => ({
                id: c.id,
                text: c.title,
                type: 'craft',
                image: c.images?.[0],
                price: c.price,
            })),
            ...artisans.map(a => ({
                id: a.id,
                text: `${a.firstName} ${a.lastName}`,
                type: 'artisan',
                image: a.avatar,
            })),
        ];

        return suggestions.slice(0, limit);
    }

    async advancedSearch(criteria: any): Promise<any> {
        const {
            query,
            categoryIds,
            minPrice,
            maxPrice,
            artisanId,
            sortBy = 'relevance',
            page = 1,
            limit = 20,
        } = criteria;

        const skip = (page - 1) * limit;

        const queryBuilder = this.craftsRepository
            .createQueryBuilder('craft')
            .leftJoinAndSelect('craft.artisan', 'artisan')
            .leftJoinAndSelect('craft.categories', 'categories')
            .where('craft.isAvailable = :isAvailable', { isAvailable: true });

        if (query) {
            queryBuilder.andWhere(
                new Brackets(qb => {
                    qb.where('craft.title ILIKE :search', { search: `%${query}%` })
                      .orWhere('craft.description ILIKE :search', { search: `%${query}%` });
                })
            );
        }

        if (categoryIds?.length) {
            queryBuilder.andWhere('categories.id IN (:...categoryIds)', { categoryIds });
        }

        if (minPrice !== undefined) {
            queryBuilder.andWhere('craft.price >= :minPrice', { minPrice });
        }

        if (maxPrice !== undefined) {
            queryBuilder.andWhere('craft.price <= :maxPrice', { maxPrice });
        }

        if (artisanId) {
            queryBuilder.andWhere('artisan.id = :artisanId', { artisanId });
        }

        // Sorting
        switch (sortBy) {
            case 'price_asc':
                queryBuilder.orderBy('craft.price', 'ASC');
                break;
            case 'price_desc':
                queryBuilder.orderBy('craft.price', 'DESC');
                break;
            case 'newest':
                queryBuilder.orderBy('craft.createdAt', 'DESC');
                break;
            case 'rating':
                queryBuilder.orderBy('craft.averageRating', 'DESC');
                break;
            case 'popular':
                queryBuilder.orderBy('craft.views', 'DESC');
                break;
            default:
                // For relevance, we use a combination of factors
                queryBuilder
                    .addOrderBy('craft.averageRating', 'DESC')
                    .addOrderBy('craft.views', 'DESC')
                    .addOrderBy('craft.createdAt', 'DESC');
        }

        const [crafts, total] = await queryBuilder
            .skip(skip)
            .take(limit)
            .getManyAndCount();

        return {
            crafts,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };
    }

    async getSearchHistory(userId: number): Promise<any[]> {
        // Implement search history tracking
        // This would require a SearchHistory entity
        return [];
    }

    async clearSearchHistory(userId: number): Promise<void> {
        // Implement search history clearing
    }
}