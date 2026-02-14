import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  Put,
  Query,
  Res,
} from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { Response } from 'express';
import { Roles } from 'src/common/decorators/roles.decorator';
import { Role } from 'src/common/enums/role.enum';
import { CreateUserCommand } from '../application/commands/create-user.command';
import { UsersService } from '../application/users.service';
import { CreateUserDto } from '../dto/create-user.dto';
import { UserResponseDto } from '../dto/user-response.dto';
import { GetUsersQueryDto } from '../dto/get-user-query.dto';

@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // create user
  @Roles(Role.ADMIN)
  @Post()
  async create(
    @Body() userData: CreateUserDto,
    @Res() res: Response,
  ): Promise<Response> {
    const command: CreateUserCommand = {
      email: userData.email,
      name: userData.name,
      password: userData.password,
      roles: userData.roles,
    };

    const user = await this.usersService.createUser(command);
    return res
      .status(HttpStatus.CREATED)
      .location(`/users/${user.id}`)
      .json(user);
  }

  // list users
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  @Get()
  async findAll(
    @Query() filters: GetUsersQueryDto,
  ): Promise<UserResponseDto[]> {
    return this.usersService.findAllUsers(filters);
  }

  // update user data
  @Roles(Role.EXECUTIVE)
  @Patch(':id')
  async update() {}

  // change password
  @Roles(Role.EXECUTIVE)
  @Patch(':id/change-password')
  async changePassword() {}

  // reset password
  @Roles(Role.ADMIN)
  @Patch(':id/reset-password')
  async resetPassword() {}

  // update email
  @Roles(Role.ADMIN)
  @Patch(':id/email')
  async updateEmail() {}

  // update user roles
  @Roles(Role.ADMIN)
  @Put(':id/roles')
  async updateRoles() {}
}
