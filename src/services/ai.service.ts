import axios from "axios";

const RAG_BASE_URL = process.env.RAG_SERVICE_URL || "http://localhost:8000";

export const ingestToRAG = async (repoPath: string, repoId: string) => {
  await axios.post(`${RAG_BASE_URL}/ingest`, {
    repoPath,
    repoId,
  });
};

export const askAIService = async (repoId: string, question: string) => {
  const response = await axios.post(`${RAG_BASE_URL}/ask`, {
    repoId,
    question,
  });

  return response.data.answer;
};