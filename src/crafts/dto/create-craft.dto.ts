import { IsArray, IsBoolean, IsNotEmpty, IsNumber, IsOptional, IsPositive, IsString } from 'class-validator';

export class CreateCraftDto {
    @IsString()
    @IsNotEmpty()
    title: string;

    @IsString()
    @IsNotEmpty()
    description: string;

    @IsNumber()
    @IsPositive()
    price: number;

    @IsNumber()
    @IsPositive()
    stock: number;

    @IsBoolean()
    @IsOptional()
    isAvailable?: boolean;

    @IsArray()
    @IsOptional()
    @IsNumber({}, { each: true })
    categoryIds?: number[];

    @IsArray()
    @IsString({ each: true })
    images: string[];

    @IsOptional()
    specifications?: Record<string, string | number | boolean>;
}