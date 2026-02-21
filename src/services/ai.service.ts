import axios from "axios";

interface AskPayload {
  repoId: string;
  question: string;
}

export const askAIService = async ({
  repoId,
  question,
}: AskPayload) => {
  try {
    // 🔹 Replace with real AI microservice URL later
    const response = await axios.post(
      process.env.AI_SERVICE_URL || "http://localhost:8000/ask",
      {
        repo_id: repoId,
        question,
      },
      {
        timeout: 30_000,
      }
    );

    return response.data;
  } catch (error: any) {
    throw new Error("AI service unavailable");
  }
};