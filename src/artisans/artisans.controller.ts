import {
    Controller,
    Get,
    Param,
    Query,
    ParseIntPipe,
    DefaultValuePipe,
    UseGuards,
} from '@nestjs/common';
import { ArtisansService } from './artisans.service';
import { ApiTags, ApiOperation, ApiQuery, ApiParam } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';

@ApiTags('artisans')
@Controller('artisans')
export class ArtisansController {
    constructor(private readonly artisansService: ArtisansService) { }

    @Get('featured')
    @ApiOperation({ summary: 'Get featured artisans' })
    @ApiQuery({ name: 'limit', required: false, type: Number })
    async getFeaturedArtisans(
        @Query('limit', new DefaultValuePipe(6), ParseIntPipe) limit: number,
    ) {
        return this.artisansService.getFeaturedArtisans(limit);
    }

    @Get('top')
    @ApiOperation({ summary: 'Get top artisans' })
    @ApiQuery({ name: 'limit', required: false, type: Number })
    async getTopArtisans(
        @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    ) {
        return this.artisansService.getTopArtisans(limit);
    }

    @Get('search')
    @ApiOperation({ summary: 'Search artisans' })
    @ApiQuery({ name: 'q', required: true, type: String })
    @ApiQuery({ name: 'limit', required: false, type: Number })
    async searchArtisans(
        @Query('q') query: string,
        @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    ) {
        return this.artisansService.searchArtisans(query, limit);
    }
    @Get('artisanscount')
    async artisanCount(@Query() query: Record<string, any>) {
        return await this.artisansService.artisanCount(query);
    }
    @Get('customerscount')
    async customerCount(@Query() query: Record<string, any>) {
        return await this.artisansService.customerCount(query);
    }

 
    @Get(':id')
    @ApiOperation({ summary: 'Get artisan details by ID' })
    @ApiParam({ name: 'id', type: Number })
    async getArtisan(@Param('id', ParseIntPipe) id: number) {
        return this.artisansService.getArtisanDetails(id);
    }

    @Get(':id/crafts')
    @ApiOperation({ summary: 'Get crafts by artisan' })
    @ApiParam({ name: 'id', type: Number })
    @ApiQuery({ name: 'page', required: false, type: Number })
    @ApiQuery({ name: 'limit', required: false, type: Number })
    @ApiQuery({ name: 'sortBy', required: false, type: String })
    @ApiQuery({ name: 'sortOrder', required: false, enum: ['ASC', 'DESC'] })
    async getArtisanCrafts(
        @Param('id', ParseIntPipe) id: number,
        @Query() query: any,
    ) {
        return this.artisansService.getArtisanCrafts(id, query);
    }
}