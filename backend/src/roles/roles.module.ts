import { Module } from '@nestjs/common';
import { RolesController } from './controllers/roles.controller';
import { RolesService } from './application/roles.service';

@Module({
  controllers: [RolesController],
  providers: [RolesService]
})
export class RolesModule {}
