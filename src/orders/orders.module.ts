import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CraftsModule } from 'src/crafts/crafts.module';
import { UsersModule } from 'src/users/users.module';
import { OrderItemsController } from './order-items.controller';
import { OrdersController } from './orders.controller';
import { Order } from './order.entity';
import { OrderItem } from './order-item.entity';
import { OrdersService } from './orders.service';
import { OrderItemsService } from './order-items.service';
import { Craft } from 'src/crafts/craft.entity';

@Module({
    imports: [
        TypeOrmModule.forFeature([Order, OrderItem, Craft]),
        forwardRef(() => CraftsModule),
        forwardRef(() => UsersModule),
    ],
    controllers: [OrdersController, OrderItemsController],
    providers: [OrdersService, OrderItemsService],
    exports: [OrdersService, OrderItemsService],
})
export class OrdersModule { }
