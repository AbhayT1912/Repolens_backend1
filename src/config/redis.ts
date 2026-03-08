import Redis from "ioredis";
import { ENV } from "./env";
import { logger } from "./logger";

const LOCAL_REDIS_HOSTS = new Set(["127.0.0.1", "localhost"]);
const isRenderRuntime = process.env.RENDER === "true";

export const isRedisConfigured = () => {
  try {
    const redisUrl = new URL(ENV.REDIS_URL);

    if (
      LOCAL_REDIS_HOSTS.has(redisUrl.hostname) &&
      (ENV.NODE_ENV === "production" || isRenderRuntime)
    ) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
};

export const getRedisConnection = () => {
  if (!isRedisConfigured()) {
    throw new Error(
      "Redis is not configured for this environment. Set REDIS_URL to a hosted Redis instance."
    );
  }

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

export const logRedisMemoryPolicy = async () => {
  if (!isRedisConfigured()) {
    logger.warn(
      "Redis policy check skipped: Redis is not configured for this environment."
    );
    return;
  }

  const redisClient = new Redis(ENV.REDIS_URL, {
    lazyConnect: true,
    connectTimeout: 5000,
    maxRetriesPerRequest: 1,
    enableOfflineQueue: false,
  });

  try {
    await redisClient.connect();

    const memoryInfo = await redisClient.info("memory");
    const policyLine = memoryInfo
      .split("\n")
      .map((line) => line.trim())
      .find((line) => line.startsWith("maxmemory_policy:"));

    const policy = policyLine?.split(":")[1]?.trim() || "unknown";

    logger.info("Redis memory policy detected", {
      maxmemory_policy: policy,
    });

    if (policy !== "noeviction") {
      logger.warn(
        `Redis eviction policy is '${policy}'. Recommended 'noeviction' for BullMQ workloads.`
      );
    }
  } catch (error: any) {
    logger.warn("Unable to read Redis memory policy", {
      error: error?.message ?? String(error),
    });
  } finally {
    redisClient.disconnect();
  }
};
