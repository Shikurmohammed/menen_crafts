import { IsBoolean, IsOptional, IsNumber, Min, Max } from 'class-validator';

export class UpdateSecuritySettingsDto {
    @IsBoolean()
    @IsOptional()
    twoFactorAuth?: boolean;

    @IsBoolean()
    @IsOptional()
    loginAlerts?: boolean;

    @IsBoolean()
    @IsOptional()
    saveLoginHistory?: boolean;

    @IsNumber()
    @Min(5)
    @Max(480)
    @IsOptional()
    sessionTimeout?: number;

    @IsBoolean()
    @IsOptional()
    requirePasswordOnPurchase?: boolean;

    @IsBoolean()
    @IsOptional()
    showOnlineStatus?: boolean;

    @IsBoolean()
    @IsOptional()
    publicProfile?: boolean;
}