import { Queue } from "bullmq";
import { getRedisConnection } from "./redis";

export const repoQueue = new Queue("repo-processing", {
  connection: getRedisConnection(),
});
