/* eslint-disable @typescript-eslint/no-explicit-any */
import {
    Controller,
    Get,
    Post,
    Body,
    Patch,
    Param,
    Delete,
    Query,
    UseGuards,
    ParseIntPipe,
    Logger,
} from '@nestjs/common';
import { CraftsService } from './crafts.service';
import { CreateCraftDto } from './dto/create-craft.dto';
import { UpdateCraftDto } from './dto/update-craft.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../users/user.entity';
import { UserRole } from 'src/enums/UserRole.enum';

@Controller('crafts')
export class CraftsController {
    private readonly logger = new Logger(CraftsController.name);
    constructor(private readonly craftsService: CraftsService) { }

    @Get()
    async findAll(@Query() query: any) {
        return await this.craftsService.findAll(query);
    }

    @Get(':id')
    async findOne(@Param('id', ParseIntPipe) id: number) {
        return await this.craftsService.findOne(id);
    }

    @Post()
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.ADMIN, UserRole.USER)
    async create(
        @Body() createCraftDto: CreateCraftDto,
        @CurrentUser() user: User,
    ) {
        this.logger.debug('Create Craft DTO: ' + JSON.stringify(createCraftDto));
        return await this.craftsService.create(createCraftDto, user);
    }

    @Patch(':id')
    @UseGuards(JwtAuthGuard, RolesGuard)
    async update(
        @Param('id', ParseIntPipe) id: number,
        @Body() updateCraftDto: UpdateCraftDto,
        @CurrentUser() user: User,
    ) {
        return await this.craftsService.update(id, updateCraftDto, user);
    }

    @Delete(':id')
    @UseGuards(JwtAuthGuard, RolesGuard)
    async remove(
        @Param('id', ParseIntPipe) id: number,
        @CurrentUser() user: User,
    ) {
        await this.craftsService.remove(id, user);
        return { message: 'Craft deleted successfully' };
    }

    @Get('artisan/:artisanId')
    async findByArtisan(@Param('artisanId', ParseIntPipe) artisanId: number) {
        return await this.craftsService.findByArtisan(artisanId);
    }
}