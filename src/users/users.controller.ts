import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { CreateUserDto } from './dto/create-user.dto';
import { UsersService } from './users.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserRole } from 'src/enums/UserRole.enum';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
    constructor(private readonly usersService: UsersService) { }
    @Post()
    @Roles(UserRole.ADMIN)
    create(@Body() createUserDto: CreateUserDto) {
        return this.usersService.create(createUserDto);
    }

    @Get()
    @Roles(UserRole.ADMIN)
    findAll() {
        console.log("Fetching All Users....");
        return this.usersService.findAll();
    }
    @Get(':id')
    @Roles(UserRole.ADMIN)
    findOne(@Param('id') id: number) {
        return this.usersService.findOne(id);
    }

    @Patch(':id')
    @Roles(UserRole.ADMIN)
    update(@Param('id') id: number, @Body() updateUserDto: UpdateUserDto) {
        return this.usersService.update(id, updateUserDto);
    }

    @UseGuards(RolesGuard)//Only Admin can delete users
    @Delete(':id')
    @Roles(UserRole.ADMIN)
    remove(@Param('id') id: string) {
        return this.usersService.remove(id);
    }
}
