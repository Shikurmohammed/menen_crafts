import {
    Controller,
    Get,
    Post,
    Delete,
    Query,
    Body,
    UseGuards,
} from '@nestjs/common';
import { SearchService } from './search.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../users/user.entity';
import { ApiTags, ApiOperation, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('search')
@Controller('search')
export class SearchController {
    constructor(private readonly searchService: SearchService) {}

    @Get()
    @ApiOperation({ summary: 'Global search across crafts, artisans, and categories' })
    @ApiQuery({ name: 'q', required: true, type: String })
    @ApiQuery({ name: 'limit', required: false, type: Number })
    async globalSearch(
        @Query('q') query: string,
        @Query('limit') limit?: number,
    ) {
        return this.searchService.globalSearch(query, limit);
    }

    @Get('autocomplete')
    @ApiOperation({ summary: 'Autocomplete suggestions' })
    @ApiQuery({ name: 'q', required: true, type: String })
    @ApiQuery({ name: 'limit', required: false, type: Number })
    async autocomplete(
        @Query('q') query: string,
        @Query('limit') limit?: number,
    ) {
        return this.searchService.autocomplete(query, limit);
    }

    @Post('advanced')
    @ApiOperation({ summary: 'Advanced search with filters' })
    async advancedSearch(@Body() criteria: any) {
        return this.searchService.advancedSearch(criteria);
    }

    @Get('history')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Get user search history' })
    async getSearchHistory(@CurrentUser() user: User) {
        return this.searchService.getSearchHistory(user.id);
    }

    @Delete('history')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Clear user search history' })
    async clearSearchHistory(@CurrentUser() user: User) {
        await this.searchService.clearSearchHistory(user.id);
        return { message: 'Search history cleared' };
    }
}