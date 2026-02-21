import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { repoQueue } from "../config/queue";
import { RepoModel } from "../models/repo.model";
import { normalizeRepoUrl, validateGithubRepoUrl } from "../utils/repoUrl.util";
import { AppError } from "../utils/AppError";


export const analyzeRepository = asyncHandler(
  async (req: Request, res: Response) => {
    let { repo_url } = req.body;

    if (!repo_url || typeof repo_url !== "string") {
      throw new AppError("Repository URL is required", 400);
    }

    repo_url = normalizeRepoUrl(repo_url);

    if (!validateGithubRepoUrl(repo_url)) {
      throw new AppError("Invalid GitHub repository URL format", 400);
    }

    // Duplicate protection
    const existingRepo = await RepoModel.findOne({
      repo_url,
      status: { $ne: "FAILED" },
    });

    if (existingRepo) {
      return res.status(200).json({
        success: true,
        repo_id: existingRepo._id,
        status: existingRepo.status,
        message: "Repository already being processed or ready.",
      });
    }

    const repo = await RepoModel.create({
      repo_url,
      status: "RECEIVED",
    });

    await repoQueue.add("process-repo", {
      repoUrl: repo_url,
      repoId: repo._id.toString(),
    });

    return res.status(202).json({
      success: true,
      repo_id: repo._id,
      status: "RECEIVED",
    });
  }
);