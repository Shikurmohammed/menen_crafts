import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
    constructor(
        @InjectRepository(User)
        private usersRepository: Repository<User>,
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

    async findAll(): Promise<User[]> {
        return await this.usersRepository.find();
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
        Object.assign(user, updateUserDto);
        return await this.usersRepository.save(user);
    }

    async remove(id: string): Promise<void> {
        const result = await this.usersRepository.delete(id);
        if (result.affected === 0) {
            throw new NotFoundException('User not found');
        }
    }
}