import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaService } from './prisma.service';
import { MarkupRepository } from './repositories/markup.repository';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [PrismaService, MarkupRepository],
  exports: [PrismaService, MarkupRepository],
})
export class DatabaseModule {}
