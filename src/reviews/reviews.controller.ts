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
    Query,
} from '@nestjs/common';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { UpdateReviewDto } from './dto/update-review.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../users/user.entity';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { UserRole } from 'src/enums/UserRole.enum';

@Controller('reviews')

export class ReviewsController {
    constructor(private readonly reviewsService: ReviewsService) { }

    @Get()
    async findAll(@Query() query: Record<string, any>) {
        return await this.reviewsService.findAll(query);
    }

    @Get('stats')
    async getStats() {
        return await this.reviewsService.getStats();
    }

    @Get('craft/:craftId')
    async findAllByCraft(
        @Param('craftId', ParseIntPipe) craftId: number,
        @Query() query: Record<string, any>,
    ) {
        return await this.reviewsService.findAllByCraft(craftId, query);
    }
    @UseGuards(JwtAuthGuard)
    @Get('export')
    @Roles(UserRole.ADMIN)
    async exportReviews(@Query() query: Record<string, any>) {
        return await this.reviewsService.exportReviews(query);
    }
    @Get('testimonials')
    async getTestimonials() {
        return 'Fetching Testimonials...';
    }
   
    @Get(':id')
    async findOne(@Param('id', ParseIntPipe) id: number) {
        return await this.reviewsService.findOne(id);
    }

    @Post()
    async create(
        @Body() createReviewDto: CreateReviewDto,
        @CurrentUser() user: User,
    ) {
        return await this.reviewsService.create(createReviewDto, user);
    }
    @UseGuards(JwtAuthGuard)
    @Patch(':id/approve')
    @Roles(UserRole.ADMIN)
    async approveReview(@Param('id', ParseIntPipe) id: number) {
        return await this.reviewsService.approveReview(id);
    }
    @UseGuards(JwtAuthGuard)
    @Patch(':id/reject')
    @Roles(UserRole.ADMIN)
    async rejectReview(@Param('id', ParseIntPipe) id: number) {
        return await this.reviewsService.rejectReview(id);
    }
    @UseGuards(JwtAuthGuard)
    @Post(':id/respond')
    @Roles(UserRole.ARTISAN, UserRole.ADMIN)
    async respondToReview(
        @Param('id', ParseIntPipe) id: number,
        @Body('response') response: string,
        @CurrentUser() user: User,
    ) {
        console.log(id)
        console.log(response)
        console.log(user)

        return await this.reviewsService.respondToReview(id, response, user);
    }

    @UseGuards(JwtAuthGuard)
    @Patch(':id')
    async update(
        @Param('id', ParseIntPipe) id: number,
        @Body() updateReviewDto: UpdateReviewDto,
        @CurrentUser() user: User,
    ) {
        return await this.reviewsService.update(id, updateReviewDto, user);
    }
    @UseGuards(JwtAuthGuard)
    @Delete(':id')
    async remove(
        @Param('id', ParseIntPipe) id: number,
        @CurrentUser() user: User,
    ) {
        await this.reviewsService.remove(id, user);
        return { message: 'Review deleted successfully' };
    }

}











// @Controller('reviews')
// @UseGuards(JwtAuthGuard)
// export class ReviewsController {
//     constructor(private readonly reviewsService: ReviewsService) { }

//     @Get('craft/:craftId')
//     async findAllByCraft(@Param('craftId', ParseIntPipe) craftId: number) {
//         return await this.reviewsService.findAllByCraft(craftId);
//     }

//     @Get(':id')
//     async findOne(@Param('id', ParseIntPipe) id: number) {
//         return await this.reviewsService.findOne(id);
//     }
//     @Get()
//     async findAll() {
//         return await this.reviewsService.findAll();
//     }

//     @Post()
//     async create(
//         @Body() createReviewDto: CreateReviewDto,
//         @CurrentUser() user: User,
//     ) {
//         //console.log('Creating review for user:', user, createReviewDto);
//         return await this.reviewsService.create(createReviewDto, user);
//     }

//     @Patch(':id')
//     async update(
//         @Param('id', ParseIntPipe) id: number,
//         @Body() updateReviewDto: UpdateReviewDto,
//         @CurrentUser() user: User,
//     ) {
//         console.log('Updating review ID:', id, 'with data:', updateReviewDto, 'by user:', user);
//         return await this.reviewsService.update(id, updateReviewDto, user);
//     }

//     @Delete(':id')
//     async remove(
//         @Param('id', ParseIntPipe) id: number,
//         @CurrentUser() user: User,
//     ) {
//         await this.reviewsService.remove(id, user);
//         return { message: 'Review deleted successfully' };
//     }
// }