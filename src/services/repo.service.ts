import { RepoModel } from "../models/repo.model";
import { cloneRepository } from "./git.service";
import { enforceRepoSizeLimit } from "../utils/repoSize.util";
import { cleanupRepo } from "../utils/repoCleanup";
import { getRepoPath } from "../utils/repoPath.util";
import { scanRepository } from "./scanner.service";
import { parseRepository } from "./parser.service";
import { logger } from "../config/logger";
import { ingestRepoToRAG } from "./rag.service";
import { generateRepoReport } from "./report.service";


export const processRepository = async (repoUrl: string, repoId: string) => {
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

    await generateRepoReport(repoId);

    // ✅ READY
    await RepoModel.findByIdAndUpdate(repoId, {
      status: "READY",
      completed_at: new Date(),
    });

    // Trigger RAG ingestion after repo is ready.
    // RAG is auxiliary and should not fail the core analysis pipeline.
    try {
      await ingestRepoToRAG(repoPath, repoId);
    } catch (error: any) {
      logger.warn("RAG ingestion failed after repo became ready", {
        repo_id: repoId,
        error: error?.message,
      });
    }

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
