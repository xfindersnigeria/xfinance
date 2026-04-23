import { Module } from '@nestjs/common';
import { CacheService } from './cache.service';
import { PubsubService } from './pubsub.service';
import { CacheInvalidationService } from './cache-invalidation.service';
import { RedisModule } from '@nestjs-modules/ioredis';

@Module({
  imports: [
    RedisModule.forRoot({
      type: 'single',
      url: process.env.REDIS_URL || 'redis://localhost:6379',
    }),
  ],
  providers: [CacheService, PubsubService, CacheInvalidationService],
  exports: [CacheService, PubsubService, CacheInvalidationService],
})
export class CacheModule {}
