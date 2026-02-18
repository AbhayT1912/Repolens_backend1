import { RepoModel } from "../models/repo.model";
import { cloneRepository } from "./git.service";
import { enforceRepoSizeLimit } from "../utils/repoSize.util";
import { cleanupRepo } from "../utils/repoCleanup";
import { getRepoPath } from "../utils/repoPath.util";
import { scanRepository } from "./scanner.service";
import { parseRepository } from "./parser.service";
import { logger } from "../config/logger";

export const processRepository = async (
  repoUrl: string,
  repoId: string
) => {
  const repoPath = getRepoPath(repoId);

  try {
    // 🚀 CLONING
    await RepoModel.findByIdAndUpdate(repoId, {
      status: "CLONING",
      started_at: new Date(),
    });

    await cloneRepository(repoUrl, repoPath, repoId);

    // 📂 SCANNING
    await RepoModel.findByIdAndUpdate(repoId, {
      status: "SCANNING",
    });

    enforceRepoSizeLimit(repoPath);

    const totalFiles = await scanRepository(repoPath, repoId);

    await RepoModel.findByIdAndUpdate(repoId, {
      file_count: totalFiles,
    });

    // 🧠 PARSING
    await RepoModel.findByIdAndUpdate(repoId, {
      status: "PARSING",
    });

    const totalFunctions = await parseRepository(repoId);

    await RepoModel.findByIdAndUpdate(repoId, {
      function_count: totalFunctions,
    });

    // 🔗 GRAPHING
    await RepoModel.findByIdAndUpdate(repoId, {
      status: "GRAPHING",
    });

    const { buildCallGraph } = await import("./graph.service");
    await buildCallGraph(repoId);

    // ✅ READY
    await RepoModel.findByIdAndUpdate(repoId, {
      status: "READY",
      completed_at: new Date(),
    });

    logger.info("Repository ready", { repo_id: repoId });

  } catch (error: any) {
    await RepoModel.findByIdAndUpdate(repoId, {
      status: "FAILED",
      error_message: error.message,
      completed_at: new Date(),
    });

    await cleanupRepo(repoPath, repoId);

    throw error;
  }
};
