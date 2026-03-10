import { PickType } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';
import { CreateUserDto } from 'src/users/dto/create-user.dto';

export class RegisterDto extends PickType(CreateUserDto, [
  'email',
  'password',
  'firstName',
  'lastName',
  'role',
  'phone',

] as const) {}