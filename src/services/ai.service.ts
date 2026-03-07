import axios from "axios";

const RAG_BASE_URL = process.env.RAG_SERVICE_URL || "http://localhost:8000";

export interface AskUsage {
  totalTokens?: number;
  promptTokens?: number;
  completionTokens?: number;
  model?: string;
}

export interface AskAIResponse {
  answer: string;
  usage?: AskUsage;
}

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

  return {
    answer: response.data?.answer ?? "",
    usage: response.data?.usage,
  } as AskAIResponse;
};
