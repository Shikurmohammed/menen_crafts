import { IsString, IsOptional, IsIn } from 'class-validator';

export class UpdatePreferencesDto {
    @IsString()
    @IsOptional()
    currency?: string;

    @IsString()
    @IsOptional()
    timezone?: string;

    @IsString()
    @IsOptional()
    dateFormat?: string;

    @IsIn(['metric', 'imperial'])
    @IsOptional()
    measurementSystem?: 'metric' | 'imperial';

    @IsString()
    @IsOptional()
    language?: string;
}