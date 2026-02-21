import { Request, Response } from "express";
import mongoose from "mongoose";
import { RepoModel } from "../models/repo.model";
import { asyncHandler } from "../utils/asyncHandler";
import { AppError } from "../utils/AppError";
import { sanitizeQuestion } from "../utils/question.util";
import { buildContextForRepo } from "../utils/contextBuilder.util";
import { askAIService } from "../services/ai.service";

export const askQuestion = asyncHandler(
  async (req: Request, res: Response) => {
    const { repo_id, question } = req.body;

    if (!repo_id || !mongoose.Types.ObjectId.isValid(repo_id)) {
      throw new AppError("Invalid repository ID", 400);
    }

    const sanitizedQuestion = sanitizeQuestion(question);

    const repo = await RepoModel.findById(repo_id);

    if (!repo) {
      throw new AppError("Repository not found", 404);
    }

    if (repo.status !== "READY") {
      throw new AppError(
        "Repository not ready for queries",
        400
      );
    }

    const context = await buildContextForRepo(repo_id);

    const aiResponse = await askAIService({
      repoId: repo_id,
      question: sanitizedQuestion,
      context,
    });

    return res.status(200).json({
      success: true,
      data: {
        repo_id,
        question: sanitizedQuestion,
        answer: aiResponse.answer || "No response",
        confidence: aiResponse.confidence || null,
      },
    });
  }
);