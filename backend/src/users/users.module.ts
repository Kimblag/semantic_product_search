import { Module } from '@nestjs/common';
import { UsersService } from './application/users.service';
import { UsersController } from './controllers/users.controller';
import { AuditModule } from 'src/audit/audit.module';

@Module({
  imports: [AuditModule],
  providers: [UsersService],
  exports: [UsersService],
  controllers: [UsersController],
})
export class UsersModule {}
