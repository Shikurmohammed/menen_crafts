/* eslint-disable @typescript-eslint/require-await */
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OrderItem } from './order-item.entity';
import { Craft } from '../crafts/craft.entity';
import { CreateOrderItemDto } from './dto/create-order-item.dto';
import { UpdateOrderItemDto } from './dto/update-order-item.dto';

@Injectable()
export class OrderItemsService {
    constructor(
        @InjectRepository(OrderItem)
        private orderItemRepository: Repository<OrderItem>,
        @InjectRepository(Craft)
        private craftRepository: Repository<Craft>,
    ) { }

    async create(createOrderItemDto: CreateOrderItemDto): Promise<OrderItem> {
        // Find the craft
        const craft = await this.craftRepository.findOne({
            where: { id: Number(createOrderItemDto.craftId), isAvailable: true }
        });

        if (!craft) {
            throw new NotFoundException('Craft not found or not available');
        }

        // Check stock availability
        if (craft.stock < createOrderItemDto.quantity) {
            throw new BadRequestException(`Insufficient stock. Available: ${craft.stock}`);
        }

        // Use provided unitPrice or craft price
        const unitPrice = createOrderItemDto.unitPrice || craft.price;
        const subtotal = unitPrice * createOrderItemDto.quantity;

        const orderItem = this.orderItemRepository.create({
            craft,
            craftId: craft.id,
            quantity: createOrderItemDto.quantity,
            unitPrice,
            subtotal,
        });

        return await this.orderItemRepository.save(orderItem);
    }

    async createMultiple(items: CreateOrderItemDto[]): Promise<OrderItem[]> {
        const orderItems: OrderItem[] = [];

        for (const itemDto of items) {
            const craft = await this.craftRepository.findOne({ where: { id: itemDto.craftId } });
            if (!craft) throw new NotFoundException(`Craft ${itemDto.craftId} not found`);

            // Just create the instance, don't .save()
            const orderItem = this.orderItemRepository.create({
                craft,
                craftId: craft.id,
                quantity: itemDto.quantity,
                unitPrice: itemDto.unitPrice || craft.price,
                subtotal: (itemDto.unitPrice || craft.price) * itemDto.quantity,
            });
            orderItems.push(orderItem);
        }
        return orderItems;
    }

    async findOne(id: number): Promise<OrderItem> {
        const orderItem = await this.orderItemRepository.findOne({
            where: { id },
            relations: ['craft', 'order'],
        });

        if (!orderItem) {
            throw new NotFoundException('Order item not found');
        }

        return orderItem;
    }

    async update(id: number, updateOrderItemDto: UpdateOrderItemDto): Promise<OrderItem> {
        const orderItem = await this.findOne(id);

        if (updateOrderItemDto.quantity !== undefined) {
            // Check if craft still available
            const craft = await this.craftRepository.findOne({
                where: { id: orderItem.craftId, isAvailable: true }
            });

            if (!craft) {
                throw new BadRequestException('Craft is no longer available');
            }

            if (craft.stock < updateOrderItemDto.quantity) {
                throw new BadRequestException(`Insufficient stock. Available: ${craft.stock}`);
            }

            orderItem.quantity = updateOrderItemDto.quantity;
            orderItem.subtotal = orderItem.unitPrice * updateOrderItemDto.quantity;
        }

        return await this.orderItemRepository.save(orderItem);
    }

    async remove(id: string): Promise<void> {
        const result = await this.orderItemRepository.delete(id);

        if (result.affected === 0) {
            throw new NotFoundException('Order item not found');
        }
    }

    async calculateOrderTotal(items: OrderItem[]): Promise<number> {
        if (!items || items.length === 0) {
            return 0;
        }

        const result = items.reduce((total, item) => total + item.subtotal, 0);
        return result;
    }

    async validateStockAvailability(items: CreateOrderItemDto[]): Promise<boolean> {
        for (const item of items) {
            const craft = await this.craftRepository.findOne({
                where: { id: Number(item.craftId), isAvailable: true }
            });

            if (!craft || craft.stock < item.quantity) {
                return false;
            }
        }
        return true;
    }

    async reserveStock(items: OrderItem[]): Promise<void> {
        for (const item of items) {
            const craft = await this.craftRepository.findOne({
                where: { id: item.craftId }
            });

            if (craft) {
                craft.stock -= item.quantity;
                if (craft.stock < 0) craft.stock = 0;
                await this.craftRepository.save(craft);
            }
        }
    }

    async releaseStock(items: OrderItem[]): Promise<void> {
        for (const item of items) {
            const craft = await this.craftRepository.findOne({
                where: { id: item.craftId }
            });

            if (craft) {
                craft.stock += item.quantity;
                await this.craftRepository.save(craft);
            }
        }
    }
}