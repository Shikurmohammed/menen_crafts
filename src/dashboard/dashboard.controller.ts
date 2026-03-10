import {
    Controller,
    Get,
    Param,
    Query,
    ParseIntPipe,
    UseGuards,
    DefaultValuePipe,
} from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../enums/UserRole.enum';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../users/user.entity';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';

@ApiTags('dashboard')
@ApiBearerAuth()
@Controller('dashboard')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DashboardController {
    constructor(private readonly dashboardService: DashboardService) {}

    @Get('admin/stats')
    @Roles(UserRole.ADMIN)
    @ApiOperation({ summary: 'Get admin dashboard statistics' })
    async getAdminStats() {
        return this.dashboardService.getAdminStats();
    }

    @Get('artisan/:id/stats')
    @Roles(UserRole.ADMIN, UserRole.ARTISAN)
    @ApiOperation({ summary: 'Get artisan dashboard statistics' })
    async getArtisanStats(@Param('id', ParseIntPipe) id: number) {
        return this.dashboardService.getArtisanStats(id);
    }

    @Get('artisan/my-stats')
    @Roles(UserRole.ARTISAN)
    @ApiOperation({ summary: 'Get current artisan statistics' })
    async getMyArtisanStats(@CurrentUser() user: User) {
        return this.dashboardService.getArtisanStats(user.id);
    }

    @Get('customer/:id/stats')
    @Roles(UserRole.ADMIN, UserRole.CUSTOMER)
    @ApiOperation({ summary: 'Get customer dashboard statistics' })
    async getCustomerStats(@Param('id', ParseIntPipe) id: number) {
        return this.dashboardService.getCustomerStats(id);
    }

    @Get('customer/my-stats')
    @Roles(UserRole.CUSTOMER)
    @ApiOperation({ summary: 'Get current customer statistics' })
    async getMyCustomerStats(@CurrentUser() user: User) {
        return this.dashboardService.getCustomerStats(user.id);
    }

    @Get('user-activity')
    @Roles(UserRole.ADMIN)
    @ApiOperation({ summary: 'Get user activity feed (admin only)' })
    @ApiQuery({ name: 'limit', required: false, type: Number })
    async getUserActivity(
        @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    ) {
        return this.dashboardService.getUserActivity(limit);
    }

    @Get('recent-orders')
    @Roles(UserRole.ADMIN)
    @ApiOperation({ summary: 'Get recent orders (admin only)' })
    @ApiQuery({ name: 'limit', required: false, type: Number })
    async getRecentOrders(
        @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    ) {
        const stats = await this.dashboardService.getAdminStats();
        return stats.recentOrders;
    }

    @Get('popular-crafts')
    @Roles(UserRole.ADMIN)
    @ApiOperation({ summary: 'Get popular crafts (admin only)' })
    @ApiQuery({ name: 'limit', required: false, type: Number })
    async getPopularCrafts(
        @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    ) {
        const stats = await this.dashboardService.getAdminStats();
        return stats.popularCrafts;
    }

    @Get('top-artisans')
    @Roles(UserRole.ADMIN)
    @ApiOperation({ summary: 'Get top artisans (admin only)' })
    @ApiQuery({ name: 'limit', required: false, type: Number })
    async getTopArtisans(
        @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    ) {
        const stats = await this.dashboardService.getAdminStats();
        return stats.topArtisans;
    }
}