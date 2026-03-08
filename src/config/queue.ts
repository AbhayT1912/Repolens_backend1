import { Queue } from "bullmq";
import { getRedisConnection, isRedisConfigured } from "./redis";
import { logger } from "./logger";

export const repoQueue = isRedisConfigured()
  ? new Queue("repo-processing", {
      connection: getRedisConnection(),
    })
  : null;

if (!repoQueue) {
  logger.warn(
    "Redis queue disabled: configure REDIS_URL to a non-local Redis endpoint for production."
  );
}
