import {
    Controller,
    Get,
    Post,
    Body,
    Patch,
    Param,
    Delete,
    UseGuards,
    ParseIntPipe,
} from '@nestjs/common';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { UpdateReviewDto } from './dto/update-review.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../users/user.entity';

@Controller('reviews')
export class ReviewsController {
    constructor(private readonly reviewsService: ReviewsService) { }

    @Get('craft/:craftId')
    async findAllByCraft(@Param('craftId', ParseIntPipe) craftId: number) {
        return await this.reviewsService.findAllByCraft(craftId);
    }

    @Get(':id')
    async findOne(@Param('id', ParseIntPipe) id: number) {
        return await this.reviewsService.findOne(id);
    }

    @Post()
    @UseGuards(JwtAuthGuard)
    async create(
        @Body() createReviewDto: CreateReviewDto,
        @CurrentUser() user: User,
    ) {
        return await this.reviewsService.create(createReviewDto, user);
    }

    @Patch(':id')
    @UseGuards(JwtAuthGuard)
    async update(
        @Param('id', ParseIntPipe) id: number,
        @Body() updateReviewDto: UpdateReviewDto,
        @CurrentUser() user: User,
    ) {
        return await this.reviewsService.update(id, updateReviewDto, user);
    }

    @Delete(':id')
    @UseGuards(JwtAuthGuard)
    async remove(
        @Param('id', ParseIntPipe) id: number,
        @CurrentUser() user: User,
    ) {
        await this.reviewsService.remove(id, user);
        return { message: 'Review deleted successfully' };
    }
}