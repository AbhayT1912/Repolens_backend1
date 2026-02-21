import { Router } from "express";
import { analyzeRepository } from "../../controllers/repo.controller";
import { getCallGraph } from "../../controllers/graph.controller";
import { getFileGraph } from "../../controllers/fileGraph.controller";
import { getStructure } from "../../controllers/structure.controller";
import { analyzeRateLimiter } from "../../middleware/rateLimit.middleware";
import { askQuestion } from "../../controllers/ai.controller";
import { getRepoReport } from "../../controllers/report.controller";

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

export default router;