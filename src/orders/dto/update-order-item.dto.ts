import { PartialType } from '@nestjs/swagger';
import { CreateOrderItemDto } from './create-order-item.dto';

export class UpdateOrderItemDto extends PartialType(CreateOrderItemDto) {
    status: import("d:/Projects/NestJs/menen_crafts/src/orders/order.entity").OrderStatus;
}
