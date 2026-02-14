import { Module } from '@nestjs/common';
import { UsersService } from './application/users.service';
import { UsersController } from './controllers/users.controller';

@Module({
  providers: [UsersService],
  exports: [UsersService],
  controllers: [UsersController],
})
export class UsersModule {}
