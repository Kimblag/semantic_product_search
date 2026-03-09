import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
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
import { CurrentUserDto } from '../dtos/current-user.dto';
import { UserResponseDto } from '../dtos/user-response.dto';
import { CreateUserInput } from './inputs/create-user.input';
import { DeactivateUserInput } from './inputs/deactivate-user-input';
import { GetUserQueryInput } from './inputs/get-user-query.input';
import { ReactivateUserInput } from './inputs/reactivate-user-input';
import { UpdateUserEmailInput } from './inputs/update-user-email.input';
import { UpdateUserNameInput } from './inputs/update-user-name.input';
import { UpdateUserRolesInput } from './inputs/update-user-roles.input';
import { PaginatedResponse } from 'src/common/interfaces/paginated-response.interface';

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

  private async ensureNotRootUser(userId: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });

    if (user?.email === 'root@system.com') {
      throw new ForbiddenException(
        'The system root user cannot be modified or deactivated.',
      );
    }
  }

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
  async findAllUsers(
    input: GetUserQueryInput,
  ): Promise<PaginatedResponse<UserResponseDto>> {
    const { page, limit } = input;
    const skip = (page - 1) * limit;
    const take = limit;

    const whereClause: Prisma.UserWhereInput = {};

    // Build query string search across email, name, and role names
    if (input.q) {
      const searchQuery = input.q;
      whereClause.OR = [
        {
          email: {
            contains: searchQuery,
          },
        },
        {
          name: {
            contains: searchQuery,
          },
        },
        {
          roles: {
            some: {
              rol: {
                name: {
                  contains: searchQuery,
                },
              },
            },
          },
        },
      ];
    }

    // if active is undefined we show all!
    if (input.isActive !== undefined) {
      whereClause.active = input.isActive;
    }

    try {
      const [total, users] = await this.prisma.$transaction([
        this.prisma.user.count({ where: whereClause }),

        this.prisma.user.findMany({
          where: whereClause,
          skip,
          take,
          include: {
            roles: {
              include: {
                rol: true,
              },
            },
          },
        }),
      ]);

      let userResponseDtos: UserResponseDto[] = [];

      if (users.length > 0) {
        // Transform the array of user objects to an array of UserResponseDto,
        // mapping UserRol.rol to roles array
        userResponseDtos = users.map((user) => {
          const dto = plainToInstance(UserResponseDto, user, {
            excludeExtraneousValues: true,
          });
          // Map the nested rol relationship to the roles array
          dto.roles = user.roles.map((userRol) => ({
            id: userRol.rol.id,
            name: userRol.rol.name,
          }));
          return dto;
        });
      }

      return {
        data: userResponseDtos,
        meta: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch {
      throw new InternalServerErrorException('Internal server error.');
    }
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

  async findCurrentUser(userId: string): Promise<CurrentUserDto> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          name: true,
          roles: {
            select: {
              rol: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
      });

      if (!user) {
        throw new NotFoundException('Resource not found.');
      }

      return plainToInstance(
        CurrentUserDto,
        {
          id: user.id,
          email: user.email,
          name: user.name,
          roles: user.roles.map((item) => item.rol.name),
        },
        {
          excludeExtraneousValues: true,
        },
      );
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
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
    await this.ensureNotRootUser(input.userId);
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
    await this.ensureNotRootUser(input.userId);
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
            deleteMany: {
              userId: input.userId,
            },
            // create the new relations for the new roles
            create: uniqueRoles.map((roleId) => ({
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

    await this.revokeAllUserTokens(input.userId); // revoke all tokens to apply new roles on next login

    await this.auditService.log({
      action: AuditAction.ROLES_UPDATED,
      userId: input.userId,
      metadata: {
        newRoles: uniqueRoles,
      },
    });
  }

  // Deactivate user account (ADMIN)
  async deactivateUser(input: DeactivateUserInput): Promise<void> {
    await this.ensureNotRootUser(input.userId);
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

  async revokeAllUserTokens(userId: string): Promise<void> {
    try {
      await this.prisma.refreshToken.updateMany({
        where: {
          userId,
          revoked: false,
        },
        data: {
          revoked: true,
        },
      });
    } catch {
      throw new InternalServerErrorException('Internal server error.');
    }
    await this.auditService.log({
      action: AuditAction.REFRESH_TOKEN_REVOKED,
      userId,
      metadata: {
        reason: 'All tokens revoked for user due to password change or reset',
      },
    });
  }
}
