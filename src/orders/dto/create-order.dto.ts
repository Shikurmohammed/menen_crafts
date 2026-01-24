import { IsString, IsNotEmpty, IsArray, ValidateNested, IsOptional, IsEnum, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';
import { CreateOrderItemDto } from './create-order-item.dto';
import { OrderStatus } from '../order.entity';

export class CreateOrderDto {
    @IsArray()
    @IsNotEmpty()
    @ValidateNested({ each: true })
    @Type(() => CreateOrderItemDto) // Crucial for nested validation
    items: CreateOrderItemDto[];

    @IsString()
    @IsNotEmpty()
    shippingAddress: string;

    @IsString()
    @IsNotEmpty()
    billingAddress: string;

    @IsString()
    @IsOptional()
    notes?: string;


    @IsOptional()
    @IsNumber()
    userId?: number; // Allows manual user assignment

    @IsOptional()
    @IsNumber()
    totalAmount?: number; // Allows manual price override

    @IsOptional()
    @IsEnum(OrderStatus)
    status?: OrderStatus; // Allows setting status (e.g., 'shipped') immediately

}