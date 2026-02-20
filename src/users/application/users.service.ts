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

import { AuditService } from 'src/audit/audit.service';
import { AuditAction } from 'src/audit/enums/audit-action.enum';
import appConfig from 'src/config/app.config';
import { PrismaService } from 'src/prisma/prisma.service';
import { UserResponseDto } from '../dto/user-response.dto';
import { CreateUserInput } from './inputs/create-user.input';
import { DeactivateUserInput } from './inputs/deactivate-user-input';
import { GetUserQueryInput } from './inputs/get-user-query.input';
import { ReactivateUserInput } from './inputs/reactivate-user-input';
import { UpdateUserEmailInput } from './inputs/update-user-email.input';
import { UpdateUserNameInput } from './inputs/update-user-name.input';
import { UpdateUserRolesInput } from './inputs/update-user-roles.input';

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
    private readonly auditService: AuditService,
  ) {}

  /**
   * Creates a new user with associated roles.
   *
   * @param input - The CreateUserCommand containing user details (email, name, password) and role IDs
   * @returns A promise that resolves to the created user object, excluding passwordHash and updatedAt fields
   * @throws {BadRequestException} If one or more provided role IDs do not exist in the database
   * @throws {ConflictException} If a user with the provided email already exists
   * @throws {Error} For any other database or unexpected errors
   */
  async createUser(input: CreateUserInput): Promise<UserResponseDto> {
    // check if provided roles exist in the database
    let rolesCount: number;
    try {
      rolesCount = await this.prisma.role.count({
        where: {
          id: { in: input.roles },
        },
      });
    } catch {
      throw new InternalServerErrorException('Internal server error.');
    }

    if (rolesCount !== input.roles.length) {
      throw new BadRequestException('One or more provided roles are invalid.');
    }

    try {
      const user = await this.prisma.user.create({
        data: {
          email: input.email,
          name: input.name,
          passwordHash: await this.hashPassword(input.password),

          roles: {
            create: input.roles.map((roleId) => ({
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
  async findAllUsers(input: GetUserQueryInput): Promise<UserResponseDto[]> {
    const whereClause: Prisma.UserWhereInput = {};

    if (input.email) {
      whereClause.email = input.email;
    }

    if (input.isActive !== undefined) {
      whereClause.active = input.isActive;
    }

    if (input.roleId) {
      whereClause.roles = {
        some: {
          rolId: input.roleId,
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
  async findUserAuthByEmail(email: string): Promise<UserWithRoles | null> {
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
  async findUserAuthById(userId: string): Promise<UserWithRoles | null> {
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

  async findUserById(userId: string): Promise<UserResponseDto | null> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        include: {
          roles: {
            include: {
              rol: true,
            },
          },
        },
      });
      if (!user) {
        return null;
      }
      return plainToInstance(UserResponseDto, user, {
        excludeExtraneousValues: true,
      });
    } catch {
      throw new InternalServerErrorException('Internal server error.');
    }
  }

  // update user name
  async updateUserName(input: UpdateUserNameInput): Promise<void> {
    try {
      await this.prisma.user.update({
        where: {
          id: input.userId,
        },
        data: {
          name: input.newName,
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
  async updateUserEmail(input: UpdateUserEmailInput): Promise<void> {
    try {
      await this.prisma.user.update({
        where: {
          id: input.userId,
        },
        data: {
          email: input.newEmail,
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

    await this.auditService.log({
      action: AuditAction.EMAIL_UPDATED,
      userId: input.userId,
      metadata: {
        newEmail: input.newEmail,
      },
    });
  }

  // manage user roles (ADMIN)
  async updateUserRoles(input: UpdateUserRolesInput): Promise<void> {
    const uniqueRoles = [...new Set(input.roles)];

    const rolesCount = await this.prisma.role.count({
      where: { id: { in: uniqueRoles } },
    });

    if (rolesCount !== uniqueRoles.length) {
      throw new BadRequestException('Invalid input.');
    }

    try {
      await this.prisma.user.update({
        where: { id: input.userId },
        data: {
          roles: {
            // delete all the current roles
            deleteMany: {},
            // create the new relations for the new roles
            create: input.roles.map((roleId) => ({
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

    await this.auditService.log({
      action: AuditAction.ROLES_UPDATED,
      userId: input.userId,
      metadata: {
        newRoles: input.roles,
      },
    });
  }

  // Deactivate user account (ADMIN)
  async deactivateUser(input: DeactivateUserInput): Promise<void> {
    try {
      await this.prisma.user.update({
        where: {
          id: input.userId,
        },
        data: {
          active: false,
        },
      });

      await this.auditService.log({
        action: AuditAction.USER_DEACTIVATED,
        userId: input.userId,
        metadata: {
          deactivatedByUserId: input.deactivatedBy,
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

  async reactivateUser(input: ReactivateUserInput): Promise<void> {
    try {
      await this.prisma.user.update({
        where: {
          id: input.userId,
        },
        data: {
          active: true,
        },
      });

      await this.auditService.log({
        action: AuditAction.USER_REACTIVATED,
        userId: input.userId,
        metadata: {
          reactivatedByUserId: input.reactivatedBy,
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

  /* helper methods for password hashing and verification */
  async hashPassword(password: string): Promise<string> {
    try {
      return await bcrypt.hash(password, this.config.security.hashSaltRounds);
    } catch {
      throw new InternalServerErrorException('Internal server error.');
    }
  }

  async verifyPassword(
    hashedPassword: string,
    plainPassword: string,
  ): Promise<boolean> {
    try {
      return await bcrypt.compare(plainPassword, hashedPassword);
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
