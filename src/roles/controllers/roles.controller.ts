import { Controller, Get, HttpCode, HttpStatus, Param } from '@nestjs/common';
import { RolesService } from '../application/roles.service';
import { Roles } from 'src/common/decorators/roles.decorator';
import { Role } from 'src/common/enums/role.enum';
import { ApiBearerAuth } from '@nestjs/swagger';
import { RoleDetailDto, RoleListDto } from '../dto/roles-response.dto';

@ApiBearerAuth()
@Controller('roles')
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  @Get()
  async findAll(): Promise<RoleListDto[]> {
    return await this.rolesService.findAllRoles();
  }

  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  @Get(':id')
  async findOne(@Param('id') roleId: string): Promise<RoleDetailDto> {
    return await this.rolesService.findRoleById(roleId);
  }
}
