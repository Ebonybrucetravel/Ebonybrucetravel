import { Module, Global } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { CacheService } from './cache.service';
import { OttService } from './ott.service';

@Global()
@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: '60s' },
    }),
  ],
  providers: [CacheService, OttService],
  exports: [CacheService, OttService],
})
export class CacheModule {}