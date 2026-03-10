import { IsBoolean, IsOptional, IsIn, IsString } from 'class-validator';

export class UpdateAppearanceSettingsDto {
    @IsIn(['light', 'dark', 'system'])
    @IsOptional()
    theme?: 'light' | 'dark' | 'system';

    @IsBoolean()
    @IsOptional()
    compactMode?: boolean;

    @IsIn(['small', 'medium', 'large'])
    @IsOptional()
    fontSize?: 'small' | 'medium' | 'large';

    @IsBoolean()
    @IsOptional()
    animations?: boolean;

    @IsBoolean()
    @IsOptional()
    reducedMotion?: boolean;

    @IsBoolean()
    @IsOptional()
    highContrast?: boolean;

    @IsString()
    @IsOptional()
    colorScheme?: string;
}