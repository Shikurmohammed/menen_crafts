
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

    @Patch(':id')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.ADMIN, UserRole.ARTISAN)
    @ApiConsumes('multipart/form-data')
    @ApiOperation({ summary: 'Update craft details' })
    @UseInterceptors(FileFieldsInterceptor([
        { name: 'images', maxCount: 5 },
    ]))
    async update(
        @Param('id', ParseIntPipe) id: number,
        @Body() updateCraftDto: UpdateCraftDto,
        @UploadedFiles() files: { images?: Express.Multer.File[] },
        @CurrentUser() user: User,
    ) {
        if (files?.images?.length) {
            const imageUrls = await this.craftsService.saveImages(files.images);
            updateCraftDto.images = imageUrls;
        }
        return await this.craftsService.update(id, updateCraftDto, user);
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

// export class CraftsController {
//     private readonly logger = new Logger(CraftsController.name);
//     constructor(
//         private readonly craftsService: CraftsService,
//             private readonly uploadsService: UploadsService,
//     ) { }

//     @Get()
//     async findAll(@Query() query: Record<string, any>) {
//         return await this.craftsService.findAll(query);
//     }


// @Post()
// @UseGuards(JwtAuthGuard, RolesGuard)
// @Roles(UserRole.ADMIN, UserRole.ARTISAN)
// @ApiConsumes('multipart/form-data')
// @UseInterceptors(FileFieldsInterceptor([
//     { name: 'images', maxCount: 5 },
// ]))
// async create(
//     @Body() createCraftDto: CreateCraftDto,
//     @UploadedFiles() files: { images?: Express.Multer.File[] },
//     @CurrentUser() user: User,
// ) {
//     let uploadedImages: Array<{ url: string; publicId?: string }> = [];
    
//     try {
//         if (files?.images?.length) {
//             uploadedImages = await this.uploadsService.uploadMultiple(files.images, 'crafts');
//             createCraftDto.images = uploadedImages.map(img => img.url);
//         }
        
//         const craft = await this.craftsService.create(createCraftDto, user);
        
//         // Store publicIds if using Cloudinary (optional)
//         if (uploadedImages.length > 0 && uploadedImages[0].publicId) {
//             // You might want to store publicIds in a separate table or in craft metadata
//             // For now, we'll just return them
//             return {
//                 ...craft,
//                 uploadedImages,
//             };
//         }
        
//         return craft;
//     } catch (error) {
//         // Cleanup uploaded images if craft creation fails
//         if (uploadedImages.length > 0) {
//             await this.uploadsService.deleteMultiple(uploadedImages);
//         }
//         throw error;
//     }
// }
//     @UseGuards(JwtAuthGuard, RolesGuard)
//     @Post()
//     @Roles(UserRole.ADMIN, UserRole.ARTISAN)
//     @ApiConsumes('multipart/form-data')
//     @UseInterceptors(FileFieldsInterceptor([
//         { name: 'images', maxCount: 5 }, // ONLY files here!
//     ]))
//     async creatv0(
//         @Body() createCraftDto: CreateCraftDto, // This gets ALL text fields automatically!
//         @UploadedFiles() files: { images?: Express.Multer.File[] },
//         @CurrentUser() user: User,
//     ) {
//         this.logger.debug('=== CREATE CRAFT REACHED ===');
//         this.logger.debug('DTO from @Body():', JSON.stringify(createCraftDto, null, 2));
//         this.logger.debug('Files:', files?.images?.length);

//         // Handle images separately
//         if (files?.images?.length) {
//             const imageUrls = await this.craftsService.saveImages(files.images);
//             createCraftDto.images = imageUrls;
//         }

//         return await this.craftsService.create(createCraftDto, user);
//     }
//     @Get('stats')
//     async getStats() {
//         return await this.craftsService.getStats();
//     }

//     @UseGuards(JwtAuthGuard, RolesGuard)
//     @Patch(':id')
//     @ApiConsumes('multipart/form-data')
//     @UseInterceptors(FileFieldsInterceptor([
//         { name: 'images', maxCount: 5 },
//     ]))
//     async update(
//         @Param('id', ParseIntPipe) id: number,
//         @Body() updateCraftDto: UpdateCraftDto,
//         @UploadedFiles() files: { images?: Express.Multer.File[] },
//         @CurrentUser() user: User,
//     ) {
//         if (files?.images) {
//             const imageUrls = await this.craftsService.saveImages(files.images);
//             updateCraftDto.images = imageUrls;
//         }
//         return await this.craftsService.update(id, updateCraftDto, user);
//     }

//     @UseGuards(JwtAuthGuard, RolesGuard)
//     @Delete(':id')
//     async remove(
//         @Param('id', ParseIntPipe) id: number,
//         @CurrentUser() user: User,
//     ) {
//         await this.craftsService.remove(id, user);
//         return { message: 'Craft deleted successfully' };
//     }
    
//     @Get('featured') // 1st
// findAllFeatured() {
//   return this.craftsService.findFeatured();
// }
//     @Get(':id')
//     async findOne(@Param('id', ParseIntPipe) id: number) {
//         return await this.craftsService.findOne(id);
//     }
//     @UseGuards(JwtAuthGuard, RolesGuard)

//     @Get('artisan/:artisanId')
//     @Get(':id')
//     async findByArtisan(@Param('artisanId', ParseIntPipe) artisanId: number) {
//         return await this.craftsService.findByArtisan(artisanId);
//     }

    
// }