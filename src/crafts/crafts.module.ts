import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CraftsService } from './crafts.service';
import { CraftsController } from './crafts.controller';
import { Craft } from './craft.entity';
import { CategoriesModule } from '../categories/categories.module';
import { ReviewsModule } from '../reviews/reviews.module';
import { UsersModule } from '../users/users.module';
import { Category } from 'src/categories/category.entity';

@Module({
    imports: [
        TypeOrmModule.forFeature([Craft, Category]),
        forwardRef(() => CategoriesModule),
        forwardRef(() => ReviewsModule),
        forwardRef(() => UsersModule),
    ],
    controllers: [CraftsController],
    providers: [CraftsService],
    exports: [CraftsService],
})
export class CraftsModule { }