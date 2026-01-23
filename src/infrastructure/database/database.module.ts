import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { MarkupRepository } from './repositories/markup.repository';

@Global()
@Module({
  providers: [PrismaService, MarkupRepository],
  exports: [PrismaService, MarkupRepository],
})
export class DatabaseModule {}
