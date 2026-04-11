import { Worker } from "bullmq";
import { processRepository } from "../services/repo.service";
import { logger } from "../config/logger";
import { redisAvailable } from "../config/queue";

let repoWorker: Worker | null = null;

if (redisAvailable) {
  const { repoQueue } = require("../config/queue");

  repoWorker = new Worker(
    "repo-processing",
    async (job) => {
      const { repoUrl, repoId } = job.data;

      logger.info("Worker started processing", {
        repo_id: repoId,
        repo_url: repoUrl,
      });

      await processRepository(repoUrl, repoId);
    },
    { connection: repoQueue?.client }
  );

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
} else {
  logger.info("Redis not configured - async job queue disabled");
}

export { repoWorker };
