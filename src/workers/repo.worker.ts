import { Worker } from "bullmq";
import { processRepository } from "../services/repo.service";
import { logger } from "../config/logger";
import { getRedisConnection, isRedisConfigured } from "../config/redis";

export const repoWorker = isRedisConfigured()
  ? new Worker(
      "repo-processing",
      async (job) => {
        const { repoUrl, repoId } = job.data;

        logger.info("Worker started processing", {
          repo_id: repoId,
          repo_url: repoUrl,
        });

        await processRepository(repoUrl, repoId);
      },
      { connection: getRedisConnection() }
    )
  : null;

if (!repoWorker) {
  logger.warn(
    "Repository worker disabled: configure REDIS_URL to enable background processing."
  );
} else {
  repoWorker.on("ready", () => {
    logger.info("Worker connected to Redis");
  });

  repoWorker.on("completed", (job) => {
    logger.info("Job completed", {
      jobId: job.id,
    });
  });

  repoWorker.on("failed", (job, err) => {
    logger.error("Job failed", {
      jobId: job?.id,
      error: err.message,
    });
  });
}
