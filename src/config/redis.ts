import { ENV } from "./env";

export const getRedisConnection = () => {
  const redisUrl = new URL(ENV.REDIS_URL);

  return {
    host: redisUrl.hostname,
    port: redisUrl.port ? Number(redisUrl.port) : 6379,
    maxRetriesPerRequest: null as null,
    ...(redisUrl.username
      ? { username: decodeURIComponent(redisUrl.username) }
      : {}),
    ...(redisUrl.password
      ? { password: decodeURIComponent(redisUrl.password) }
      : {}),
    ...(redisUrl.protocol === "rediss:" ? { tls: {} } : {}),
  };
};
