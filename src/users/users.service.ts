import { Injectable, ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, Between, In } from 'typeorm';
import { User } from './user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import * as bcrypt from 'bcrypt';
import { UploadsService } from 'src/uploads/uploads.service';
import { UpdateAppearanceSettingsDto } from './dto/update-appearance-settings.dto';
import { UpdateNotificationSettingsDto } from './dto/update-notification-settings.dto';
import { UpdatePreferencesDto } from './dto/update-preferences.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdateSecuritySettingsDto } from './dto/update-security-settings.dto';
import { UserRole } from 'src/enums/UserRole.enum';

@Injectable()
export class UsersService {

    constructor(
        @InjectRepository(User)
        private usersRepository: Repository<User>,
        private uploadsService: UploadsService
    ) { }

    async create(createUserDto: CreateUserDto): Promise<User> {
        const existingUser = await this.usersRepository.findOne({
            where: { email: createUserDto.email },
        });

        if (existingUser) {
            throw new ConflictException('Email already exists');
        }
        //Hash the password before saving
        const hashedPassword = await bcrypt.hash(createUserDto.password, 10);
        const user = this.usersRepository.create({ ...createUserDto, password: hashedPassword });
        return await this.usersRepository.save(user);
    }

    async findAll(query: any): Promise<{ data: User[]; total: number }> {
        const {
            page = 1,
            limit = 10,
            search,
            role,
            status,
            startDate,
            endDate,
            sortBy = 'createdAt',
            sortOrder = 'DESC'
        } = query;

        const skip = (page - 1) * limit;
        const take = limit;

        // 1. Build Base Filters (AND conditions)
        const baseFilters: any = {};

        if (role) {
            baseFilters.role = role;
        }

        if (status) {
            baseFilters.isActive = status === 'active';
        }

        if (startDate && endDate) {
            baseFilters.createdAt = Between(new Date(startDate), new Date(endDate));
        } else if (startDate) {
            baseFilters.createdAt = Between(new Date(startDate), new Date());
        } else if (endDate) {
            baseFilters.createdAt = Between(new Date('2020-01-01'), new Date(endDate));
        }

        // 2. Handle Search with OR logic
        // In TypeORM, an array in 'where' generates OR. 
        // We must include baseFilters in each element to maintain (Base AND (Search1 OR Search2))
        let where: any;

        if (search) {
            const searchPattern = Like(`%${search}%`);
            where = [
                { ...baseFilters, firstName: searchPattern },
                { ...baseFilters, lastName: searchPattern },
                { ...baseFilters, email: searchPattern }
            ];
        } else {
            where = baseFilters;
        }

        // 3. Execute Query
        const [data, total] = await this.usersRepository.findAndCount({
            where,
            skip,
            take,
            order: {
                [sortBy]: sortOrder.toUpperCase() // Ensure DESC/ASC is uppercase
            }
        });

        return { data, total };
    }
    async findContactsByRoles(roles: string[]) {
        return this.usersRepository.find({
            where: {
                role: In(roles), // Using 'In' from typeorm
            },
            select: ['id', 'firstName', 'lastName', 'role', 'avatar'], // Only public info
        });
    }
    async findOne(id: number): Promise<User> {
        const user = await this.usersRepository.findOne({ where: { id } });
        if (!user) {
            throw new NotFoundException('User not found');
        }
        return user;
    }

    async findByEmail(email: string): Promise<User | null> {
        return await this.usersRepository.findOne({ where: { email } });
    }

    async update(id: number, updateUserDto: UpdateUserDto): Promise<User> {
        const user = await this.findOne(id);
        //Check if the given email is not belongs to another user, then only allow update. 
        //Bypass if the email is same as current user's email.
        if (updateUserDto.email && updateUserDto.email !== user.email) {
            const existingUser = await this.usersRepository.findOne({
                where: { email: updateUserDto.email },
            });
            if (existingUser) {
                throw new ConflictException('Email already exists');
            }
        }
        //hash the password if it's being updated
        if (updateUserDto.password) {
            updateUserDto.password = await bcrypt.hash(updateUserDto.password, 10);
        }
        else {
            delete updateUserDto.password;
        }
        const updateUser = this.usersRepository.merge(user, updateUserDto);
        return await this.usersRepository.save(updateUser);
    }

    async remove(id: number): Promise<void> {
        const result = await this.usersRepository.delete(id);
        if (result.affected === 0) {
            throw new NotFoundException('User not found');
        }
    }

    async setCurrentRefreshToken(id: number, refreshToken: string) {
        const hashedToken = await bcrypt.hash(refreshToken, 10);
        await this.usersRepository.update(id, { currentHashedRefreshToken: hashedToken });
    }

    async removeRefreshToken(id: number) {
        await this.usersRepository.update(id, { currentHashedRefreshToken: null });
    }


    async updateProfile(id: number, updateProfileDto: UpdateProfileDto): Promise<User> {
        const user = await this.findOne(id);

        // Check email uniqueness if changed
        if (updateProfileDto.email && updateProfileDto.email !== user.email) {
            const existingUser = await this.findByEmail(updateProfileDto.email);
            if (existingUser) {
                throw new ConflictException('Email already exists');
            }
        }

        Object.assign(user, updateProfileDto);
        return await this.usersRepository.save(user);
    }

    async updateAvatar(id: number, file: Express.Multer.File): Promise<{ url: string; publicId?: string }> {
        const user = await this.findOne(id);

        // Delete old avatar if exists
        if (user.avatarPublicId) {
            // We pass user.avatarPublicId safely here
            await this.uploadsService.deleteFile(user.avatar, user.avatarPublicId).catch(err => {
                console.error('Failed to delete old avatar:', err);
            });
        }

        // Upload new avatar
        const uploadResult = await this.uploadsService.uploadFile(file, 'avatars');

        user.avatar = uploadResult.url;
        // Use optional chaining or nullish coalescing
        user.avatarPublicId = uploadResult.publicId ?? null;

        await this.usersRepository.save(user);

        return uploadResult;
    }

    async updateNotificationSettings(id: number, settings: UpdateNotificationSettingsDto): Promise<User> {
        const user = await this.findOne(id);

        // Merge with existing settings
        user.notificationSettings = {
            ...user.notificationSettings,
            ...settings,
        };

        return await this.usersRepository.save(user);
    }

    async updateSecuritySettings(id: number, settings: UpdateSecuritySettingsDto): Promise<User> {
        const user = await this.findOne(id);

        user.securitySettings = {
            ...user.securitySettings,
            ...settings,
        };

        return await this.usersRepository.save(user);
    }

    async updateAppearanceSettings(id: number, settings: UpdateAppearanceSettingsDto): Promise<User> {
        const user = await this.findOne(id);

        user.appearanceSettings = {
            ...user.appearanceSettings,
            ...settings,
        };

        return await this.usersRepository.save(user);
    }

    async updatePreferences(id: number, preferences: UpdatePreferencesDto): Promise<User> {
        const user = await this.findOne(id);

        user.preferences = {
            ...user.preferences,
            ...preferences,
        };

        return await this.usersRepository.save(user);
    }

    async changePassword(id: number, currentPassword: string, newPassword: string): Promise<void> {
        const user = await this.usersRepository.findOne({
            where: { id },
            select: ['id', 'password'], // Select password for comparison
        });

        if (!user) {
            throw new NotFoundException('User not found');
        }

        // Verify current password
        const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
        if (!isPasswordValid) {
            throw new BadRequestException('Current password is incorrect');
        }

        // Hash new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        await this.usersRepository.update(id, { password: hashedPassword });
    }

    async getLoginHistory(id: number): Promise<any[]> {
        const user = await this.findOne(id);
        return user.loginHistory || [];
    }

    async addLoginHistory(id: number, entry: any): Promise<void> {
        const user = await this.findOne(id);

        const loginHistory = user.loginHistory || [];
        loginHistory.unshift({
            id: Date.now(),
            ...entry,
            time: new Date(),
        });

        // Keep only last 50 entries
        if (loginHistory.length > 50) {
            loginHistory.pop();
        }

        user.loginHistory = loginHistory;
        await this.usersRepository.save(user);
    }

    async logoutAllDevices(id: number, currentSessionId?: string): Promise<void> {
        // Invalidate all refresh tokens except current session
        // This would require a token blacklist or rotating refresh tokens
        await this.usersRepository.update(id, { currentHashedRefreshToken: null });
    }

    async deleteAccount(id: number): Promise<void> {
        const user = await this.findOne(id);

        // Delete avatar from cloud storage
        if (user.avatarPublicId) {
            await this.uploadsService.deleteFile(user.avatar, user.avatarPublicId).catch(err => {
                console.error('Failed to delete avatar:', err);
            });
        }

        // Soft delete or hard delete based on your requirements
        await this.usersRepository.softDelete(id);
        // Or for hard delete:
        // await this.usersRepository.remove(user);
    }

    async getTeamMembers(query: any): Promise<User[]> {
        const { role } = query;
        const where: any = { isActive: true };

        if (role) {
            where.role = In(role.split(','));
        } else {
            where.role = In([UserRole.ADMIN, UserRole.ARTISAN]);
        }

        return this.usersRepository.find({
            where,
            select: ['id', 'firstName', 'lastName', 'email', 'role', 'avatar', 'displayTitle', 'displayTitleEn'],
        });
    }

    async findByResetToken(resetToken: string): Promise<User | null> {
        console.log(`Looking for user with reset token: ${resetToken}`);

        const user = await this.usersRepository.findOne({
            where: {
                resetPasswordToken: resetToken,
            }
        });

        console.log(`User found: ${!!user}`);
        if (user) {
            console.log(`Token expires: ${user.resetPasswordExpires}`);
            console.log(`Current time: ${new Date()}`);
        }

        return user;
    }
    async updatePassword(id: number, newPassword: string): Promise<boolean> {
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        // First, check if user exists
        const userExists = await this.usersRepository.findOne({ where: { id } });
        if (!userExists) {
            console.log(`User with ID ${id} not found`);
            return false;
        }

        const result = await this.usersRepository
            .createQueryBuilder()
            .update(User)
            .set({
                password: hashedPassword,
                resetPasswordToken: null,
                resetPasswordExpires: null
            })
            .where("id = :id", { id })
            .execute();
        // Verify the update worked
        const updatedUser = await this.usersRepository.findOne({
            where: { id },
            select: ['id', 'password']
        });
        return result.affected > 0;
    }

}