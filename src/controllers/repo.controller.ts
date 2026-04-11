import { Request, Response } from "express";
import mongoose from "mongoose";
import { asyncHandler } from "../utils/asyncHandler";
import { repoQueue, redisAvailable } from "../config/queue";
import { RepoModel } from "../models/repo.model";
import { normalizeRepoUrl, validateGithubRepoUrl } from "../utils/repoUrl.util";
import { AppError } from "../utils/AppError";
import { UsageModel } from "../models/usage.model";
import { RepoReportModel } from "../models/repoReport.model";
import { UserModel } from "../models/user.model";
import { deductUserCredits } from "../middleware/credit.middleware";
import { CREDIT_COSTS } from "../config/creditCost.config";
import { CREDITS_LIMIT } from "../config/creditPolicy.config";
import { logger } from "../config/logger";
import { setNoStoreHeaders } from "../utils/cacheControl.util";

export const analyzeRepository = asyncHandler(
  async (req: Request, res: Response) => {
    let { repo_url } = req.body;
    const userId = (req as any).auth.userId;

    if (!repo_url || typeof repo_url !== "string") {
      throw new AppError("Repository URL is required", 400);
    }

    repo_url = normalizeRepoUrl(repo_url);

    if (!validateGithubRepoUrl(repo_url)) {
      throw new AppError("Invalid GitHub repository URL format", 400);
    }

    // Duplicate protection
    const STUCK_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes
    const existingOwnedRepo = await RepoModel.findOne({
      repo_url,
      owner_id: userId,
      status: { $ne: "FAILED" },
    });

    if (existingOwnedRepo) {
      const isReady = existingOwnedRepo.status === "READY";
      const updatedAt = (existingOwnedRepo as any).updated_at as Date | undefined;
      const isStuck =
        !isReady &&
        updatedAt &&
        Date.now() - new Date(updatedAt).getTime() > STUCK_TIMEOUT_MS;

      if (isReady) {
        // Already done — just return the existing repo
        return res.status(200).json({
          success: true,
          repo_id: existingOwnedRepo._id,
          status: existingOwnedRepo.status,
          message: "Repository already processed.",
        });
      }

      if (isStuck) {
        // Reset and reprocess — previously stuck due to server restart or error
        logger.info("Re-processing previously stuck repo", {
          repo_id: existingOwnedRepo._id.toString(),
          stuck_status: existingOwnedRepo.status,
          stuck_since: updatedAt,
        });

        await RepoModel.findByIdAndUpdate(existingOwnedRepo._id, {
          status: "RECEIVED",
          error_message: undefined,
          started_at: undefined,
          completed_at: undefined,
        });

        const repoIdStr = existingOwnedRepo._id.toString();

        if (redisAvailable && repoQueue) {
          await repoQueue.add("process-repo", {
            repoUrl: repo_url,
            repoId: repoIdStr,
          });
        } else {
          const { processRepository } = await import("../services/repo.service");
          processRepository(repo_url, repoIdStr).catch((err: any) => {
            logger.error("Re-process of stuck repo failed", {
              repo_id: repoIdStr,
              error: err?.message,
            });
          });
        }

        return res.status(202).json({
          success: true,
          repo_id: existingOwnedRepo._id,
          status: "RECEIVED",
          message: "Repository was stuck — re-processing started.",
        });
      }

      // Still actively processing (recently updated) — just return current status
      return res.status(200).json({
        success: true,
        repo_id: existingOwnedRepo._id,
        status: existingOwnedRepo.status,
        message: "Repository is currently being processed.",
      });
    }

    const creditDeduction = await deductUserCredits(userId, CREDIT_COSTS.ANALYZE);

    if (!creditDeduction.ok) {
      return res.status(creditDeduction.status).json({
        message: creditDeduction.message,
      });
    }

    let repo;
    try {
      repo = await RepoModel.create({
        owner_id: userId,
        repo_url,
        status: "RECEIVED",
      });
    } catch (error: any) {
      if (error?.code === 11000) {
        const conflictingRepo = await RepoModel.findOne({ repo_url, owner_id: userId })
          .select("_id owner_id status")
          .lean();
        if (conflictingRepo) {
          return res.status(200).json({
            success: true,
            repo_id: conflictingRepo._id,
            status: conflictingRepo.status,
            message: "Repository already being processed or ready.",
          });
        }
      }
      throw error;
    }

    await UsageModel.updateOne(
      { user_id: userId },
      { $inc: { analyses_count: 1 } },
      { upsert: true }
    );

    // Queue job if Redis available, otherwise process directly (fire-and-forget)
    if (redisAvailable && repoQueue) {
      await repoQueue.add("process-repo", {
        repoUrl: repo_url,
        repoId: repo._id.toString(),
      });
    } else {
      // Fallback: process synchronously in background (no Redis/worker available)
      const { processRepository } = await import("../services/repo.service");
      processRepository(repo_url, repo._id.toString()).catch((err: any) => {
        const { logger } = require("../config/logger");
        logger.error("Background processRepository failed", {
          repo_id: repo._id.toString(),
          error: err?.message,
        });
      });
    }

    return res.status(202).json({
      success: true,
      repo_id: repo._id,
      status: "RECEIVED",
    });
  }
);

export const getRepositoryStatus = asyncHandler(
  async (req: any, res: Response) => {
    const { repoId } = req.params;
    const userId = req.auth.userId;

    if (!mongoose.Types.ObjectId.isValid(repoId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid repository ID",
      });
    }

    const repo = await RepoModel.findOne({
      _id: repoId,
      owner_id: userId,
    })
      .select("status error_message started_at completed_at updated_at repo_url")
      .lean();

    if (!repo) {
      return res.status(404).json({
        success: false,
        message: "Repository not found",
      });
    }

    setNoStoreHeaders(res);

    return res.status(200).json({
      success: true,
      data: {
        repo_id: repoId,
        repo_url: repo.repo_url,
        status: repo.status,
        error_message: repo.error_message ?? null,
        started_at: repo.started_at ?? null,
        completed_at: repo.completed_at ?? null,
        updated_at: repo.updated_at ?? null,
      },
    });
  }
);

/* =====================================================
   GET USER REPOSITORIES (Dashboard Listing)
===================================================== */

export const getUserRepositories = asyncHandler(
  async (req: any, res: Response) => {
    const userId = req.auth.userId;

    const repos = await RepoModel.find({
      owner_id: userId,
    })
      .sort({ created_at: -1 })
      .lean();

    const repoIds = repos.map((r) => r._id);

    // Get latest report for each repo
    const latestReports = await RepoReportModel.aggregate([
      { $match: { repo_id: { $in: repoIds } } },
      { $sort: { version: -1 } },
      {
        $group: {
          _id: "$repo_id",
          architecture_health_score: { $first: "$architecture_health_score" },
          version: { $first: "$version" },
          created_at: { $first: "$created_at" },
        },
      },
    ]);

    const reportMap = new Map();
    latestReports.forEach((r) => {
      reportMap.set(r._id.toString(), r);
    });

    const response = repos.map((repo) => {
      const latest = reportMap.get(repo._id.toString());

      return {
        repo_id: repo._id,
        repo_url: repo.repo_url,
        repo_name: repo.name,
        analyzed_at: latest?.created_at ?? null,
        latest_version: latest?.version ?? null,
        architecture_score:
          latest?.architecture_health_score ?? null,
      };
    });

    res.status(200).json({
      success: true,
      data: response,
    });
  }
);

export const getDashboardSummary = asyncHandler(
  async (req: any, res: Response) => {
    const userId = req.auth.userId;

    const [usage, user, repoCount, savedAnalyses] = await Promise.all([
      UsageModel.findOne({ user_id: userId }).lean(),
      UserModel.findOne({ clerk_user_id: userId }).lean(),
      RepoModel.countDocuments({ owner_id: userId }),
      RepoReportModel.aggregate([
        {
          $lookup: {
            from: "repositories",
            localField: "repo_id",
            foreignField: "_id",
            as: "repo",
          },
        },
        { $unwind: "$repo" },
        { $match: { "repo.owner_id": userId } },
        { $count: "count" },
      ]),
    ]);

    const creditsLeft = user?.credits ?? 0;
    const aiUsageMetricVersion = Number(usage?.ai_usage_metric_version ?? 1);
    const aiTokensUsed = aiUsageMetricVersion >= 2 ? usage?.ai_tokens_used ?? 0 : 0;
    const totalUsedCredits = Math.max(0, CREDITS_LIMIT - creditsLeft);
    const totalSavedAnalyses = savedAnalyses[0]?.count ?? 0;

    return res.status(200).json({
      success: true,
      data: {
        repos_analyzed: repoCount,
        analyses_saved: totalSavedAnalyses,
        ai_tokens_used: aiTokensUsed,
        ai_model_tokens_used: usage?.ai_model_tokens_used ?? 0,
        ai_queries_count: usage?.ai_queries_count ?? 0,
        credits_left: creditsLeft,
        credits_used: totalUsedCredits,
        credits_limit: CREDITS_LIMIT,
      },
    });
  }
);
