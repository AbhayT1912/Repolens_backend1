import axios from "axios";

const RAG_BASE_URL = process.env.RAG_SERVICE_URL || "http://localhost:8000";

export const ingestRepoToRAG = async (
  repoPath: string,
  repoId: string
) => {
  try {
    await axios.post(`${RAG_BASE_URL}/ingest`, {
      repoPath,
      repoId,
    });

    console.log("RAG ingestion triggered for repo:", repoId);
  } catch (error: any) {
    console.error("RAG ingestion failed:", error.message);
    throw error;
  }
};