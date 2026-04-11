import axios from "axios";
import { logger } from "../config/logger";

const RAG_BASE_URL = process.env.RAG_SERVICE_URL || "http://localhost:8000";

export const ingestRepoToRAG = async (
  repoPath: string,
  repoId: string
) => {
  try {
    await axios.post(`${RAG_BASE_URL}/ingest`, {
      repoPath,
      repoId,
    }, { timeout: 15000 });

    logger.info("RAG ingestion triggered", { repo_id: repoId });
  } catch (error: any) {
    logger.warn("RAG ingestion request failed (non-fatal)", {
      repo_id: repoId,
      error: error?.message,
    });
    // Don't rethrow — RAG is auxiliary and must not block the pipeline
  }
};

