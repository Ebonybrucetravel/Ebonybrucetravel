import { Module, Global } from '@nestjs/common';
import { CacheService } from './cache.service';
import { OttService } from './ott.service';

@Global()
@Module({
  providers: [CacheService, OttService],
  exports: [CacheService, OttService],
})
export class CacheModule { }
