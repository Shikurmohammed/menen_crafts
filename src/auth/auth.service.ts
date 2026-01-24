import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import * as bcrypt from 'bcrypt';
import { User } from 'src/users/user.entity';
import { CreateUserDto } from 'src/users/dto/create-user.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
    constructor(
        private usersService: UsersService,
        private jwtService: JwtService,
    ) { }

    async validateUser(email: string, password: string): Promise<User | null> {
        const user = await this.usersService.findByEmail(email);
        if (user && await bcrypt.compare(password, user.password)) {
            const { ...result } = user;
            return { ...result, id: result.id };
        }
        return null;
    }

    async login(loginDto: LoginDto): Promise<{ access_token: string; user: any }> {
        //1.Verify the user is present in the database.
        const user = await this.usersService.findByEmail(loginDto.email);
        if (!user) {
            throw new UnauthorizedException('User with email :' + loginDto.email + ' not found.');
        }
        //2.Verify the password
        const isPasswordValid = await bcrypt.compare(loginDto.password, user.password);
        if (!isPasswordValid) {
            throw new UnauthorizedException('Invalid credentials');
        }
        //3.Generate JWT Token
        const payload = { email: loginDto.email, sub: user.id, role: user.role };
        return {
            access_token: this.jwtService.sign(payload),
            user: {
                id: user.id,
                email: loginDto.email,
            },
        };
    }

    public async register(createUserDto: CreateUserDto): Promise<User> {
        return this.usersService.create(createUserDto);
    }
}