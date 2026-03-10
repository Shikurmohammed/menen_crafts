import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Review } from './review.entity';
import { CreateReviewDto } from './dto/create-review.dto';
import { UpdateReviewDto } from './dto/update-review.dto';
import { CraftsService } from '../crafts/crafts.service';
import { User } from '../users/user.entity';
import { EmailService } from 'src/email/email.service';
@Injectable()
export class ReviewsService {
  
    constructor(
        @InjectRepository(Review)
        private reviewsRepository: Repository<Review>,
        private craftsService: CraftsService,
        private emailService: EmailService
    ) { }

    async create(createReviewDto: CreateReviewDto, user: User): Promise<Review> {
        const craft = await this.craftsService.findOne(createReviewDto.craftId);

        if (!craft) {
            throw new NotFoundException('Craft not found');
        }

        // Check if user has already reviewed this craft
        const existingReview = await this.reviewsRepository.findOne({
            where: { craft: { id: craft.id }, user: { id: user.id } },
        });

        if (existingReview) {
            throw new BadRequestException('You have already reviewed this craft');
        }

        // Check if user has purchased this craft (you'll need to implement this)
        const hasPurchased = await this.checkIfUserPurchasedCraft(user.id, craft.id);

        const review = this.reviewsRepository.create({
            ...createReviewDto,
            craft,
            user,
            isVerifiedPurchase: hasPurchased,
            status: 'PENDING', // New reviews are pending by default
        });

        const savedReview = await this.reviewsRepository.save(review);

        // Update the average rating of the craft
        await this.craftsService.updateAverageRating(craft.id);
        // Send notification email to artisan
        await this.emailService.sendReviewNotification(craft.artisan.email, savedReview);

        return savedReview;
    }

    async findAll(query: any): Promise<{ data: Review[]; total: number; page: number; limit: number; totalPages: number }> {
        const {
            page = 1,
            limit = 10,
            search,
            rating,
            craftId,
            status,
            startDate,
            endDate,
            sortBy = 'createdAt',
            sortOrder = 'DESC'
        } = query;

        const skip = (page - 1) * limit;
        const take = limit;

        const queryBuilder = this.reviewsRepository.createQueryBuilder('review')
            .leftJoinAndSelect('review.user', 'user')
            .leftJoinAndSelect('review.craft', 'craft')
            .leftJoinAndSelect('craft.artisan', 'artisan');

        // Search in comment and user names
        if (search) {
            queryBuilder.andWhere(
                '(review.comment ILIKE :search OR user.firstName ILIKE :search OR user.lastName ILIKE :search OR user.email ILIKE :search)',
                { search: `%${search}%` }
            );
        }

        // Filter by rating
        if (rating) {
            queryBuilder.andWhere('review.rating = :rating', { rating });
        }

        // Filter by craft
        if (craftId) {
            queryBuilder.andWhere('craft.id = :craftId', { craftId });
        }

        // Filter by status
        if (status) {
            queryBuilder.andWhere('review.status = :status', { status });
        }

        // Date range filter
        if (startDate && endDate) {
            queryBuilder.andWhere('review.createdAt BETWEEN :startDate AND :endDate', {
                startDate: new Date(startDate),
                endDate: new Date(endDate),
            });
        } else if (startDate) {
            queryBuilder.andWhere('review.createdAt >= :startDate', {
                startDate: new Date(startDate),
            });
        } else if (endDate) {
            queryBuilder.andWhere('review.createdAt <= :endDate', {
                endDate: new Date(endDate),
            });
        }

        // Sorting
        const order = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
        queryBuilder.orderBy(`review.${sortBy}`, order);

        // Pagination
        queryBuilder.skip(skip).take(take);

        const [data, total] = await queryBuilder.getManyAndCount();
        const totalPages = Math.ceil(total / limit);

        return { data, total, page: Number(page), limit: Number(limit), totalPages };
    }

    async findAllByCraft(craftId: number, query: any): Promise<{ data: Review[]; total: number }> {
        const { page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'DESC' } = query;

        const skip = (page - 1) * limit;
        const take = limit;

        const [data, total] = await this.reviewsRepository.findAndCount({
            where: {
                craft: { id: craftId },
                status: 'APPROVED' // Only show approved reviews publicly
            },
            relations: ['user'],
            order: { [sortBy]: sortOrder },
            skip,
            take,
        });

        return { data, total };
    }

    async findOne(id: number): Promise<Review> {
        const review = await this.reviewsRepository.findOne({
            where: { id },
            relations: ['user', 'craft', 'craft.artisan'],
        });

        if (!review) {
            throw new NotFoundException('Review not found');
        }
        return review;
    }

    async update(id: number, updateReviewDto: UpdateReviewDto, user: User): Promise<Review> {
        const review = await this.findOne(id);

        // Only the review owner can update
        if (review.user.id !== user.id) {
            throw new ForbiddenException('You are not the owner of this review');
        }

        // Don't allow status updates by regular users
        if (updateReviewDto.status && user.role !== 'ADMIN') {
            delete updateReviewDto.status;
        }

        Object.assign(review, updateReviewDto);
        const updatedReview = await this.reviewsRepository.save(review);

        // Update craft average rating
        await this.craftsService.updateAverageRating(review.craft.id);

        return updatedReview;
    }

    async remove(id: number, user: User): Promise<void> {
        const review = await this.findOne(id);

        // Allow admin or review owner to delete
        if (review.user.id !== user.id && user.role !== 'ADMIN') {
            throw new ForbiddenException('You are not authorized to delete this review');
        }

        const craftId = review.craft.id;
        await this.reviewsRepository.remove(review);

        // Update craft average rating
        await this.craftsService.updateAverageRating(craftId);
    }

    async approveReview(id: number): Promise<Review> {
        const review = await this.findOne(id);
        review.status = 'APPROVED';
        const updatedReview = await this.reviewsRepository.save(review);

        await this.craftsService.updateAverageRating(review.craft.id);

        return updatedReview;
    }

    async rejectReview(id: number): Promise<Review> {
        const review = await this.findOne(id);
        review.status = 'REJECTED';
        const updatedReview = await this.reviewsRepository.save(review);

        await this.craftsService.updateAverageRating(review.craft.id);

        return updatedReview;
    }

    async respondToReview(id: number, response: string, user: User): Promise<Review> {
        console.log("ID", id)
        const review = await this.findOne(id);
        console.log("Review", review)

        // If there is no artisan, or the artisan ID doesn't match, AND user isn't ADMIN
        if (review.craft.artisan?.id !== user.id && user.role !== 'ADMIN') {
            throw new ForbiddenException('Only the artisan of this craft can respond');
        }

        review.sellerResponse = response;
        return await this.reviewsRepository.save(review);
    }

    async getStats(): Promise<any> {
        const total = await this.reviewsRepository.count();
        const approved = await this.reviewsRepository.count({ where: { status: 'APPROVED' } });
        const pending = await this.reviewsRepository.count({ where: { status: 'PENDING' } });
        const rejected = await this.reviewsRepository.count({ where: { status: 'REJECTED' } });

        const avgRating = await this.reviewsRepository
            .createQueryBuilder('review')
            .select('AVG(review.rating)', 'avg')
            .where('review.status = :status', { status: 'APPROVED' })
            .getRawOne();

        const uniqueReviewers = await this.reviewsRepository
            .createQueryBuilder('review')
            .select('COUNT(DISTINCT review.userId)', 'count')
            .getRawOne();

        return {
            total,
            approved,
            pending,
            rejected,
            averageRating: Number(avgRating?.avg || 0).toFixed(1),
            uniqueReviewers: Number(uniqueReviewers?.count || 0),
        };
    }

    async exportReviews(query: any): Promise<any> {
        const reviews = await this.findAll(query);
        // Format for CSV export
        return reviews.data.map(review => ({
            ID: review.id,
            Customer: `${review.user.firstName} ${review.user.lastName}`,
            Email: review.user.email,
            Craft: review.craft.title,
            Rating: review.rating,
            Comment: review.comment,
            Status: review.status,
            'Verified Purchase': review.isVerifiedPurchase ? 'Yes' : 'No',
            Date: review.createdAt,
        }));
    }
     
    private async checkIfUserPurchasedCraft(userId: number, craftId: number): Promise<boolean> {
        // Implement this based on your order system
        // Return true if user has purchased this craft
        return false; // Placeholder
    }
}


