/* eslint-disable @typescript-eslint/no-unsafe-call */
import {
    Controller,
    Get,
    Patch,
    Param,
    Delete,
    UseGuards,
    Body,
    ParseIntPipe,
} from '@nestjs/common';
import { OrderItemsService } from './order-items.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import {
    ApiTags,
    ApiOperation,
    ApiBearerAuth,
    ApiParam,
} from '@nestjs/swagger';
import { UpdateOrderItemDto } from './dto/update-order-item.dto';
import { UserRole } from 'src/enums/UserRole.enum';

@ApiTags('order-items')
@ApiBearerAuth()
@Controller('order-items')
@UseGuards(JwtAuthGuard, RolesGuard)
export class OrderItemsController {
    constructor(private readonly orderItemsService: OrderItemsService) { }

    @Get(':id')
    @Roles(UserRole.ADMIN)
    @ApiOperation({ summary: 'Get order item by ID (admin only)' })
    @ApiParam({ name: 'id', type: String })
    async findOne(@Param('id', ParseIntPipe) id: number) {
        return await this.orderItemsService.findOne(id);
    }

    @Patch(':id')
    @Roles(UserRole.ADMIN)
    @ApiOperation({ summary: 'Update order item (admin only)' })
    @ApiParam({ name: 'id', type: String })
    async update(
        @Param('id', ParseIntPipe) id: number,
        @Body() updateOrderItemDto: UpdateOrderItemDto,
    ) {
        return await this.orderItemsService.update(id, updateOrderItemDto);
    }

    @Delete(':id')
    @Roles(UserRole.ADMIN)
    @ApiOperation({ summary: 'Delete order item (admin only)' })
    @ApiParam({ name: 'id', type: String })
    async remove(@Param('id', ParseIntPipe) id: string) {
        await this.orderItemsService.remove(id);
        return { message: 'Order item deleted successfully' };
    }
}