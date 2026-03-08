import axios from "axios";
import { logger } from "../config/logger";

const RAG_BASE_URL = (process.env.RAG_SERVICE_URL || "http://localhost:8000").replace(/\/+$/, "");

const buildRagCandidates = (endpoint: string): string[] => {
  const cleanEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  if (/\/api\/v1$/i.test(RAG_BASE_URL)) {
    return [`${RAG_BASE_URL}${cleanEndpoint}`];
  }
  return [`${RAG_BASE_URL}/api/v1${cleanEndpoint}`, `${RAG_BASE_URL}${cleanEndpoint}`];
};

const postToRAG = async (endpoint: string, payload: unknown) => {
  const candidates = buildRagCandidates(endpoint);
  let lastError: unknown;

  for (const url of candidates) {
    try {
      return await axios.post(url, payload);
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError;
};

export const ingestRepoToRAG = async (
  repoPath: string,
  repoId: string
) => {
  try {
    await postToRAG("/ingest", {
      repoPath,
      repoId,
    });

    logger.info("RAG ingestion triggered", { repo_id: repoId });
  } catch (error: any) {
    logger.warn("RAG ingestion request failed", {
      repo_id: repoId,
      error: error?.message,
    });
    throw error;
  }
};
