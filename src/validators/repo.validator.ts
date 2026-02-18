import { body } from "express-validator";

export const analyzeRepoValidator = [
  body("repo_url")
    .trim()
    .notEmpty()
    .withMessage("Repository URL is required")
    .isURL()
    .withMessage("Invalid URL format")
    .custom((value) => {
      const githubRegex =
        /^https:\/\/github\.com\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;

      if (!githubRegex.test(value.replace(/\.git$/, ""))) {
        throw new Error("Only valid public GitHub repositories allowed");
      }

      return true;
    }),
];
