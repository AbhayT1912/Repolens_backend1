import { Request, Response } from "express";
import mongoose from "mongoose";
import { RepoModel } from "../models/repo.model";
import { asyncHandler } from "../utils/asyncHandler";
import { AppError } from "../utils/AppError";
import { sanitizeQuestion } from "../utils/question.util";
import { askAIService } from "../services/ai.service";

export const askQuestion = asyncHandler(
  async (req: Request, res: Response) => {
    const { repo_id, question } = req.body;

    // Validate repo_id
    if (!repo_id || !mongoose.Types.ObjectId.isValid(repo_id)) {
      throw new AppError("Invalid repository ID", 400);
    }

    // Sanitize question
    const sanitizedQuestion = sanitizeQuestion(question);

    // Check repo exists
    const repo = await RepoModel.findById(repo_id);
    if (!repo) {
      throw new AppError("Repository not found", 404);
    }

    // Check repo is ready
    if (repo.status !== "READY") {
      throw new AppError(
        "Repository not ready for queries",
        400
      );
    }

    // 🔥 Forward to external RAG service
    const answer = await askAIService(repo_id, sanitizedQuestion);

    return res.status(200).json({
      success: true,
      data: {
        repo_id,
        question: sanitizedQuestion,
        answer,
      },
    });
  }
);