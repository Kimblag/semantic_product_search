import { Module } from '@nestjs/common';
import { ProvidersService } from './application/providers.service';
import { ProvidersController } from './controllers/providers.controller';

@Module({
  providers: [ProvidersService],
  controllers: [ProvidersController]
})
export class ProvidersModule {}
