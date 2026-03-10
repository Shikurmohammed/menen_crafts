import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Brackets, In } from 'typeorm';
import { User } from '../users/user.entity';
import { Craft } from '../crafts/craft.entity';
import { Review } from '../reviews/review.entity';
import { UserRole } from '../enums/UserRole.enum';
import { Artisan } from 'src/users/artisan.interface';


@Injectable()
export class ArtisansService {
    constructor(
        @InjectRepository(User)
        private usersRepository: Repository<User>,
        @InjectRepository(Craft)
        private craftsRepository: Repository<Craft>,
        @InjectRepository(Review)
        private reviewsRepository: Repository<Review>,
    ) { }
    async getFeaturedArtisans(limit = 6): Promise<Artisan[]> {
        // 1. Get ONLY the IDs (using 'rating' as per Entity)
        const artisanIdsResult = await this.usersRepository
            .createQueryBuilder('user')
            .select('user.id')
            .where('user.role = :role', { role: UserRole.ARTISAN })
            .andWhere('user.isActive = :isActive', { isActive: true })
            .orderBy('user.rating', 'DESC') // Matches @Column() rating
            .limit(limit)
            .getMany();

        if (artisanIdsResult.length === 0) return [];

        const ids = artisanIdsResult.map(u => u.id);

        // 2. Fetch full relations for those specific IDs
        const artisans = await this.usersRepository.find({
            where: { id: In(ids) },
            relations: ['crafts', 'crafts.reviews'],
            order: {
                rating: 'DESC' // Matches @Column() rating
            }
        });

        // 3. Map to Artisan interface
        const featuredArtisans = await Promise.all(
            artisans.map(async (artisan) => {
                const crafts = artisan.crafts || [];
                const totalViews = crafts.reduce((sum, craft) => sum + (craft.views || 0), 0);
                const totalReviews = crafts.reduce((sum, craft) => sum + (craft.reviews?.length || 0), 0);

                // Calculate current average based on its crafts
                const calculatedAvg = crafts.length > 0
                    ? crafts.reduce((sum, craft) => sum + (craft.averageRating || 0), 0) / crafts.length
                    : (artisan.rating || 0); // Fallback to user.rating if no crafts

                return {
                    ...artisan,
                    craftsCount: crafts.length,
                    totalViews,
                    totalReviews,
                    // These names match your 'Artisan' interface requirements
                    rating: Number(calculatedAvg),
                    avgRating: Number(calculatedAvg),
                    isVerified: artisan.isVerified,
                    specialties: await this.getArtisanSpecialties(artisan.id),
                    followersCount: 0,
                } as Artisan;
            })
        );

        return featuredArtisans;
    }


    async getArtisanDetails(id: number): Promise<any> {
        const artisan = await this.usersRepository.findOne({
            where: { id, role: UserRole.ARTISAN },
            relations: ['crafts', 'crafts.categories', 'crafts.reviews', 'crafts.orderItems'],
        });

        if (!artisan) {
            throw new NotFoundException('Artisan not found');
        }

        const crafts = artisan.crafts || [];
        const totalViews = crafts.reduce((sum, craft) => sum + (craft.views || 0), 0);
        const totalSales = crafts.reduce((sum, craft) => sum + (craft.orderItems?.length || 0), 0);
        const totalReviews = crafts.reduce((sum, craft) => sum + (craft.reviews?.length || 0), 0);
        const avgRating = crafts.reduce((sum, craft) => sum + (craft.averageRating || 0), 0) / (crafts.length || 1);

        // Get recent reviews across all crafts
        const recentReviews = await this.reviewsRepository
            .createQueryBuilder('review')
            .leftJoinAndSelect('review.craft', 'craft')
            .leftJoinAndSelect('review.user', 'user')
            .where('craft.artisan = :artisanId', { artisanId: id })
            .orderBy('review.createdAt', 'DESC')
            .limit(5)
            .getMany();

        return {
            id: artisan.id,
            email: artisan.email,
            firstName: artisan.firstName,
            lastName: artisan.lastName,
            avatar: artisan.avatar,
            bio: artisan.bio,
            location: {
                country: artisan.country,
                state: artisan.state,
                city: artisan.city,
                address: artisan.address,
            },
            phone: artisan.phone,
            isVerified: artisan.isVerified,
            joinedAt: artisan.createdAt,
            stats: {
                craftsCount: crafts.length,
                totalViews,
                totalSales,
                totalReviews,
                avgRating: Number(avgRating.toFixed(1)),
                responseRate: 98, // Placeholder - implement actual logic
                responseTime: 'within 24 hours',
            },
            specialties: await this.getArtisanSpecialties(id),
            recentReviews,
            socialLinks: {
                website: '',
                instagram: '',
                facebook: '',
                twitter: '',
            },
        };
    }

    async getArtisanCrafts(artisanId: number, query: any): Promise<any> {
        const { page = 1, limit = 12, sortBy = 'createdAt', sortOrder = 'DESC' } = query;
        const skip = (page - 1) * limit;

        const [crafts, total] = await this.craftsRepository.findAndCount({
            where: { artisan: { id: artisanId }, isAvailable: true },
            relations: ['categories', 'reviews'],
            order: { [sortBy]: sortOrder },
            skip,
            take: limit,
        });

        return {
            crafts,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };
    }

    async getTopArtisans(limit = 10): Promise<any[]> {
        const artisans = await this.usersRepository
            .createQueryBuilder('user')
            .leftJoinAndSelect('user.crafts', 'crafts')
            .leftJoinAndSelect('crafts.reviews', 'reviews')
            .where('user.role = :role', { role: UserRole.ARTISAN })
            .andWhere('user.isActive = :isActive', { isActive: true })
            .orderBy('crafts.views', 'DESC')
            .addOrderBy('crafts.averageRating', 'DESC')
            .limit(limit)
            .getMany();

        return artisans.map(artisan => ({
            id: artisan.id,
            name: `${artisan.firstName} ${artisan.lastName}`,
            avatar: artisan.avatar,
            craftsCount: artisan.crafts?.length || 0,
            totalViews: artisan.crafts?.reduce((sum, c) => sum + (c.views || 0), 0) || 0,
            avgRating: artisan.crafts?.reduce((sum, c) => sum + (c.averageRating || 0), 0) / (artisan.crafts?.length || 1) || 0,
        }));
    }

    async searchArtisans(query: string, limit = 10): Promise<any[]> {
        const searchTerm = `%${query}%`;
        return this.usersRepository
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
    }

    private async getArtisanSpecialties(artisanId: number): Promise<string[]> {
        const crafts = await this.craftsRepository
            .createQueryBuilder('craft')
            .leftJoinAndSelect('craft.categories', 'category')
            .where('craft.artisan = :artisanId', { artisanId })
            .getMany();

        const categoryMap = new Map<string, number>();
        crafts.forEach(craft => {
            craft.categories?.forEach(category => {
                const count = categoryMap.get(category.name) || 0;
                categoryMap.set(category.name, count + 1);
            });
        });

        return Array.from(categoryMap.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([name]) => name);
    }

    async artisanCount(query: Record<string, any>) {
        // This is the logic you had in ReviewsService
        const countResult = await this.usersRepository
            .createQueryBuilder('user')
            .where('user.role = :role', { role: UserRole.ARTISAN })
            .andWhere('user.isActive = :isActive', { isActive: true })
            .getCount();
        const count = { count: countResult };
        console.log(count)

        return { artisanCount: Number(count?.count || 0) };
    }

    async customerCount(query: Record<string, any>) {
        // This is the logic you had in ReviewsService
        const countResult = await this.usersRepository
            .createQueryBuilder('user')
            .where('user.role = :role', { role: UserRole.CUSTOMER })
            .andWhere('user.isActive = :isActive', { isActive: true })
            .getCount();
        const count = { count: countResult };
        console.log(count)

        return { customerCount: Number(count?.count || 0) };
    }

   
}