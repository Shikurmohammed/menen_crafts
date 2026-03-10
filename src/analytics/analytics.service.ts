import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Craft } from '../crafts/craft.entity';
import { Order } from '../orders/order.entity';
import { User } from '../users/user.entity';
import { Review } from '../reviews/review.entity';
import { UserRole } from '../enums/UserRole.enum';
import { OrderStatus } from '../enums/OrderStatus';

@Injectable()
export class AnalyticsService {
    constructor(
        @InjectRepository(Craft)
        private craftsRepository: Repository<Craft>,
        @InjectRepository(Order)
        private ordersRepository: Repository<Order>,
        @InjectRepository(User)
        private usersRepository: Repository<User>,
        @InjectRepository(Review)
        private reviewsRepository: Repository<Review>,
    ) {}

    async getWebsiteAnalytics(startDate?: Date, endDate?: Date): Promise<any> {
        const now = new Date();
        const thirtyDaysAgo = new Date(now.setDate(now.getDate() - 30));
        
        const dateRange = {
            start: startDate || thirtyDaysAgo,
            end: endDate || new Date(),
        };

        const [
            totalUsers,
            newUsers,
            totalCrafts,
            newCrafts,
            totalOrders,
            completedOrders,
            totalRevenue,
            averageOrderValue,
        ] = await Promise.all([
            this.usersRepository.count(),
            this.usersRepository.count({
                where: { createdAt: Between(dateRange.start, dateRange.end) },
            }),
            this.craftsRepository.count(),
            this.craftsRepository.count({
                where: { createdAt: Between(dateRange.start, dateRange.end) },
            }),
            this.ordersRepository.count(),
            this.ordersRepository.count({
                where: { 
                    status: OrderStatus.DELIVERED,
                    createdAt: Between(dateRange.start, dateRange.end),
                },
            }),
            this.ordersRepository
                .createQueryBuilder('order')
                .select('SUM(order.totalAmount)', 'total')
                .where('order.createdAt BETWEEN :start AND :end', dateRange)
                .getRawOne(),
            this.ordersRepository
                .createQueryBuilder('order')
                .select('AVG(order.totalAmount)', 'avg')
                .where('order.createdAt BETWEEN :start AND :end', dateRange)
                .getRawOne(),
        ]);

        return {
            period: {
                start: dateRange.start,
                end: dateRange.end,
            },
            users: {
                total: totalUsers,
                new: newUsers,
                growth: totalUsers > 0 ? (newUsers / totalUsers) * 100 : 0,
            },
            crafts: {
                total: totalCrafts,
                new: newCrafts,
                growth: totalCrafts > 0 ? (newCrafts / totalCrafts) * 100 : 0,
            },
            orders: {
                total: totalOrders,
                completed: completedOrders,
                conversionRate: totalOrders > 0 ? (completedOrders / totalOrders) * 100 : 0,
            },
            revenue: {
                total: Number(totalRevenue?.total || 0),
                averageOrderValue: Number(averageOrderValue?.avg || 0),
            },
        };
    }

    async getCraftAnalytics(craftId: number, startDate?: Date, endDate?: Date): Promise<any> {
        const craft = await this.craftsRepository.findOne({
            where: { id: craftId },
            relations: ['reviews', 'orderItems', 'orderItems.order'],
        });

        if (!craft) {
            throw new NotFoundException('Craft not found');
        }

        const dateRange = {
            start: startDate || new Date(new Date().setDate(new Date().getDate() - 30)),
            end: endDate || new Date(),
        };

        const orders = craft.orderItems?.filter(oi => 
            oi.order?.createdAt >= dateRange.start && 
            oi.order?.createdAt <= dateRange.end
        ) || [];

        const totalSales = orders.reduce((sum, oi) => sum + oi.quantity, 0);
        const revenue = orders.reduce((sum, oi) => sum + oi.subtotal, 0);
        const reviews = craft.reviews || [];

        return {
            craft: {
                id: craft.id,
                title: craft.title,
                views: craft.views,
                averageRating: craft.averageRating,
            },
            period: {
                start: dateRange.start,
                end: dateRange.end,
            },
            sales: {
                total: totalSales,
                revenue,
                averagePrice: totalSales > 0 ? revenue / totalSales : 0,
            },
            reviews: {
                total: reviews.length,
                average: craft.averageRating,
                distribution: this.getRatingDistribution(reviews),
            },
            performance: {
                viewsToSales: craft.views > 0 ? (totalSales / craft.views) * 100 : 0,
                conversionRate: craft.views > 0 ? (orders.length / craft.views) * 100 : 0,
            },
        };
    }

    async getUserAnalytics(startDate?: Date, endDate?: Date): Promise<any> {
        const dateRange = {
            start: startDate || new Date(new Date().setDate(new Date().getDate() - 30)),
            end: endDate || new Date(),
        };

        const users = await this.usersRepository
            .createQueryBuilder('user')
            .where('user.createdAt BETWEEN :start AND :end', dateRange)
            .getMany();

        const roleDistribution = {
            [UserRole.ADMIN]: users.filter(u => u.role === UserRole.ADMIN).length,
            [UserRole.ARTISAN]: users.filter(u => u.role === UserRole.ARTISAN).length,
            [UserRole.CUSTOMER]: users.filter(u => u.role === UserRole.CUSTOMER).length,
        };

        const activeUsers = await this.usersRepository
            .createQueryBuilder('user')
            .leftJoin('user.orders', 'order')
            .where('order.createdAt BETWEEN :start AND :end', dateRange)
            .select('COUNT(DISTINCT user.id)', 'count')
            .getRawOne();

        return {
            total: users.length,
            roleDistribution,
            activeUsers: Number(activeUsers?.count || 0),
            retention: users.length > 0 ? (activeUsers?.count / users.length) * 100 : 0,
        };
    }

    async getSalesFunnel(startDate?: Date, endDate?: Date): Promise<any> {
        const dateRange = {
            start: startDate || new Date(new Date().setDate(new Date().getDate() - 30)),
            end: endDate || new Date(),
        };

        const stages = [
            { name: 'Views', count: 0 },
            { name: 'Cart Added', count: 0 },
            { name: 'Checkout Started', count: 0 },
            { name: 'Orders Placed', count: 0 },
            { name: 'Payment Completed', count: 0 },
            { name: 'Delivered', count: 0 },
        ];

        // Get total views from crafts
        const views = await this.craftsRepository
            .createQueryBuilder('craft')
            .select('SUM(craft.views)', 'total')
            .getRawOne();
        stages[0].count = Number(views?.total || 0);

        // Get orders by status
        const orders = await this.ordersRepository
            .createQueryBuilder('order')
            .select('order.status', 'status')
            .addSelect('COUNT(order.id)', 'count')
            .where('order.createdAt BETWEEN :start AND :end', dateRange)
            .groupBy('order.status')
            .getRawMany();

        const statusMap = {
            [OrderStatus.PENDING]: 'Checkout Started',
            [OrderStatus.PROCESSING]: 'Orders Placed',
            [OrderStatus.SHIPPED]: 'Orders Placed',
            [OrderStatus.DELIVERED]: 'Delivered',
            [OrderStatus.CANCELLED]: 'Orders Placed',
        };

        orders.forEach(order => {
            const stageName = statusMap[order.status];
            if (stageName) {
                const stage = stages.find(s => s.name === stageName);
                if (stage) {
                    stage.count += Number(order.count);
                }
            }
        });

        // Calculate conversion rates
        const funnel = stages.map((stage, index) => {
            const previousCount = index > 0 ? stages[index - 1].count : stage.count;
            const conversionRate = previousCount > 0 ? (stage.count / previousCount) * 100 : 0;
            
            return {
                ...stage,
                conversionRate: Number(conversionRate.toFixed(2)),
                dropOff: index > 0 ? previousCount - stage.count : 0,
            };
        });

        return funnel;
    }

    async getConversionRates(startDate?: Date, endDate?: Date): Promise<any> {
        const dateRange = {
            start: startDate || new Date(new Date().setDate(new Date().getDate() - 30)),
            end: endDate || new Date(),
        };

        const visitors = 10000; // Placeholder - would come from analytics service
        const views = await this.craftsRepository
            .createQueryBuilder('craft')
            .select('SUM(craft.views)', 'total')
            .getRawOne();

        const orders = await this.ordersRepository.count({
            where: { createdAt: Between(dateRange.start, dateRange.end) },
        });

        const completedOrders = await this.ordersRepository.count({
            where: { 
                status: OrderStatus.DELIVERED,
                createdAt: Between(dateRange.start, dateRange.end),
            },
        });

        const totalViews = Number(views?.total || 0);

        return {
            viewToCart: totalViews > 0 ? (orders / totalViews) * 100 : 0,
            cartToCheckout: orders > 0 ? (orders / orders) * 100 : 0, // Simplified
            checkoutToPurchase: orders > 0 ? (completedOrders / orders) * 100 : 0,
            overall: visitors > 0 ? (completedOrders / visitors) * 100 : 0,
        };
    }

    private getRatingDistribution(reviews: Review[]): Record<number, number> {
        const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
        reviews.forEach(review => {
            distribution[review.rating] = (distribution[review.rating] || 0) + 1;
        });
        return distribution;
    }
}