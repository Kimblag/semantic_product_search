import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { RoleDetailDto, RoleListDto } from '../dto/roles-response.dto';

@Injectable()
export class RolesService {
  constructor(private readonly prisma: PrismaService) {}

  // FindAll
  async findAllRoles(): Promise<RoleListDto[]> {
    try {
      const roles = await this.prisma.role.findMany({
        select: {
          id: true,
          name: true,
          description: true,
        },
      });

      return roles;
    } catch {
      throw new InternalServerErrorException('Internal server error.');
    }
  }

  // get by id
  async findRoleById(id: string): Promise<RoleDetailDto> {
    try {
      const role = await this.prisma.role.findUnique({
        where: {
          id,
        },
        select: {
          id: true,
          name: true,
          description: true,
          permissions: {
            select: {
              permission: {
                select: {
                  id: true,
                  name: true,
                  description: true,
                },
              },
            },
          },
        },
      });

      if (!role) return null;

      return {
        ...role,
        permissions: role.permissions.map((p) => p.permission), // <-- aplanamos
      };
    } catch {
      throw new InternalServerErrorException('Internal server error.');
    }
  }
}
