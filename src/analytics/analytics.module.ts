import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Craft } from '../crafts/craft.entity';
import { Order } from '../orders/order.entity';
import { User } from '../users/user.entity';
import { Review } from '../reviews/review.entity';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';

@Module({
    imports: [
        TypeOrmModule.forFeature([Craft, Order, User, Review]),
    ],
    controllers: [AnalyticsController],
    providers: [AnalyticsService],
    exports: [AnalyticsService],
})
export class AnalyticsModule {}