import { IsString, IsNotEmpty, IsNumber, IsPositive, IsBoolean, IsOptional, IsArray } from 'class-validator';
import { Transform, Type } from 'class-transformer';

export class CreateCraftDto {
    @IsString()
    @IsNotEmpty()
    title: string;

    @IsString()
    @IsNotEmpty()
    description: string;

    @IsNumber()
    @IsPositive()
    @Type(() => Number)
    price: number;

    @IsNumber()
    @IsPositive()
    @Type(() => Number)
    stock: number;

    @IsBoolean()
    @IsOptional()
    @Type(() => Boolean)
    isAvailable?: boolean;

    // @IsArray()
    // @IsOptional()
    // @IsNumber({}, { each: true })
    // @Type(() => Number)  
    // categoryIds?: number[];

    @IsArray()
    @IsNumber({}, { each: true })
    @IsOptional()
    @Transform(({ value }) => {
        // Handle comma-separated string
        if (typeof value === 'string') {
            return value.split(',').map(id => parseInt(id, 10)).filter(id => !isNaN(id));
        }
        // Handle array
        if (Array.isArray(value)) {
            return value.map(id => parseInt(id, 10)).filter(id => !isNaN(id));
        }
        // Handle single number
        if (typeof value === 'number') {
            return [value];
        }
        return [];
    })
    categoryIds?: number[];

    @IsArray()
    @IsString({ each: true })
    @IsOptional()
    images?: string[];

    @IsOptional()
    specifications?: Record<string, string | number | boolean>;

       @IsString()
    @IsOptional()
    region?: string;

    @IsString()
    @IsOptional()
    culturalSignificance?: string;

    @IsString()
    @IsOptional()
    estimatedDelivery?: string;

    @IsBoolean()
    @IsOptional()
    isTraditional?: boolean;

    @IsString()
    @IsOptional()
    materialSource?: string;

    @IsString()
    @IsOptional()
    craftType?: string;

    @IsBoolean()
    @IsOptional()
    freeDelivery?: boolean;
}