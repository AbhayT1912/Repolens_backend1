import { Router } from "express";
import { analyzeRepository } from "../../controllers/repo.controller";
import { getCallGraph } from "../../controllers/graph.controller";
import { getFileGraph } from "../../controllers/fileGraph.controller";
import { getStructure } from "../../controllers/structure.controller";
import { analyzeRateLimiter } from "../../middleware/rateLimit.middleware";
import { askQuestion } from "../../controllers/ai.controller";
import { downloadExecutivePDF, getRepoReport } from "../../controllers/report.controller";
import { getImpactAnalysis } from "../../controllers/impactAnalysis.controller";
import { getRiskRanking } from "../../controllers/impactAnalysis.controller";
import { getLayerAnalysis } from "../../controllers/layerDetection.controller";

const router = Router();

router.post(
  "/analyze",
  analyzeRateLimiter,
  analyzeRepository
);

router.get("/:repoId/graph", getCallGraph);
router.get("/:repoId/file-graph", getFileGraph);
router.get("/:repoId/structure", getStructure);
router.post("/ask", askQuestion);
router.get("/:repoId/report", getRepoReport);
router.get("/:repoId/impact/:fileId", getImpactAnalysis);
router.get("/:repoId/risk-ranking", getRiskRanking);
router.get("/:repoId/layer-analysis", getLayerAnalysis);
router.get("/:repoId/report/pdf", downloadExecutivePDF);


export default router;