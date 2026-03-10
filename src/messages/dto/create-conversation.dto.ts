import { Type } from 'class-transformer';
import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateConversationDto {
    @Type(() => Number)
    @IsNumber()
    @IsNotEmpty()
    recipientId: number;

    @Type(() => Number)
    @IsNumber()
    @IsOptional()
    craftId?: number;

    @IsString()
    @IsOptional()
    subject?: string;

    @IsString()
    @IsNotEmpty()
    initialMessage: string;
}