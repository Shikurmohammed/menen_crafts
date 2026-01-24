import {
    Controller,
    Get,
    Post,
    Body,
    Patch,
    Param,
    Delete,
    Query,
    UseGuards,
    ParseUUIDPipe,
    ParseIntPipe,
    DefaultValuePipe,
} from '@nestjs/common';
import { OrdersService } from './orders.service';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { OrderStatus } from './order.entity';
import {
    ApiTags,
    ApiOperation,
    ApiResponse,
    ApiBearerAuth,
    ApiQuery,
    ApiParam,
} from '@nestjs/swagger';
import { UserRole } from 'src/enums/UserRole.enum';
import { User } from 'src/users/user.entity';
import { UpdateOrderItemDto } from './dto/update-order-item.dto';
import { CreateOrderItemDto } from './dto/create-order-item.dto';
import { CreateOrderDto } from './dto/create-order.dto';

@ApiTags('orders')
@ApiBearerAuth()
@Controller('orders')
@UseGuards(JwtAuthGuard, RolesGuard)
export class OrdersController {
    constructor(private readonly ordersService: OrdersService) { }

    @Post()
    @ApiOperation({ summary: 'Create a new order' })
    @ApiResponse({ status: 201, description: 'Order created successfully' })
    @ApiResponse({ status: 400, description: 'Invalid input or insufficient stock' })
    async create(
        @Body() createOrderDto: CreateOrderDto,
        @CurrentUser() user: User,
    ) {
        return await this.ordersService.create(createOrderDto, user);
    }

    @Get()
    @Roles(UserRole.ADMIN)
    @ApiOperation({ summary: 'Get all orders (admin only)' })
    @ApiQuery({ name: 'status', required: false, enum: OrderStatus })
    @ApiQuery({ name: 'page', required: false, type: Number })
    @ApiQuery({ name: 'limit', required: false, type: Number })
    async findAll(
        @Query('status') status?: OrderStatus,
        @Query('page', new DefaultValuePipe(1), ParseIntPipe) page?: number,
        @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit?: number,
    ) {
        return await this.ordersService.findAll(undefined, status, page, limit);
    }

    @Get('my-orders')
    @ApiOperation({ summary: 'Get current user orders' })
    @ApiQuery({ name: 'page', required: false, type: Number })
    @ApiQuery({ name: 'limit', required: false, type: Number })
    async getMyOrders(
        @CurrentUser() user: User,
        @Query('page', new DefaultValuePipe(1), ParseIntPipe) page?: number,
        @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit?: number,
    ) {
        return await this.ordersService.getUserOrders(user.id, page, limit);
    }

    @Get('statistics')
    @ApiOperation({ summary: 'Get order statistics' })
    async getStatistics(@CurrentUser() user: User) {
        // For regular users, only show their statistics
        // For admins, show global statistics
        const userId = user.role === UserRole.ADMIN ? undefined : user.id;
        return await this.ordersService.getOrderStatistics(userId);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get order by ID' })
    @ApiParam({ name: 'id', type: String })
    async findOne(
        @Param('id', ParseUUIDPipe) id: string,
        @CurrentUser() user: User,
    ) {
        // Regular users can only see their own orders
        const userId = user.role === UserRole.ADMIN ? undefined : user.id;
        return await this.ordersService.findOne(id, userId + "");
    }

    @Patch(':id')
    @ApiOperation({ summary: 'Update order' })
    @ApiParam({ name: 'id', type: String })
    async update(
        @Param('id', ParseIntPipe) id: number,
        @Body() updateOrderDto: UpdateOrderItemDto,
        @CurrentUser() user: User,
    ) {
        // Regular users can only update their own orders
        const userId = user.role === UserRole.ADMIN ? undefined : user.id;
        return await this.ordersService.update(id, updateOrderDto, userId);
    }

    @Patch(':id/status')
    @Roles(UserRole.ADMIN)
    @ApiOperation({ summary: 'Update order status (admin only)' })
    @ApiParam({ name: 'id', type: String })
    async updateStatus(
        @Param('id', ParseUUIDPipe) id: number,
        @Body('status') status: OrderStatus,
    ) {
        return await this.ordersService.updateStatus(id, status);
    }

    @Patch(':id/tracking')
    @Roles(UserRole.ADMIN)
    @ApiOperation({ summary: 'Add tracking number to order (admin only)' })
    @ApiParam({ name: 'id', type: String })
    async addTrackingNumber(
        @Param('id', ParseIntPipe) id: string,
        @Body('trackingNumber') trackingNumber: string,
    ) {
        return await this.ordersService.addTrackingNumber(id, trackingNumber);
    }

    @Delete(':id')
    @ApiOperation({ summary: 'Delete order' })
    @ApiParam({ name: 'id', type: String })
    async remove(
        @Param('id', ParseIntPipe) id: number,
        @CurrentUser() user: User,
    ) {
        // Regular users can only delete their own orders
        const userId = user.role === UserRole.ADMIN ? undefined : user.id;
        await this.ordersService.remove(id, userId);
        return { message: 'Order deleted successfully' };
    }
}