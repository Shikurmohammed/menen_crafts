import { PartialType } from '@nestjs/swagger';
import { CreateOrderItemDto } from './create-order-item.dto';
import { OrderStatus } from 'src/enums/OrderStatus';

export class UpdateOrderItemDto extends PartialType(CreateOrderItemDto) {
    status:OrderStatus;
}
