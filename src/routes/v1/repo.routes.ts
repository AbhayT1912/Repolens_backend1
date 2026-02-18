import { Router } from "express";
import { validate } from "../../middleware/validate.middleware";
import { analyzeRepoSchema } from "../../validators/repo.validator";
import { analyzeRepository } from "../../controllers/repo.controller";
import { getCallGraph } from "../../controllers/graph.controller";
import { analyzeRateLimiter } from "../../middleware/rateLimit.middleware";

const router = Router();

router.post(
  "/analyze",
  analyzeRateLimiter,
  validate({ body: analyzeRepoSchema }),
  analyzeRepository
);

router.get("/:repoId/graph", getCallGraph);

export default router;
