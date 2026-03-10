import { IsBoolean, IsOptional, IsIn } from 'class-validator';

export class UpdateNotificationSettingsDto {
    @IsBoolean()
    @IsOptional()
    emailNotifications?: boolean;

    @IsBoolean()
    @IsOptional()
    pushNotifications?: boolean;

    @IsBoolean()
    @IsOptional()
    orderUpdates?: boolean;

    @IsBoolean()
    @IsOptional()
    newMessages?: boolean;

    @IsBoolean()
    @IsOptional()
    promotions?: boolean;

    @IsBoolean()
    @IsOptional()
    newsletter?: boolean;

    @IsBoolean()
    @IsOptional()
    reviewResponses?: boolean;

    @IsBoolean()
    @IsOptional()
    priceAlerts?: boolean;

    @IsBoolean()
    @IsOptional()
    weeklyDigest?: boolean;

    @IsBoolean()
    @IsOptional()
    soundEnabled?: boolean;

    @IsBoolean()
    @IsOptional()
    desktopNotifications?: boolean;

    @IsIn(['instant', 'daily', 'weekly'])
    @IsOptional()
    notificationFrequency?: 'instant' | 'daily' | 'weekly';
}