import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { plainToInstance } from 'class-transformer';

import appConfig from 'src/config/app.config';
import { PrismaService } from 'src/prisma/prisma.service';
import { UserResponseDto } from '../dto/user-response.dto';
import { CreateUserCommand } from './commands/create-user.command';
import { GetUserQueryCommand } from './commands/get-user-query.command';
import { UpdateUserEmailCommand } from './commands/update-user-email.command';
import { UpdateUserNameCommand } from './commands/update-user-name.command';
import { UpdateUserRolesCommand } from './commands/update-user-roles.command';

// Define a type that includes the user along with their roles and the role details
type UserWithRoles = Prisma.UserGetPayload<{
  include: {
    roles: {
      include: {
        rol: true;
      };
    };
  };
}>;

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(appConfig.KEY)
    private readonly config: ConfigType<typeof appConfig>,
  ) {}

  /**
   * Creates a new user with associated roles.
   *
   * @param command - The CreateUserCommand containing user details (email, name, password) and role IDs
   * @returns A promise that resolves to the created user object, excluding passwordHash and updatedAt fields
   * @throws {BadRequestException} If one or more provided role IDs do not exist in the database
   * @throws {ConflictException} If a user with the provided email already exists
   * @throws {Error} For any other database or unexpected errors
   */
  async createUser(command: CreateUserCommand): Promise<UserResponseDto> {
    // check if provided roles exist in the database
    let rolesCount: number;
    try {
      rolesCount = await this.prisma.role.count({
        where: {
          id: { in: command.roles },
        },
      });
    } catch {
      throw new InternalServerErrorException('Internal server error.');
    }

    if (rolesCount !== command.roles.length) {
      throw new BadRequestException('One or more provided roles are invalid.');
    }

    try {
      const user = await this.prisma.user.create({
        data: {
          email: command.email,
          name: command.name,
          passwordHash: await this.hashPassword(command.password),

          roles: {
            create: command.roles.map((roleId) => ({
              rol: {
                connect: { id: roleId },
              },
            })),
          },
        },
        select: {
          id: true,
          email: true,
          name: true,
          active: true,
          createdAt: true,
        },
      });

      // Transform the created user object to a UserResponseDto,
      // excluding sensitive fields like passwordHash and updatedAt
      const userResponseDto = plainToInstance(UserResponseDto, user, {
        excludeExtraneousValues: true,
      });

      return userResponseDto;
    } catch (error: unknown) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002')
          throw new ConflictException('Resource conflict.');

        if (error.code === 'P2003')
          throw new ConflictException('Invalid reference.');

        if (error.code === 'P2025')
          throw new NotFoundException('Resource not found.');
      }
      throw new InternalServerErrorException('Internal server error.');
    }
  }

  // find all users with their roles and role details
  async findAllUsers(command: GetUserQueryCommand): Promise<UserResponseDto[]> {
    const whereClause: Prisma.UserWhereInput = {};

    if (command.email) {
      whereClause.email = command.email;
    }

    if (command.isActive !== undefined) {
      whereClause.active = command.isActive;
    }

    if (command.roleId) {
      whereClause.roles = {
        some: {
          rolId: command.roleId,
        },
      };
    }

    let users = [];
    try {
      users = await this.prisma.user.findMany({
        where: whereClause,
        select: {
          id: true,
          email: true,
          name: true,
          active: true,
          createdAt: true,
          roles: {
            select: {
              rol: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      });
    } catch {
      throw new InternalServerErrorException('Internal server error.');
    }

    let userResponseDtos: UserResponseDto[] = [];
    if (users.length > 0) {
      // Transform the array of user objects to an array of UserResponseDto,
      // excluding sensitive fields like passwordHash and updatedAt
      userResponseDtos = users.map((user) =>
        plainToInstance(UserResponseDto, user, {
          excludeExtraneousValues: true,
        }),
      );
    }

    return userResponseDtos;
  }

  // Find a user by email and include their roles and role details
  async findUserByEmail(email: string): Promise<UserWithRoles | null> {
    try {
      return await this.prisma.user.findUnique({
        where: { email },
        include: {
          roles: {
            include: {
              rol: true,
            },
          },
        },
      });
    } catch {
      throw new InternalServerErrorException('Internal server error.');
    }
  }

  // Find a user by ID and include their roles and role details
  async findUserById(userId: string): Promise<UserWithRoles | null> {
    try {
      return await this.prisma.user.findUnique({
        where: { id: userId },
        include: {
          roles: {
            include: {
              rol: true,
            },
          },
        },
      });
    } catch {
      throw new InternalServerErrorException('Internal server error.');
    }
  }

  // update user name
  async updateUserName(command: UpdateUserNameCommand): Promise<void> {
    try {
      await this.prisma.user.update({
        where: {
          id: command.userId,
        },
        data: {
          name: command.newName,
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw new NotFoundException('Resource not found.');
        }

        if (error.code === 'P2002') {
          throw new ConflictException('Resource conflict.');
        }
      }

      throw new InternalServerErrorException('Internal server error.');
    }
  }

  // modify email of a user (ADMIN)
  async updateUserEmail(command: UpdateUserEmailCommand): Promise<void> {
    try {
      await this.prisma.user.update({
        where: {
          id: command.userId,
        },
        data: {
          email: command.newEmail,
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw new NotFoundException('Resource not found.');
        }

        if (error.code === 'P2002') {
          throw new ConflictException('Resource conflict.');
        }
      }

      throw new InternalServerErrorException('Internal server error.');
    }
  }

  // manage user roles (ADMIN)
  async updateUserRoles(command: UpdateUserRolesCommand): Promise<void> {
    const uniqueRoles = [...new Set(command.roles)];

    const rolesCount = await this.prisma.role.count({
      where: { id: { in: uniqueRoles } },
    });

    if (rolesCount !== uniqueRoles.length) {
      throw new BadRequestException('Invalid input.');
    }

    try {
      await this.prisma.user.update({
        where: { id: command.userId },
        data: {
          roles: {
            // delete all the current roles
            deleteMany: {},
            // create the new relations for the new roles
            create: command.roles.map((roleId) => ({
              rol: {
                connect: { id: roleId },
              },
            })),
          },
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw new NotFoundException('Resource not found.');
        }

        if (error.code === 'P2003') {
          throw new ConflictException('Invalid reference.');
        }
      }

      throw new InternalServerErrorException('Internal server error.');
    }
  }

  async hashPassword(password: string): Promise<string> {
    const hashedPassword = await bcrypt.hash(
      password,
      this.config.security.hashSaltRounds,
    );
    return hashedPassword;
  }

  async verifyPassword(
    hashedPassword: string,
    plainPassword: string,
  ): Promise<boolean> {
    try {
      return bcrypt.compare(plainPassword, hashedPassword);
    } catch {
      throw new InternalServerErrorException('Internal server error.');
    }
  }

  async updatePassword(userId: string, newPassword: string): Promise<void> {
    try {
      await this.prisma.user.update({
        where: {
          id: userId,
        },
        data: {
          passwordHash: await this.hashPassword(newPassword),
        },
      });
    } catch {
      throw new InternalServerErrorException('Internal server error.');
    }
  }
}
