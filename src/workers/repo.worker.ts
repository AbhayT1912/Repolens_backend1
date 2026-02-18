import { Worker } from "bullmq";
import IORedis from "ioredis";
import { processRepository } from "../services/repo.service";
import { logger } from "../config/logger";

const connection = new IORedis({
  host: "127.0.0.1",
  port: 6379,
  maxRetriesPerRequest: null, // 🔥 REQUIRED FOR BULLMQ
});

export const repoWorker = new Worker(
  "repo-processing",
  async (job) => {
    const { repoUrl, repoId } = job.data;

    logger.info("Worker started processing", {
      repo_id: repoId,
      repo_url: repoUrl,
    });

    await processRepository(repoUrl, repoId);
  },
  { connection }
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
