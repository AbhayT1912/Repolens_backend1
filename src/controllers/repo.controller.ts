import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { repoQueue } from "../config/queue";
import { RepoModel } from "../models/repo.model";
import { normalizeRepoUrl } from "../utils/repoUrl.util";

export const analyzeRepository = asyncHandler(
  async (req: Request, res: Response) => {
    const { repo_url } = req.body;

    // ✅ Proper normalization
    const normalizedUrl = normalizeRepoUrl(repo_url);

    // 🔍 Check existing repo (ignore FAILED ones)
    const existingRepo = await RepoModel.findOne({
      repo_url: normalizedUrl,
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
      repo_url: normalizedUrl,
      status: "RECEIVED",
    });

    await repoQueue.add("process-repo", {
      repoUrl: normalizedUrl,
      repoId: repo._id.toString(),
    });

    return res.status(202).json({
      success: true,
      repo_id: repo._id,
      status: "RECEIVED",
    });
  }
);
