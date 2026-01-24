/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */

import { Injectable, NotFoundException, BadRequestException, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order, OrderStatus } from './order.entity';
import { OrderItemsService } from './order-items.service';
import { User } from '../users/user.entity';
import { CraftsService } from '../crafts/crafts.service';
import { CreateOrderItemDto } from './dto/create-order-item.dto';
import { UpdateOrderItemDto } from './dto/update-order-item.dto';
import { CreateOrderDto } from './dto/create-order.dto';

@Injectable()
export class OrdersService {
    constructor(
        @InjectRepository(Order)
        private ordersRepository: Repository<Order>,
        private orderItemsService: OrderItemsService,
        @Inject(forwardRef(() => CraftsService))
        private craftsService: CraftsService,
    ) { }

    async create(createOrderDto: CreateOrderDto, currentUser: User): Promise<Order> {
        // 1. Validate stock first
        const isStockAvailable = await this.orderItemsService.validateStockAvailability(createOrderDto.items);
        if (!isStockAvailable) {
            throw new BadRequestException('Some items are out of stock');
        }

        // 2. Create items (instantiated from DTO)
        const orderItems = await this.orderItemsService.createMultiple(createOrderDto.items);

        // 3. Logic for Manual vs. Automatic values
        // Use totalAmount from DTO if provided, otherwise use calculated total
        const finalTotal = createOrderDto.totalAmount ??
            await this.orderItemsService.calculateOrderTotal(orderItems);

        // Use userId from DTO if provided, otherwise use the logged-in user's ID
        const finalUserId = createOrderDto.userId?.toString() ?? currentUser.id.toString();

        // 4. Create and Save Order
        const order = this.ordersRepository.create({
            // If you provided a manual userId, we link it via ID string. 
            // If not, we use the 'user' object from the JWT.
            user: createOrderDto.userId ? undefined : currentUser,
            userId: finalUserId,
            items: orderItems,
            totalAmount: finalTotal,
            status: createOrderDto.status || OrderStatus.PENDING, // Use DTO status if provided
            shippingAddress: createOrderDto.shippingAddress,
            billingAddress: createOrderDto.billingAddress || createOrderDto.shippingAddress,
            notes: createOrderDto.notes,
        });

        const savedOrder = await this.ordersRepository.save(order);

        // 5. Reserve stock
        await this.orderItemsService.reserveStock(orderItems);

        return savedOrder;
    }
    async findAll(
        userId?: string,
        status?: OrderStatus,
        page = 1,
        limit = 10,
    ): Promise<{ orders: Order[]; total: number }> {
        const skip = (page - 1) * limit;
        const where: any = {};

        if (userId) {
            where.userId = userId;
        }

        if (status) {
            where.status = status;
        }

        const [orders, total] = await this.ordersRepository.findAndCount({
            where,
            relations: ['user', 'items', 'items.craft'],
            order: { createdAt: 'DESC' },
            skip,
            take: limit,
        });

        return { orders, total };
    }

    async findOne(id: string, userId?: string): Promise<Order> {
        const where: any = { id };

        if (userId) {
            where.userId = userId;
        }

        const order = await this.ordersRepository.findOne({
            where,
            relations: ['user', 'items', 'items.craft', 'items.craft.artisan'],
        });

        if (!order) {
            throw new NotFoundException('Order not found');
        }

        return order;
    }

    async update(id: number, updateOrderDto: UpdateOrderItemDto, userId?: number): Promise<Order> {
        const order = await this.findOne(id + "", userId + "");

        // If status is being updated to CANCELLED, release stock
        if (updateOrderDto.status === OrderStatus.CANCELLED && order.status !== OrderStatus.CANCELLED) {
            await this.orderItemsService.releaseStock(order.items);

            if (updateOrderDto.status === OrderStatus.CANCELLED) {
                order.completedAt = new Date();
            }
        }

        // If status is being updated to DELIVERED, mark as completed
        if (updateOrderDto.status === OrderStatus.DELIVERED && order.status !== OrderStatus.DELIVERED) {
            order.completedAt = new Date();
        }

        Object.assign(order, updateOrderDto);

        return await this.ordersRepository.save(order);
    }

    async remove(id: number, userId?: number): Promise<void> {
        const order = await this.findOne(id + "", userId + "");

        // Only allow deletion if order is pending or cancelled
        if (![OrderStatus.PENDING, OrderStatus.CANCELLED].includes(order.status)) {
            throw new BadRequestException('Cannot delete order with current status');
        }

        // Release stock if order was pending
        if (order.status === OrderStatus.PENDING) {
            await this.orderItemsService.releaseStock(order.items);
        }

        const result = await this.ordersRepository.delete(id);

        if (result.affected === 0) {
            throw new NotFoundException('Order not found');
        }
    }

    async getUserOrders(userId: number, page = 1, limit = 10): Promise<{ orders: Order[]; total: number }> {
        return this.findAll(userId + '', undefined, page, limit);
    }

    async updateStatus(id: number, status: OrderStatus, userId?: number): Promise<Order> {
        return this.update(id, { status }, userId);
    }

    async addTrackingNumber(id: string, trackingNumber: string, userId?: string): Promise<Order> {
        const order = await this.findOne(id, userId);

        if (order.status !== OrderStatus.SHIPPED && order.status !== OrderStatus.DELIVERED) {
            throw new BadRequestException('Tracking number can only be added to shipped orders');
        }

        order.trackingNumber = trackingNumber;
        return await this.ordersRepository.save(order);
    }

    async getOrderStatistics(userId?: number): Promise<{
        totalOrders: number;
        totalRevenue: number;
        pendingOrders: number;
        deliveredOrders: number;
        averageOrderValue: number;
    }> {
        const queryBuilder = this.ordersRepository.createQueryBuilder('order');

        if (userId) {
            queryBuilder.where('order.userId = :userId', { userId });
        }

        const totalOrders = await queryBuilder.getCount();
        const totalRevenueResult = await queryBuilder
            .select('SUM(order.totalAmount)', 'total')
            .getRawOne();
        const totalRevenue = parseFloat(totalRevenueResult?.total || 0);

        const pendingOrders = await queryBuilder
            .where(userId ? 'order.userId = :userId' : '1=1', { userId })
            .andWhere('order.status = :status', { status: OrderStatus.PENDING })
            .getCount();

        const deliveredOrders = await queryBuilder
            .where(userId ? 'order.userId = :userId' : '1=1', { userId })
            .andWhere('order.status = :status', { status: OrderStatus.DELIVERED })
            .getCount();

        const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

        return {
            totalOrders,
            totalRevenue,
            pendingOrders,
            deliveredOrders,
            averageOrderValue,
        };
    }
}