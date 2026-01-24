import { IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

export class CreateReviewDto {
    @IsNumber()
    @IsNotEmpty()
    craftId: number;

    @IsInt()
    @Min(1)
    @Max(5)
    rating: number;

    @IsString()
    @IsOptional()
    comment?: string;
}