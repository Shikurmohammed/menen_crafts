import { Injectable, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/user.entity';
import { Craft } from '../crafts/craft.entity';
import { Order } from '../orders/order.entity';
import { Review } from '../reviews/review.entity';
import { UserRole } from '../enums/UserRole.enum';
import { OrderStatus } from '../enums/OrderStatus';

@Injectable()
export class DashboardService {
    constructor(
        @InjectRepository(User)
        private usersRepository: Repository<User>,
        @InjectRepository(Craft)
        private craftsRepository: Repository<Craft>,
        @InjectRepository(Order)
        private ordersRepository: Repository<Order>,
        @InjectRepository(Review)
        private reviewsRepository: Repository<Review>,
    ) {}

    async getAdminStats(): Promise<any> {
        const [
            totalUsers,
            totalArtisans,
            totalCustomers,
            totalCrafts,
            totalOrders,
            pendingOrders,
            totalRevenue,
            recentOrders,
            popularCrafts,
            topArtisans,
        ] = await Promise.all([
            this.usersRepository.count(),
            this.usersRepository.count({ where: { role: UserRole.ARTISAN } }),
            this.usersRepository.count({ where: { role: UserRole.CUSTOMER } }),
            this.craftsRepository.count(),
            this.ordersRepository.count(),
            this.ordersRepository.count({ where: { status: OrderStatus.PENDING } }),
            this.ordersRepository
                .createQueryBuilder('order')
                .select('SUM(order.totalAmount)', 'total')
                .where('order.status = :status', { status: OrderStatus.DELIVERED })
                .getRawOne(),
            this.ordersRepository.find({
                relations: ['user', 'items', 'items.craft'],
                order: { createdAt: 'DESC' },
                take: 5,
            }),
            this.craftsRepository.find({
                relations: ['artisan'],
                order: { views: 'DESC' },
                take: 5,
            }),
            this.usersRepository
                .createQueryBuilder('user')
                .leftJoinAndSelect('user.crafts', 'crafts')
                .leftJoinAndSelect('crafts.reviews', 'reviews')
                .where('user.role = :role', { role: UserRole.ARTISAN })
                .orderBy('crafts.views', 'DESC')
                .addOrderBy('crafts.averageRating', 'DESC')
                .take(5)
                .getMany(),
        ]);

        return {
            overview: {
                totalUsers,
                totalArtisans,
                totalCustomers,
                totalCrafts,
                totalOrders,
                pendingOrders,
                totalRevenue: Number(totalRevenue?.total || 0),
            },
            recentOrders: recentOrders.map(order => ({
                id: order.id,
                orderNumber: order.orderNumber,
                customer: `${order.user?.firstName} ${order.user?.lastName}`,
                total: order.totalAmount,
                status: order.status,
                createdAt: order.createdAt,
                itemsCount: order.items?.length || 0,
            })),
            popularCrafts: popularCrafts.map(craft => ({
                id: craft.id,
                title: craft.title,
                artisan: `${craft.artisan?.firstName} ${craft.artisan?.lastName}`,
                views: craft.views,
                averageRating: craft.averageRating,
                image: craft.images?.[0],
            })),
            topArtisans: topArtisans.map(artisan => ({
                id: artisan.id,
                name: `${artisan.firstName} ${artisan.lastName}`,
                avatar: artisan.avatar,
                craftsCount: artisan.crafts?.length || 0,
                totalViews: artisan.crafts?.reduce((sum, c) => sum + (c.views || 0), 0) || 0,
                avgRating: artisan.crafts?.reduce((sum, c) => sum + (c.averageRating || 0), 0) / (artisan.crafts?.length || 1) || 0,
            })),
        };
    }

    async getArtisanStats(artisanId: number): Promise<any> {
        // Verify user is an artisan
        const artisan = await this.usersRepository.findOne({
            where: { id: artisanId, role: UserRole.ARTISAN },
        });

        if (!artisan) {
            throw new ForbiddenException('User is not an artisan');
        }

        const crafts = await this.craftsRepository.find({
            where: { artisan: { id: artisanId } },
            relations: ['reviews', 'orderItems'],
        });

        const orders = await this.ordersRepository
            .createQueryBuilder('order')
            .leftJoin('order.items', 'items')
            .leftJoin('items.craft', 'craft')
            .where('craft.artisanId = :artisanId', { artisanId })
            .getMany();

        const reviews = await this.reviewsRepository
            .createQueryBuilder('review')
            .leftJoin('review.craft', 'craft')
            .where('craft.artisanId = :artisanId', { artisanId })
            .getMany();

        const totalCrafts = crafts.length;
        const totalViews = crafts.reduce((sum, c) => sum + (c.views || 0), 0);
        const totalSales = crafts.reduce((sum, c) => sum + (c.orderItems?.length || 0), 0);
        const totalRevenue = orders.reduce((sum, o) => sum + o.totalAmount, 0);
        const avgRating = crafts.reduce((sum, c) => sum + (c.averageRating || 0), 0) / (totalCrafts || 1);

        const pendingOrders = orders.filter(o => o.status === OrderStatus.PENDING).length;
        const completedOrders = orders.filter(o => o.status === OrderStatus.DELIVERED).length;

        // Recent activity
        const recentOrders = orders
            .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
            .slice(0, 5)
            .map(order => ({
                id: order.id,
                orderNumber: order.orderNumber,
                total: order.totalAmount,
                status: order.status,
                createdAt: order.createdAt,
            }));

        const recentReviews = reviews
            .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
            .slice(0, 5)
            .map(review => ({
                id: review.id,
                rating: review.rating,
                comment: review.comment,
                craft: review.craft?.title,
                createdAt: review.createdAt,
            }));

        // Craft performance
        const craftPerformance = crafts.map(craft => ({
            id: craft.id,
            title: craft.title,
            price: craft.price,
            views: craft.views,
            sales: craft.orderItems?.length || 0,
            rating: craft.averageRating,
            revenue: craft.orderItems?.reduce((sum, oi) => sum + oi.subtotal, 0) || 0,
        }));

        return {
            overview: {
                totalCrafts,
                totalViews,
                totalSales,
                totalRevenue,
                avgRating: Number(avgRating.toFixed(1)),
                pendingOrders,
                completedOrders,
                conversionRate: totalViews > 0 ? (totalSales / totalViews) * 100 : 0,
            },
            recentOrders,
            recentReviews,
            craftPerformance,
        };
    }

    async getCustomerStats(customerId: number): Promise<any> {
        const orders = await this.ordersRepository.find({
            where: { user: { id: customerId } },
            relations: ['items', 'items.craft'],
            order: { createdAt: 'DESC' },
        });

        const reviews = await this.reviewsRepository.find({
            where: { user: { id: customerId } },
            relations: ['craft'],
            order: { createdAt: 'DESC' },
        });

        const totalOrders = orders.length;
        const totalSpent = orders.reduce((sum, o) => sum + o.totalAmount, 0);
        const averageOrderValue = totalOrders > 0 ? totalSpent / totalOrders : 0;

        const ordersByStatus = {
            pending: orders.filter(o => o.status === OrderStatus.PENDING).length,
            processing: orders.filter(o => o.status === OrderStatus.PROCESSING).length,
            shipped: orders.filter(o => o.status === OrderStatus.SHIPPED).length,
            delivered: orders.filter(o => o.status === OrderStatus.DELIVERED).length,
            cancelled: orders.filter(o => o.status === OrderStatus.CANCELLED).length,
        };

        const recentOrders = orders.slice(0, 5).map(order => ({
            id: order.id,
            orderNumber: order.orderNumber,
            total: order.totalAmount,
            status: order.status,
            itemsCount: order.items?.length || 0,
            createdAt: order.createdAt,
        }));

        const recentReviews = reviews.slice(0, 5).map(review => ({
            id: review.id,
            rating: review.rating,
            comment: review.comment,
            craft: review.craft?.title,
            createdAt: review.createdAt,
        }));

        // Wishlist items (would need a Wishlist entity)
        const wishlistItems: any[] = [];

        return {
            overview: {
                totalOrders,
                totalSpent,
                averageOrderValue,
                ordersByStatus,
                totalReviews: reviews.length,
                wishlistCount: 0,
            },
            recentOrders,
            recentReviews,
            wishlistItems,
        };
    }

    async getUserActivity(limit = 20): Promise<any[]> {
        // This would require an ActivityLog entity
        // For now, return a combination of recent orders, reviews, etc.
        const recentOrders = await this.ordersRepository.find({
            relations: ['user'],
            order: { createdAt: 'DESC' },
            take: limit / 2,
        });

        const recentReviews = await this.reviewsRepository.find({
            relations: ['user', 'craft'],
            order: { createdAt: 'DESC' },
            take: limit / 2,
        });

        const activities = [
            ...recentOrders.map(order => ({
                id: `order-${order.id}`,
                type: 'order',
                user: `${order.user?.firstName} ${order.user?.lastName}`,
                action: 'placed an order',
                target: `#${order.orderNumber}`,
                amount: order.totalAmount,
                time: order.createdAt,
                status: order.status,
            })),
            ...recentReviews.map(review => ({
                id: `review-${review.id}`,
                type: 'review',
                user: `${review.user?.firstName} ${review.user?.lastName}`,
                action: 'reviewed',
                target: review.craft?.title,
                rating: review.rating,
                time: review.createdAt,
            })),
        ];

        return activities
            .sort((a, b) => b.time.getTime() - a.time.getTime())
            .slice(0, limit);
    }
}