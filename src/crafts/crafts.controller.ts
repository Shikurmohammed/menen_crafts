
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
    UploadedFiles,
    UseInterceptors,
    ForbiddenException,
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
import { ApiTags, ApiBearerAuth, ApiConsumes, ApiOperation } from '@nestjs/swagger';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { UploadsService } from 'src/uploads/uploads.service';
/**
 * Author: Dawud Mohammed,
 * Description: This controller manages all endpoints related to crafts, including creating, updating, deleting, and retrieving crafts. It also handles image uploads for crafts and includes role-based access control to ensure that only authorized users can perform certain actions. The controller is organized with static/specific routes defined before dynamic ID-based routes to prevent routing conflicts.
 * Created: 2026-01-20
 * Last Updated: 2026-03-15
 * Future Improvements: Implement pagination for listing crafts, add more detailed filtering options, and enhance error handling with more specific messages.
 * Note: Ensure that the UploadsService is properly configured to handle file uploads and that environment variables for storage (e.g., AWS S3, Cloudinary) are set up correctly.
 */
@ApiTags('crafts')
@ApiBearerAuth()
@Controller('crafts')
export class CraftsController {
    private readonly logger = new Logger(CraftsController.name);

    constructor(
        private readonly craftsService: CraftsService,
        private readonly uploadsService: UploadsService,
    ) { }

    // --- 1. STATIC & SPECIFIC ROUTES (MUST BE FIRST) ---

    @Get('stats')
    @ApiOperation({ summary: 'Get global craft statistics' })
    async getStats() {
        return await this.craftsService.getStats();
    }

    @Get('featured')
    @ApiOperation({ summary: 'Get featured crafts' })
    async findAllFeatured() {
        return await this.craftsService.findFeatured();
    }

    @Get('artisan/:artisanId')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @ApiOperation({ summary: 'Get all crafts by a specific artisan' })
    async findByArtisan(@Param('artisanId', ParseIntPipe) artisanId: number) {
        return await this.craftsService.findByArtisan(artisanId);
    }

    // --- 2. GENERAL COLLECTION ROUTES ---

    @Get()
    @ApiOperation({ summary: 'Get all crafts with optional filters' })
    async findAll(@Query() query: Record<string, any>) {
        return await this.craftsService.findAll(query);
    }

    @Post()
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.ADMIN, UserRole.ARTISAN)
    @ApiConsumes('multipart/form-data')
    @ApiOperation({ summary: 'Create a new craft' })
    @UseInterceptors(FileFieldsInterceptor([
        { name: 'images', maxCount: 5 },
    ]))
    async create(
        @Body() createCraftDto: CreateCraftDto,
        @UploadedFiles() files: { images?: Express.Multer.File[] },
        @CurrentUser() user: User,
    ) {
        let uploadedImages: Array<{ url: string; publicId?: string }> = [];
        
        try {
            if (files?.images?.length) {
                uploadedImages = await this.uploadsService.uploadMultiple(files.images, 'crafts');
                createCraftDto.images = uploadedImages.map(img => img.url);
            }
            
            return await this.craftsService.create(createCraftDto, user);
        } catch (error) {
            // Cleanup uploaded images if craft creation fails
            if (uploadedImages.length > 0) {
                await this.uploadsService.deleteMultiple(uploadedImages);
            }
            throw error;
        }
    }

    // --- 3. DYNAMIC PARAMETER ROUTES (ID-BASED) ---

    @Get(':id')
    @ApiOperation({ summary: 'Get craft by ID' })
    async findOne(@Param('id', ParseIntPipe) id: number) {
        return await this.craftsService.findOne(id);
    }

    // @Patch(':id')
    // @UseGuards(JwtAuthGuard, RolesGuard)
    // @Roles(UserRole.ADMIN, UserRole.ARTISAN)
    // @ApiConsumes('multipart/form-data')
    // @ApiOperation({ summary: 'Update craft details' })
    // @UseInterceptors(FileFieldsInterceptor([
    //     { name: 'images', maxCount: 5 },
    // ]))
    // async update(
    //     @Param('id', ParseIntPipe) id: number,
    //     @Body() updateCraftDto: UpdateCraftDto,
    //     @UploadedFiles() files: { images?: Express.Multer.File[] },
    //     @CurrentUser() user: User,
    // ) {
    //     if (files?.images?.length) {
    //         const imageUrls = await this.craftsService.saveImages(files.images);
    //         updateCraftDto.images = imageUrls;
    //     }
    //     return await this.craftsService.update(id, updateCraftDto, user);
    // }

    @Patch(':id')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @UseInterceptors(FileFieldsInterceptor([
        { name: 'images', maxCount: 5 },
    ]))
    async update(
        @Param('id', ParseIntPipe) id: number,
        @Body() updateCraftDto: UpdateCraftDto,
        @UploadedFiles() files: { images?: Express.Multer.File[] },
        @Body('imagesToDelete') imagesToDelete?: string,
        @CurrentUser() user?: User,
    ) {
        let uploadedImages = [];
        
        // Handle new image uploads
        if (files?.images?.length) {
            uploadedImages = await this.uploadsService.uploadMultiple(files.images, 'crafts');
            updateCraftDto.images = [
                ...(updateCraftDto.images || []),
                ...uploadedImages.map(img => img.url)
            ];
        }
        
        // Handle images to delete
        if (imagesToDelete) {
            const toDelete = JSON.parse(imagesToDelete);
            await this.uploadsService.deleteMultiple(toDelete);
        }
        
        return this.craftsService.update(id, updateCraftDto, user);
    }

    @Patch(':id/stock')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.ADMIN, UserRole.ARTISAN)
    @ApiOperation({ summary: 'Update specific craft stock level' })
    async updateStock(
        @Param('id', ParseIntPipe) id: number,
        @Body('stock', ParseIntPipe) stock: number,
        @CurrentUser() user: User,
    ) {
        // You'll need to implement updateStock logic in your CraftsService
        return await this.craftsService.updateStock(id, stock, user);
    }

    @Delete(':id')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.ADMIN, UserRole.ARTISAN)
    @ApiOperation({ summary: 'Delete a craft' })
    async remove(
        @Param('id', ParseIntPipe) id: number,
        @CurrentUser() user: User,
    ) {
        await this.craftsService.remove(id, user);
        return { message: 'Craft deleted successfully' };
    }
}
