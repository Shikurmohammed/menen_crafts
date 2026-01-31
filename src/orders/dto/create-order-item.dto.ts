import { Type } from 'class-transformer';
import { IsNumber, IsPositive, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateOrderItemDto {
    @IsNumber()
    @IsNotEmpty()
    craftId: number;

    @IsNumber()
    @IsPositive()
    quantity: number;

    @IsNumber()
    @IsOptional()
    unitPrice?: number;
}