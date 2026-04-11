import app from "./app";
import { ENV } from "./config/env";
import { logger } from "./config/logger";
import { connectDB } from "./config/database";
import { queueMode } from "./config/queue";
import "./workers/repo.worker";
import { RepoModel } from "./models/repo.model";
import { processRepository } from "./services/repo.service";

/**
 * On startup, recover repos that got stuck mid-processing due to a previous
 * server crash or restart (e.g., Render free tier sleep/wake cycle).
 * Repos stuck in non-terminal states for more than 2 minutes are re-queued.
 */
const recoverStuckRepos = async () => {
  try {
    const TWO_MINUTES_AGO = new Date(Date.now() - 2 * 60 * 1000);

    const stuckRepos = await RepoModel.find({
      status: { $in: ["RECEIVED", "CLONING", "SCANNING", "PARSING", "GRAPHING"] },
      updated_at: { $lt: TWO_MINUTES_AGO },
    }).lean();

    if (stuckRepos.length === 0) {
      logger.info("No stuck repos found on startup");
      return;
    }

    logger.info(`Found ${stuckRepos.length} stuck repo(s) on startup — re-processing`, {
      repo_ids: stuckRepos.map((r) => r._id.toString()),
    });

    for (const repo of stuckRepos) {
      const repoId = repo._id.toString();
      try {
        // Reset to RECEIVED so UI shows clean state
        await RepoModel.findByIdAndUpdate(repoId, { status: "RECEIVED", error_message: undefined });

        processRepository(repo.repo_url, repoId).catch((err: any) => {
          logger.error("Startup recovery processRepository failed", {
            repo_id: repoId,
            error: err?.message,
          });
        });
      } catch (err: any) {
        logger.error("Failed to recover stuck repo", {
          repo_id: repoId,
          error: err?.message,
        });
      }
    }
  } catch (err: any) {
    logger.warn("Startup repo recovery check failed", { error: err?.message });
  }
};

const startServer = async () => {
  try {
    await connectDB();

    logger.info("Analysis processing mode", {
      queue_mode: queueMode,
      redis_configured: Boolean(ENV.REDIS_URL),
    });

    if (!ENV.REDIS_URL) {
      logger.warn("REDIS_URL is not configured. Production analysis will run in degraded synchronous mode.");
    }

    // Recover repos stuck from previous server instance
    await recoverStuckRepos();

    app.listen(ENV.PORT, () => {
      logger.info(`Server running on port ${ENV.PORT}`);
    });
  } catch (error) {
    logger.error("Failed to start server");
    process.exit(1);
  }
};

startServer();
