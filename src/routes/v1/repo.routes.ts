import { Router } from "express";
import { analyzeRepository } from "../../controllers/repo.controller";
import { getCallGraph } from "../../controllers/graph.controller";
import { getFileGraph } from "../../controllers/fileGraph.controller";
import { getStructure } from "../../controllers/structure.controller";
import { analyzeRateLimiter } from "../../middleware/rateLimit.middleware";
import { askQuestion } from "../../controllers/ai.controller";
import { downloadExecutivePDF, getRepoHistory, getRepoReport } from "../../controllers/report.controller";
import { getImpactAnalysis } from "../../controllers/impactAnalysis.controller";
import { getRiskRanking } from "../../controllers/impactAnalysis.controller";
import { getLayerAnalysis } from "../../controllers/layerDetection.controller";
import { requireAuth } from "../../middleware/auth.middleware";
import { requireRepoOwnership } from "../../middleware/ownership.middleware";
import { deductCredits } from "../../middleware/credit.middleware";
import { CREDIT_COSTS } from "../../config/creditCost.config";
import { getUserRepositories } from "../../controllers/repo.controller";

const router = Router();

router.post(
  "/analyze",
  analyzeRateLimiter,
  analyzeRepository,
  requireAuth,
  requireRepoOwnership,
  deductCredits(CREDIT_COSTS.ANALYZE)
);

router.get("/:repoId/graph", deductCredits(CREDIT_COSTS.GRAPH), requireAuth, requireRepoOwnership, getCallGraph);
router.get("/:repoId/file-graph", deductCredits(CREDIT_COSTS.FILE_GRAPH_ANALYSIS), requireAuth, requireRepoOwnership, getFileGraph);
router.get("/:repoId/structure",deductCredits(CREDIT_COSTS.STRUCTURE), requireAuth, requireRepoOwnership, getStructure);
router.post("/ask", deductCredits(CREDIT_COSTS.ASK_AI), askQuestion);
router.get("/:repoId/report", deductCredits(CREDIT_COSTS.REPO_REPORT), requireAuth, requireRepoOwnership, getRepoReport);
router.get("/:repoId/impact/:fileId", deductCredits(CREDIT_COSTS.IMPACT_ANALYSIS), requireAuth, requireRepoOwnership, getImpactAnalysis);
router.get("/:repoId/risk-ranking", deductCredits(CREDIT_COSTS.RISK_RANKING), requireAuth, requireRepoOwnership, getRiskRanking);
router.get("/:repoId/layer-analysis", deductCredits(CREDIT_COSTS.LAYER_ANALYSIS), requireAuth, requireRepoOwnership, getLayerAnalysis);
router.get("/:repoId/report/pdf", deductCredits(CREDIT_COSTS.PDF_DOWNLOAD), requireAuth, requireRepoOwnership, downloadExecutivePDF);
router.get("/:repoId/history", requireAuth, requireRepoOwnership, getRepoHistory);
router.get("/my-repos", requireAuth, getUserRepositories);


export default router;