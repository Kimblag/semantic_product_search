import { Test, TestingModule } from '@nestjs/testing';
import { RolesController } from './roles.controller';
import { RolesService } from '../application/roles.service';
import { RoleDetailDto, RoleListDto } from '../dto/roles-response.dto';

const rolesServiceMock = () => ({
  findRoleById: jest.fn(),
  findAllRoles: jest.fn(),
});

describe('RolesController', () => {
  let controller: RolesController;
  let rolesService: ReturnType<typeof rolesServiceMock>;

  const ROLE_ID = 'role-uuid-1';

  const mockRoles: RoleListDto[] = [
    {
      id: ROLE_ID,
      name: 'ADMIN',
      description: 'Administrator role',
    },
  ];

  const mockRoleDetail: RoleDetailDto = {
    id: ROLE_ID,
    name: 'ADMIN',
    description: 'Administrator role',
    permissions: [
      {
        id: 'perm-1',
        name: 'users.read',
        description: 'Read users',
      },
    ],
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RolesController],
      providers: [
        {
          provide: RolesService,
          useValue: rolesServiceMock(),
        },
      ],
    }).compile();

    controller = module.get<RolesController>(RolesController);
    rolesService = module.get(RolesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('should return all roles', async () => {
      rolesService.findAllRoles.mockResolvedValue(mockRoles);

      const result = await controller.findAll();

      expect(rolesService.findAllRoles).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockRoles);
    });
  });

  describe('findOne', () => {
    it('should return role detail by id', async () => {
      rolesService.findRoleById.mockResolvedValue(mockRoleDetail);

      const result = await controller.findOne(ROLE_ID);

      expect(rolesService.findRoleById).toHaveBeenCalledTimes(1);
      expect(rolesService.findRoleById).toHaveBeenCalledWith(ROLE_ID);
      expect(result).toEqual(mockRoleDetail);
    });
  });
});
