import axios from "axios";

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
  await postToRAG("/ingest", {
    repoPath,
    repoId,
  });
};

export const askAIService = async (repoId: string, question: string) => {
  const response = await postToRAG("/ask", {
    repoId,
    question,
  });

  return {
    answer: response.data?.answer ?? "",
    usage: response.data?.usage,
  } as AskAIResponse;
};
