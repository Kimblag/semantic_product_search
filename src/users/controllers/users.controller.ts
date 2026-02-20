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
import { JwtPayload } from 'src/auth/interfaces/jwt-payload.interface';
import { Roles } from 'src/common/decorators/roles.decorator';
import { Role } from 'src/common/enums/role.enum';
import { DeactivateUserInput } from '../application/inputs/deactivate-user-input';
import { GetUserQueryInput } from '../application/inputs/get-user-query.input';
import { ReactivateUserInput } from '../application/inputs/reactivate-user-input';
import { UpdateUserEmailInput } from '../application/inputs/update-user-email.input';
import { UpdateUserNameInput } from '../application/inputs/update-user-name.input';
import { UpdateUserRolesInput } from '../application/inputs/update-user-roles.input';
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
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() dto: CreateUserDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<UserResponseDto> {
    const user = await this.usersService.createUser(dto);

    res.setHeader('Location', `/users/${user.id}`);

    return user;
  }

  // list users
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  @Get(':id')
  async findOne(@Param('id') userId: string): Promise<UserResponseDto> {
    return this.usersService.findUserById(userId);
  }

  // list users
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  @Get()
  async findAll(
    @Query() filters: GetUsersQueryDto,
  ): Promise<UserResponseDto[]> {
    const input: GetUserQueryInput = {
      email: filters.email,
      isActive: filters.isActive,
      roleId: filters.roleId,
    };
    return this.usersService.findAllUsers(input);
  }

  // update my name ownership-based access control
  @Roles(Role.EXECUTIVE, Role.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @Patch('me')
  async updateMe(
    @Body() data: UpdateUserNameDto,
    @Req() request: Request,
  ): Promise<void> {
    const currentUser: JwtPayload = request.user;
    if (!currentUser) throw new UnauthorizedException();

    const input: UpdateUserNameInput = {
      userId: currentUser.sub,
      newName: data.name,
      changedBy: currentUser.sub,
    };
    await this.usersService.updateUserName(input);
  }

  // update email
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @Patch(':id/email')
  async updateEmail(
    @Body() data: UpdateUserEmailDto,
    @Param('id') userId: string,
  ): Promise<void> {
    const input: UpdateUserEmailInput = {
      userId: userId,
      newEmail: data.newEmail,
    };

    await this.usersService.updateUserEmail(input);
  }

  // update user roles
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @Put(':id/roles')
  async updateRoles(
    @Body() data: UpdateUserRolesDto,
    @Param('id') userId: string,
    @Req() request: Request,
  ): Promise<void> {
    const currentUser: JwtPayload = request.user;
    if (!currentUser) throw new UnauthorizedException();

    const input: UpdateUserRolesInput = {
      userId: userId,
      roles: data.roles,
      changedBy: currentUser.sub,
    };
    await this.usersService.updateUserRoles(input);
  }

  // update users name
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @Patch(':id/name')
  async update(
    @Body() data: UpdateUserNameDto,
    @Param('id') userId: string,
    @Req() request: Request,
  ): Promise<void> {
    const currentUser: JwtPayload = request.user;
    if (!currentUser) throw new UnauthorizedException();

    const input: UpdateUserNameInput = {
      userId,
      newName: data.name,
      changedBy: currentUser.sub,
    };
    await this.usersService.updateUserName(input);
  }

  // deactivate user
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @Patch(':id/deactivate')
  async deactivateUser(@Param('id') userId: string, @Req() request: Request) {
    const currentUser: JwtPayload = request.user;
    if (!currentUser) throw new UnauthorizedException();

    const input: DeactivateUserInput = {
      userId,
      deactivatedBy: currentUser.sub,
    };
    await this.usersService.deactivateUser(input);
  }

  // reactivate user
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @Patch(':id/reactivate')
  async reactivateUser(@Param('id') userId: string, @Req() request: Request) {
    const currentUser: JwtPayload = request.user;
    if (!currentUser) throw new UnauthorizedException();

    const input: ReactivateUserInput = {
      userId,
      reactivatedBy: currentUser.sub,
    };
    await this.usersService.reactivateUser(input);
  }
}
