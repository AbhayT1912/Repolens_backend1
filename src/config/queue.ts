import { Queue } from "bullmq";
import IORedis from "ioredis";
import { ENV } from "./env";
import { logger } from "./logger";

export type QueueMode = "redis" | "degraded";

let redisConnection: IORedis | null = null;
let repoQueue: Queue | null = null;
let redisAvailable = false;
let queueMode: QueueMode = "degraded";

export const setQueueMode = (nextMode: QueueMode) => {
  queueMode = nextMode;
};

if (ENV.REDIS_URL) {
  try {
    redisConnection = new IORedis(ENV.REDIS_URL, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
      enableOfflineQueue: false,
      connectTimeout: 10000,
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
    });

    redisAvailable = true;
    queueMode = "redis";
    repoQueue = new Queue("repo-processing", { connection: redisConnection });
    logger.info("Redis queue initialized with REDIS_URL");
  } catch (error) {
    logger.warn("Failed to initialize Redis queue with REDIS_URL", { error });
    redisAvailable = false;
    queueMode = "degraded";
  }
} else {
  try {
    redisConnection = new IORedis({
      host: process.env.REDIS_HOST || "127.0.0.1",
      port: Number(process.env.REDIS_PORT || 6379),
      maxRetriesPerRequest: null,
      connectTimeout: 3000,
      retryStrategy: (times) => {
        if (times === 1) {
          logger.info(
            "Redis not available - job queue disabled. Repositories will process synchronously."
          );
        }
        return null;
      },
    });

    redisConnection.on("error", () => {
      if (!redisAvailable) return;
    });

    redisConnection.on("connect", () => {
      redisAvailable = true;
      queueMode = "redis";
      logger.info("Redis queue connection established");
    });

    redisAvailable = true;
    queueMode = "redis";
    repoQueue = new Queue("repo-processing", { connection: redisConnection });
    logger.info("Redis queue initialized with local Redis");
  } catch (error) {
    logger.info("Redis not available - using synchronous processing", {
      error: (error as Error).message,
    });
    redisAvailable = false;
    queueMode = "degraded";
  }
}

export { redisConnection, repoQueue, redisAvailable, queueMode };
