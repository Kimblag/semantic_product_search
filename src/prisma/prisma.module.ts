import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

// make it global so we don't have to import it in every module
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
