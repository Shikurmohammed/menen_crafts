import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { UsersModule } from '../users/users.module';
import { CraftsModule } from '../crafts/crafts.module';
import { ReviewsModule } from '../reviews/reviews.module';
import { ArtisansController } from './artisans.controller';
import { ArtisansService } from './artisans.service';
import { User } from 'src/users/user.entity';
import { Review } from 'src/reviews/review.entity';
import { Craft } from 'src/crafts/craft.entity';

@Module({
    imports: [
         TypeOrmModule.forFeature([User, Craft, Review]), 
        forwardRef(() => UsersModule),
        forwardRef(() => CraftsModule),
        forwardRef(() => ReviewsModule),
    ],
    controllers: [ArtisansController],
    providers: [ArtisansService],
    exports: [ArtisansService],
})
export class ArtisansModule {}