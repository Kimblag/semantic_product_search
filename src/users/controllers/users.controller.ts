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
import { GetUserQueryCommand } from '../application/commands/get-user-query.command';
import { UpdateUserEmailCommand } from '../application/commands/update-user-email.command';
import { UpdateUserNameCommand } from '../application/commands/update-user-name.command';
import { UpdateUserRolesCommand } from '../application/commands/update-user-roles.command';
import { UsersService } from '../application/users.service';
import { CreateUserDto } from '../dto/create-user.dto';
import { GetUsersQueryDto } from '../dto/get-user-query.dto';
import { UpdateUserEmailDto } from '../dto/update-user-email.dto';
import { UpdateUserNameDto } from '../dto/update-user-name.dto';
import { UpdateUserRolesDto } from '../dto/update-user-roles.dto';
import { UserResponseDto } from '../dto/user-response.dto';

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

  // update email
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @Patch(':id/email')
  async updateEmail(
    @Body() data: UpdateUserEmailDto,
    @Param('id') userId: string,
  ): Promise<void> {
    const command: UpdateUserEmailCommand = {
      userId: userId,
      newEmail: data.newEmail,
    };

    await this.usersService.updateUserEmail(command);
  }

  // update user roles
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @Put(':id/roles')
  async updateRoles(
    @Body() data: UpdateUserRolesDto,
    @Param('id') userId: string,
  ): Promise<void> {
    const command: UpdateUserRolesCommand = {
      userId: userId,
      roles: data.roles,
    };
    await this.usersService.updateUserRoles(command);
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
}
