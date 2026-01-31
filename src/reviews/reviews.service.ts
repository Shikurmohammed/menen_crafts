import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Review } from './review.entity';
import { CreateReviewDto } from './dto/create-review.dto';
import { UpdateReviewDto } from './dto/update-review.dto';
import { CraftsService } from '../crafts/crafts.service';
import { User } from '../users/user.entity';

@Injectable()
export class ReviewsService {
    constructor(
        @InjectRepository(Review)
        private reviewsRepository: Repository<Review>,
        private craftsService: CraftsService,
    ) { }

    async create(createReviewDto: CreateReviewDto, user: User): Promise<Review> {
        const craft = await this.craftsService.findOne(createReviewDto.craftId);

        // Check if user has already reviewed this craft
        const existingReview = await this.reviewsRepository.findOne({
            where: { craft: { id: craft.id }, user: { id: user.id } },
        });

        if (existingReview) {
            throw new BadRequestException('You have already reviewed this craft');
        }

        const review = this.reviewsRepository.create({
            ...createReviewDto,
            craft,
            user,
        });

        const savedReview = await this.reviewsRepository.save(review);

        // Update the average rating of the craft
        await this.craftsService.updateAverageRating(craft.id);

        return savedReview;
    }

    async findAllByCraft(craftId: number): Promise<Review[]> {
        return await this.reviewsRepository.find({
            where: { craft: { id: craftId } },
            relations: ['user'],
        });
    }

    async findOne(id: number): Promise<Review> {
        const review = await this.reviewsRepository.findOne({
            where: { id },
            relations: ['user', 'craft'],
        });
        if (!review) {
            throw new NotFoundException('Review not found');
        }
        return review;
    }

    async update(id: number, updateReviewDto: UpdateReviewDto, user: User): Promise<Review> {
        const review = await this.findOne(id);

        if (review.user.id !== user.id) {
            throw new BadRequestException('You are not the owner of this review');
        }

        Object.assign(review, updateReviewDto);
        const updatedReview = await this.reviewsRepository.save(review);

        // Update the average rating of the craft
        await this.craftsService.updateAverageRating(review.craft.id);

        return updatedReview;
    }

    async remove(id: number, user: User): Promise<void> {
        const review = await this.findOne(id);

        if (review.user.id !== user.id) {
            throw new BadRequestException('You are not the owner of this review');
        }

        const craftId = review.craft.id;
        await this.reviewsRepository.remove(review);

        // Update the average rating of the craft
        await this.craftsService.updateAverageRating(craftId);
    }
}