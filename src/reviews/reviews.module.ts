
import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Review } from './review.entity';
import { CraftsModule } from '../crafts/crafts.module';
import { UsersModule } from '../users/users.module';
import { ReviewsController } from './reviews.controller';
import { ReviewsService } from './reviews.service';

@Module({
    imports: [
        TypeOrmModule.forFeature([Review]),
        forwardRef(() => CraftsModule),
        forwardRef(() => UsersModule),
    ],
    controllers: [ReviewsController],
    providers: [ReviewsService],
    exports: [ReviewsService],
})
export class ReviewsModule { }