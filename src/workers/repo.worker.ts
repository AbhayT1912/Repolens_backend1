import { Worker } from "bullmq";
import { processRepository } from "../services/repo.service";
import { logger } from "../config/logger";
import {
  redisAvailable,
  redisConnection,
  setQueueMode,
} from "../config/queue";

type WorkerStatus = "disabled" | "initializing" | "ready" | "failed";

let repoWorker: Worker | null = null;
let workerStatus: WorkerStatus = "disabled";

export const isWorkerReady = () => workerStatus === "ready";
export const getWorkerStatus = () => workerStatus;

if (redisAvailable && redisConnection) {
  workerStatus = "initializing";
  logger.info("Repo worker initialization started");

  try {
    repoWorker = new Worker(
      "repo-processing",
      async (job) => {
        const { repoUrl, repoId } = job.data;

        logger.info("Worker started processing", {
          repo_id: repoId,
          repo_url: repoUrl,
          job_id: job.id,
        });

        await processRepository(repoUrl, repoId);
      },
      { connection: redisConnection }
    );

    repoWorker.on("ready", () => {
      workerStatus = "ready";
      setQueueMode("redis");
      logger.info("BullMQ worker connected to Redis");
    });

    repoWorker.on("completed", (job) => {
      logger.info("Async job completed", {
        job_id: job.id,
      });
    });

    repoWorker.on("failed", (job, err) => {
      logger.error("Async job failed", {
        job_id: job?.id,
        error: err.message,
      });
    });

    repoWorker.on("error", (err) => {
      workerStatus = "failed";
      setQueueMode("degraded");
      logger.error("Repo worker runtime error", {
        error: err.message,
      });
    });
  } catch (error: any) {
    workerStatus = "failed";
    setQueueMode("degraded");
    logger.error("Repo worker failed to initialize", {
      error: error?.message,
    });
    repoWorker = null;
  }
} else {
  workerStatus = "disabled";
  logger.info(
    "Redis not configured or unavailable - async job queue disabled. Repositories will process synchronously."
  );
}

export { repoWorker };
