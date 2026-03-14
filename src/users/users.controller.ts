import {
  Controller, Get, Post, Patch, Delete, Body, Param, ParseIntPipe, UseGuards, Logger, ForbiddenException,
  Query,
  FileTypeValidator,
  MaxFileSizeValidator,
  ParseFilePipe,
  UploadedFile,
  UseInterceptors
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { UserRole } from 'src/enums/UserRole.enum';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';
import { query } from 'express';
import { ApiBody, ApiConsumes, ApiOperation } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { UpdateAppearanceSettingsDto } from './dto/update-appearance-settings.dto';
import { UpdateNotificationSettingsDto } from './dto/update-notification-settings.dto';
import { UpdatePreferencesDto } from './dto/update-preferences.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdateSecuritySettingsDto } from './dto/update-security-settings.dto';
import { User } from './user.entity';
/**
 * Author: Dawud Mohammed,
 * Description: This controller manages all endpoints related to users, including creating, updating, deleting, and retrieving users. It also includes endpoints for managing user profiles, settings, and contacts. The controller uses JWT authentication and role-based access control to ensure that only authorized users can perform certain actions. The controller is organized with static/specific routes defined before dynamic ID-based routes to prevent routing conflicts.
 * Created: 2026-01-15
 * Last Updated: 2026-03-30
 * Future Improvements: Implement pagination for listing users, add more detailed filtering options, and enhance error handling with more specific messages.
 * Note: Ensure that the UsersService is properly implemented to handle the business logic for users and that the database schema supports the necessary relationships between users and other entities (e.g., crafts, messages, reviews).
 */
@Controller('users')
// @UseGuards(JwtAuthGuard, RolesGuard) // Protect all routes
export class UsersController {
  private readonly logger = new Logger(UsersController.name);

  constructor(private readonly usersService: UsersService) { }
  /** -------------------- CREATE USER -------------------- */
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN) // Only ADMIN can create users
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }
  /** -------------------- GET ALL USERS -------------------- */
  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN) // Only ADMIN can list all users
  findAll(@Query() query: Record<string, any>) {
    console.log('Controller received query:', query);
    return this.usersService.findAll(query);
  }
  /** -------------------- GET CONTACTS -------------------- */
  @Get('contacts')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.ARTISAN, UserRole.CUSTOMER)
  // Change @Query('roles') to @Query('role') to match the URL
  async getContacts(@Query('role') roleString?: string) {
    console.log('Controller received roles string:', roleString);

    if (!roleString) return [];

    const rolesArray = roleString.split(',');
    const contacts = await this.usersService.findContactsByRoles(rolesArray);
    console.log('Contacts:', contacts);
    return contacts;
  }
  // Add more user-related endpoints as needed (e.g., profile, settings)
  @Patch('profile')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Update user profile' })
  async updateProfile(
    @CurrentUser() user: User,
    @Body() updateProfileDto: UpdateProfileDto,
  ) {
    return this.usersService.updateProfile(user.id, updateProfileDto);
  }

  @Post('avatar')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('avatar'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        avatar: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  async uploadAvatar(
    @CurrentUser() user: User,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }),
          new FileTypeValidator({ fileType: /(jpg|jpeg|png|gif)$/ }),
        ],
      }),
    )
    file: Express.Multer.File,
  ) {
    return this.usersService.updateAvatar(user.id, file);
  }

  @Patch('notifications')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Update notification settings' })
  async updateNotificationSettings(
    @CurrentUser() user: User,
    @Body() settings: UpdateNotificationSettingsDto,
  ) {
    return this.usersService.updateNotificationSettings(user.id, settings);
  }

  @Patch('security')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Update security settings' })
  async updateSecuritySettings(
    @CurrentUser() user: User,
    @Body() settings: UpdateSecuritySettingsDto,
  ) {
    return this.usersService.updateSecuritySettings(user.id, settings);
  }

  @Patch('appearance')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Update appearance settings' })
  async updateAppearanceSettings(
    @CurrentUser() user: User,
    @Body() settings: UpdateAppearanceSettingsDto,
  ) {
    return this.usersService.updateAppearanceSettings(user.id, settings);
  }

  @Patch('preferences')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Update user preferences' })
  async updatePreferences(
    @CurrentUser() user: User,
    @Body() preferences: UpdatePreferencesDto,
  ) {
    return this.usersService.updatePreferences(user.id, preferences);
  }

  @Post('change-password')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Change password' })
  async changePassword(
    @CurrentUser() user: User,
    @Body() body: { currentPassword: string; newPassword: string },
  ) {
    await this.usersService.changePassword(user.id, body.currentPassword, body.newPassword);
    return { message: 'Password changed successfully' };
  }

  @Get('login-history')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get login history' })
  async getLoginHistory(@CurrentUser() user: User) {
    return this.usersService.getLoginHistory(user.id);
  }

  @Post('logout-all')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Logout from all devices' })
  async logoutAllDevices(@CurrentUser() user: User) {
    await this.usersService.logoutAllDevices(user.id);
    return { message: 'Logged out from all devices' };
  }

  @Delete('account')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Delete user account' })
  async deleteAccount(@CurrentUser() user: User) {
    await this.usersService.deleteAccount(user.id);
    return { message: 'Account deleted successfully' };
  }

  @Get('settings')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get all user settings' })
  async getUserSettings(@CurrentUser() user: User) {
    const fullUser = await this.usersService.findOne(user.id);
    return {
      profile: {
        firstName: fullUser.firstName,
        lastName: fullUser.lastName,
        email: fullUser.email,
        phone: fullUser.phone,
        bio: fullUser.bio,
        address: fullUser.address,
        city: fullUser.city,
        state: fullUser.state,
        zipCode: fullUser.zipCode,
        country: fullUser.country,
        socialLinks: fullUser.socialLinks || {},
      },
      notificationSettings: fullUser.notificationSettings || {},
      securitySettings: fullUser.securitySettings || {},
      appearanceSettings: fullUser.appearanceSettings || {},
      preferences: fullUser.preferences || {},
    };

  }
   @Get('team-members')
    // No guards here makes it accessible to the public landing page
    async getTeamMembers(@Query() query: any) {
      console.log('Received query for team members:', query);
      console.log('Team Members: ',this.usersService.getTeamMembers(query));
        return await this.usersService.getTeamMembers(query);
    }

  /** -------------------- GET ONE USER -------------------- */
  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN) // Only ADMIN can fetch any user
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.findOne(id);
  }

  /** -------------------- UPDATE USER -------------------- */
  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateUserDto: UpdateUserDto,
    @CurrentUser() currentUser: any, // attached by JwtAuthGuard
  ) {
    // Admin can update any user
    if (currentUser.role === UserRole.ADMIN) {
      return this.usersService.update(id, updateUserDto);
    }

    // User can only update themselves
    if (currentUser.id === id) {
      return this.usersService.update(id, updateUserDto);
    }

    throw new ForbiddenException('You cannot update other users');
  }

  /** -------------------- DELETE USER -------------------- */
  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN) // Only ADMIN can delete users
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.remove(id);
  }
}