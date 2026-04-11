import { spawn } from "child_process";
import fs from "fs-extra";
import { AppError } from "../utils/AppError";
import { logger } from "../config/logger";
import { ENV } from "../config/env";

const CLONE_TIMEOUT_MS = ENV.CLONE_TIMEOUT;

export const cloneRepository = (
  repoUrl: string,
  repoPath: string,
  repoId: string
): Promise<void> => {
  return new Promise((resolve, reject) => {
    logger.info("Clone started", { repo_id: repoId });

    const gitProcess = spawn("git", ["clone", "--depth", "1", repoUrl, repoPath]);

    let timeoutHandle: NodeJS.Timeout;
    let isSettled = false;

    const finalize = async (error?: Error) => {
      if (isSettled) return;
      isSettled = true;

      clearTimeout(timeoutHandle);

      try {
        gitProcess.kill("SIGKILL");
      } catch {}

      if (error) {
        await fs.remove(repoPath);

        logger.error("Clone failed", {
          repo_id: repoId,
          error: error.message,
        });

        return reject(
          new AppError(error.message || "Repository clone failed", 500)
        );
      }

      logger.info("Clone completed", { repo_id: repoId });
      resolve();
    };

    timeoutHandle = setTimeout(() => {
      finalize(new Error(`Git clone timeout exceeded (${CLONE_TIMEOUT_MS}ms)`));
    }, CLONE_TIMEOUT_MS);

    gitProcess.on("close", (code) => {
      if (code === 0) {
        finalize();
      } else {
        finalize(new Error(`Git clone failed with exit code ${code}`));
      }
    });

    gitProcess.on("error", (err) => {
      finalize(err);
    });
  });
};
