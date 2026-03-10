import {
    Controller,
    Get,
    Param,
    Query,
    ParseIntPipe,
    UseGuards,
} from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../enums/UserRole.enum';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';

@ApiTags('analytics')
@ApiBearerAuth()
@Controller('analytics')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AnalyticsController {
    constructor(private readonly analyticsService: AnalyticsService) {}

    @Get('website')
    @Roles(UserRole.ADMIN)
    @ApiOperation({ summary: 'Get website analytics (admin only)' })
    @ApiQuery({ name: 'startDate', required: false, type: Date })
    @ApiQuery({ name: 'endDate', required: false, type: Date })
    async getWebsiteAnalytics(
        @Query('startDate') startDate?: Date,
        @Query('endDate') endDate?: Date,
    ) {
        return this.analyticsService.getWebsiteAnalytics(startDate, endDate);
    }

    @Get('craft/:id')
    @Roles(UserRole.ADMIN, UserRole.ARTISAN)
    @ApiOperation({ summary: 'Get craft analytics' })
    async getCraftAnalytics(
        @Param('id', ParseIntPipe) id: number,
        @Query('startDate') startDate?: Date,
        @Query('endDate') endDate?: Date,
    ) {
        return this.analyticsService.getCraftAnalytics(id, startDate, endDate);
    }

    @Get('users')
    @Roles(UserRole.ADMIN)
    @ApiOperation({ summary: 'Get user analytics (admin only)' })
    async getUserAnalytics(
        @Query('startDate') startDate?: Date,
        @Query('endDate') endDate?: Date,
    ) {
        return this.analyticsService.getUserAnalytics(startDate, endDate);
    }

    @Get('sales-funnel')
    @Roles(UserRole.ADMIN)
    @ApiOperation({ summary: 'Get sales funnel data (admin only)' })
    async getSalesFunnel(
        @Query('startDate') startDate?: Date,
        @Query('endDate') endDate?: Date,
    ) {
        return this.analyticsService.getSalesFunnel(startDate, endDate);
    }

    @Get('conversion-rates')
    @Roles(UserRole.ADMIN)
    @ApiOperation({ summary: 'Get conversion rates (admin only)' })
    async getConversionRates(
        @Query('startDate') startDate?: Date,
        @Query('endDate') endDate?: Date,
    ) {
        return this.analyticsService.getConversionRates(startDate, endDate);
    }
}