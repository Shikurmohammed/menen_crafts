import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Craft } from '../crafts/craft.entity';
import { Order } from '../orders/order.entity';
import { User } from '../users/user.entity';
import { Review } from '../reviews/review.entity';
import { CraftsModule } from '../crafts/crafts.module';
import { OrdersModule } from '../orders/orders.module';
import { UsersModule } from '../users/users.module';
import { ReviewsModule } from '../reviews/reviews.module';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';

@Module({
    imports: [
        TypeOrmModule.forFeature([Craft, Order, User, Review]),
        CraftsModule,
        OrdersModule,
        UsersModule,
        ReviewsModule,
    ],
    controllers: [DashboardController],
    providers: [DashboardService],
    exports: [DashboardService],
})
export class DashboardModule {}