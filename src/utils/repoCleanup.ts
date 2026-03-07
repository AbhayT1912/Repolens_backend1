import fs from "fs-extra";
import { logger } from "../config/logger";

export const cleanupRepo = async (repoPath: string, repoId: string) => {
  await fs.remove(repoPath);
  logger.info("Cleanup completed", { repo_id: repoId });
};
