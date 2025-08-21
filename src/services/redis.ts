import { Redis } from '@upstash/redis';

let redis: Redis;

declare global {
  var __redis: Redis | undefined;
}

if (process.env.NODE_ENV === 'production') {
  redis = Redis.fromEnv();
} else {
  if (!global.__redis) {
    global.__redis = Redis.fromEnv();
  }
  redis = global.__redis;
}

export default redis;
