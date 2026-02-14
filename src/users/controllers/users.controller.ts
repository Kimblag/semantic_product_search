import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { Roles } from 'src/common/decorators/roles.decorator';
import { Role } from 'src/common/enums/role.enum';
import { CreateUserCommand } from '../application/commands/create-user.command';
import { UsersService } from '../application/users.service';
import { CreateUserDto } from '../dto/create-user.dto';
import { UserResponseDto } from '../dto/user-response.dto';
import { GetUsersQueryDto } from '../dto/get-user-query.dto';
import { GetUserQueryCommand } from '../application/commands/get-user-query.command';
import { UpdateUserNameDto } from '../dto/update-user-name.dto';
import { UpdateUserNameCommand } from '../application/commands/update-user-name.command';

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
    const command: GetUserQueryCommand = {
      email: filters.email,
      isActive: filters.isActive,
      roleId: filters.roleId,
    };
    return this.usersService.findAllUsers(command);
  }

  // update my name ownership-based access control
  @Roles(Role.EXECUTIVE, Role.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @Patch('me')
  async updateMe(
    @Body() data: UpdateUserNameDto,
    @Req() request: Request,
  ): Promise<void> {
    const currentUser = request.user;
    if (!currentUser) throw new UnauthorizedException();
    const command: UpdateUserNameCommand = {
      userId: currentUser.sub,
      newName: data.name,
    };
    await this.usersService.updateUserName(command);
  }

  // update users name
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @Patch(':id')
  async update(
    @Body() data: UpdateUserNameDto,
    @Param('id') userId: string,
  ): Promise<void> {
    const command: UpdateUserNameCommand = {
      userId,
      newName: data.name,
    };
    await this.usersService.updateUserName(command);
  }

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
