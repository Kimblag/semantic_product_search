import { StreamableFile } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as fs from 'fs';
import { JwtPayload } from 'src/auth/interfaces/jwt-payload.interface';
import { RequirementStatus } from 'src/matching/enums/requirement-status.enum';
import { UploadSubdir } from 'src/storage/uploads/enums/upload-subdir.enum';
import { UploadsService } from 'src/storage/uploads/uploads.service';
import { PassThrough, Readable } from 'stream';
import { RequirementsService } from '../application/requirements.service';
import { RequirementsController } from './requirements.controller';

jest.mock('fs');

const requirementsServiceMock = () => ({
  getAllRequirementsAdmin: jest.fn(),
  getRequirementAdmin: jest.fn(),
  getRequirementsByUser: jest.fn(),
  exportRequirementsCsv: jest.fn(),
  getRequirementByUser: jest.fn(),
  processRequirements: jest.fn(),
});

const uploadsServiceMock = () => ({
  saveBuffer: jest.fn(),
});

describe('RequirementsController', () => {
  let controller: RequirementsController;
  let requirementsService: ReturnType<typeof requirementsServiceMock>;
  let uploadsService: ReturnType<typeof uploadsServiceMock>;

  const USER: JwtPayload = {
    sub: 'user-uuid',
  } as JwtPayload;

  const REQUIREMENT_ID = 'requirement-uuid';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RequirementsController],
      providers: [
        { provide: RequirementsService, useValue: requirementsServiceMock() },
        { provide: UploadsService, useValue: uploadsServiceMock() },
      ],
    }).compile();

    controller = module.get<RequirementsController>(RequirementsController);
    requirementsService = module.get(RequirementsService);
    uploadsService = module.get(UploadsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getTemplate', () => {
    it('should return StreamableFile when template exists', () => {
      const fakeStream = Object.assign(new PassThrough(), {
        close: jest.fn(),
        bytesRead: 0,
        path: 'template.csv',
        pending: false,
      }) as unknown as fs.ReadStream;

      (fs.existsSync as jest.Mock).mockReturnValue(true);
      jest.spyOn(fs, 'createReadStream').mockReturnValue(fakeStream);

      const result = controller.getTemplate();

      expect(result).toBeInstanceOf(StreamableFile);
    });
  });

  describe('getRequirementsAdmin', () => {
    it('should call service with query', async () => {
      const query = { page: 1, limit: 10 };
      const response = {
        data: [],
        meta: { total: 0, page: 1, limit: 10, totalPages: 0 },
      };

      requirementsService.getAllRequirementsAdmin.mockResolvedValue(response);

      const result = await controller.getRequirementsAdmin(query);

      expect(requirementsService.getAllRequirementsAdmin).toHaveBeenCalledWith(
        query,
      );
      expect(result).toEqual(response);
    });
  });

  describe('getRequirementByIdAdmin', () => {
    it('should call service with id', async () => {
      const response = { id: REQUIREMENT_ID };

      requirementsService.getRequirementAdmin.mockResolvedValue(response);

      const result = await controller.getRequirementByIdAdmin(REQUIREMENT_ID);

      expect(requirementsService.getRequirementAdmin).toHaveBeenCalledWith(
        REQUIREMENT_ID,
      );
      expect(result).toEqual(response);
    });
  });

  describe('getRequirementsByUser', () => {
    it('should call service with user id and query', async () => {
      const query = { page: 1, limit: 10 };
      const response = {
        data: [],
        meta: { total: 0, page: 1, limit: 10, totalPages: 0 },
      };

      requirementsService.getRequirementsByUser.mockResolvedValue(response);

      const result = await controller.getRequirementsByUser(USER, query);

      expect(requirementsService.getRequirementsByUser).toHaveBeenCalledWith(
        USER.sub,
        query,
      );
      expect(result).toEqual(response);
    });
  });

  describe('exportCsv', () => {
    it('should return StreamableFile from service stream', async () => {
      const stream = new Readable();

      requirementsService.exportRequirementsCsv.mockResolvedValue({ stream });

      const result = await controller.exportCsv(REQUIREMENT_ID);

      expect(requirementsService.exportRequirementsCsv).toHaveBeenCalledWith(
        REQUIREMENT_ID,
      );
      expect(result).toBeInstanceOf(StreamableFile);
    });
  });

  describe('getRequirementByIdUser', () => {
    it('should return requirement matching result', async () => {
      const response = {
        requirementId: REQUIREMENT_ID,
        status: RequirementStatus.PROCESSED,
      };

      requirementsService.getRequirementByUser.mockResolvedValue(response);

      const result = await controller.getRequirementByIdUser(
        USER,
        REQUIREMENT_ID,
      );

      expect(requirementsService.getRequirementByUser).toHaveBeenCalledWith(
        USER.sub,
        REQUIREMENT_ID,
      );
      expect(result).toEqual(response);
    });
  });

  describe('uploadRequiements', () => {
    it('should save file and call processRequirements', () => {
      const file = {
        originalname: 'requirements.csv',
        buffer: Buffer.from('csv'),
      } as Express.Multer.File;

      const savedPath = '/tmp/file.csv';

      uploadsService.saveBuffer.mockReturnValue(savedPath);

      controller.uploadRequiements(file, 'client-uuid', USER);

      expect(uploadsService.saveBuffer).toHaveBeenCalledWith(
        UploadSubdir.REQUIREMENTS,
        file.originalname,
        file.buffer,
        'client-uuid',
      );

      expect(requirementsService.processRequirements).toHaveBeenCalledWith({
        clientId: 'client-uuid',
        filePath: savedPath,
        uploaderUserId: USER.sub,
      });
    });
  });
});
