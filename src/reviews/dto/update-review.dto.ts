import { PartialType } from '@nestjs/swagger';
import { CreateReviewDto } from './create-review.dto';
import { IsString, IsOptional, IsIn } from 'class-validator';

export class UpdateReviewDto extends PartialType(CreateReviewDto) {
    @IsString()
    @IsOptional()
    @IsIn(['PENDING', 'APPROVED', 'REJECTED'])
    status?: string;

    @IsString()
    @IsOptional()
    sellerResponse?: string;
}
//export class UpdateReviewDto extends PartialType(CreateReviewDto) { }